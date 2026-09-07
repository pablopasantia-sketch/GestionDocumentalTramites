const { pool, transaction } = require('../config/db');
const Correlativo = require('./Correlativo');
const Movimiento = require('./Movimiento');

class Tramite {
  /**
   * Crear un nuevo trámite/correspondencia (Flujo Unificado)
   * Genera el correlativo atómicamente e inserta el movimiento inicial de forma transaccional
   */
  static async create({
    tipo_proceso_id,
    remitente,
    referencia,
    tipo_corres = 'INTERNO',
    nro_hojas = 1,
    nro_anexos = 0,
    instruccion = null,
    prioridad = 'NORMAL',
    primer_destinatario_id = null,
    otros_destinatarios_json = null,
    fecha_limite_respuesta = null,
    creado_por,
    ubicacion_org_id,
    usuario_actual_id = null,
    ubicacion_actual_id = null,
    estado = 'EN_ATENCION',
    proveido_inicial = null,
    gestion = new Date().getFullYear()
  }) {
    return await transaction(async (connection) => {
      // 1. Generar correlativo atómico secuencial
      const correlativoInfo = await Correlativo.generarCodigo({
        tipo_proceso_id,
        ubicacion_org_id,
        gestion,
        connection
      });

      const actualUsr = usuario_actual_id || creado_por;
      const actualUbi = ubicacion_actual_id || ubicacion_org_id;

      // 2. Insertar trámite
      const [result] = await connection.query(`
        INSERT INTO tramites (
          numero_correlativo, gestion, tipo_proceso_id, estado,
          remitente, referencia, tipo_corres, nro_hojas, nro_anexos, instruccion,
          prioridad, primer_destinatario_id, otros_destinatarios_json,
          fecha_limite_respuesta, creado_por, ubicacion_org_id,
          usuario_actual_id, ubicacion_actual_id, activo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        correlativoInfo.numeroCorrelativo,
        gestion,
        tipo_proceso_id,
        estado,
        remitente,
        referencia,
        tipo_corres,
        nro_hojas,
        nro_anexos,
        instruccion,
        prioridad,
        primer_destinatario_id,
        otros_destinatarios_json ? JSON.stringify(otros_destinatarios_json) : null,
        fecha_limite_respuesta,
        creado_por,
        ubicacion_org_id,
        actualUsr,
        actualUbi
      ]);

      const tramiteId = result.insertId;

      // 3. Registrar movimiento inicial obligatorio (Auditoría e Inmutabilidad)
      await Movimiento.create({
        tramite_id: tramiteId,
        tipo_movimiento: 'INICIO',
        actividad_nombre: 'Creación y registro de trámite/correspondencia',
        usuario_origen_id: creado_por,
        ubicacion_origen_id: ubicacion_org_id,
        usuario_destino_id: primer_destinatario_id,
        ubicacion_destino_id: actualUbi,
        estado_movimiento: estado,
        proveido: proveido_inicial || instruccion || 'Registro inicial de proceso en sistema',
        instruccion: instruccion
      }, connection);

      return this.findById(tramiteId, connection);
    });
  }

  /**
   * Buscar trámite por ID con todas sus relaciones cargadas
   */
  static async findById(id, connection = null) {
    const executor = connection || pool;
    const [rows] = await executor.query(`
      SELECT 
        t.*,
        tp.codigo as tipo_proceso_codigo,
        tp.nombre as tipo_proceso_nombre,
        tp.tipo_categoria,
        tp.tiempo_estimado_horas,
        uo_crea.codigo as origen_codigo,
        uo_crea.nombre as origen_nombre,
        uo_crea.sigla as origen_sigla,
        u_crea.login as creado_por_login,
        p_crea.nombres as creado_por_nombres,
        p_crea.apellido_paterno as creado_por_ap_paterno,
        u_act.login as usuario_actual_login,
        p_act.nombres as actual_nombres,
        p_act.apellido_paterno as actual_ap_paterno,
        uo_act.codigo as ubicacion_actual_codigo,
        uo_act.nombre as ubicacion_actual_nombre,
        uo_act.sigla as ubicacion_actual_sigla,
        u_dest.login as primer_destinatario_login,
        p_dest.nombres as primer_destinatario_nombres,
        p_dest.apellido_paterno as primer_destinatario_ap_paterno
      FROM tramites t
      INNER JOIN tipos_proceso tp ON t.tipo_proceso_id = tp.id
      INNER JOIN ubicaciones_org uo_crea ON t.ubicacion_org_id = uo_crea.id
      INNER JOIN usuarios u_crea ON t.creado_por = u_crea.id
      INNER JOIN personas p_crea ON u_crea.persona_id = p_crea.id
      LEFT JOIN usuarios u_act ON t.usuario_actual_id = u_act.id
      LEFT JOIN personas p_act ON u_act.persona_id = p_act.id
      LEFT JOIN ubicaciones_org uo_act ON t.ubicacion_actual_id = uo_act.id
      LEFT JOIN usuarios u_dest ON t.primer_destinatario_id = u_dest.id
      LEFT JOIN personas p_dest ON u_dest.persona_id = p_dest.id
      WHERE t.id = ?
    `, [id]);

    if (!rows[0]) return null;

    const row = rows[0];
    if (typeof row.otros_destinatarios_json === 'string') {
      try {
        row.otros_destinatarios_json = JSON.parse(row.otros_destinatarios_json);
      } catch {
        // mantener string si no es json valido
      }
    }

    return row;
  }

  /**
   * Buscar por número correlativo y gestión (ej: 'SV-1/2026', 2026)
   */
  static async findByCorrelativo(numero_correlativo, gestion = null) {
    let sql = `
      SELECT t.id 
      FROM tramites t 
      WHERE t.numero_correlativo = ?
    `;
    const params = [numero_correlativo];

    if (gestion !== null) {
      sql += ' AND t.gestion = ?';
      params.push(gestion);
    }

    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) return null;
    return this.findById(rows[0].id);
  }

  /**
   * Listar trámites con filtros avanzados para bandejas y reportes
   */
  static async findAll({
    estado = null,
    gestion = null,
    usuario_actual_id = null,
    ubicacion_actual_id = null,
    tipo_proceso_id = null,
    tipo_corres = null,
    search = '',
    activo = true,
    limit = 50,
    offset = 0
  } = {}) {
    let sql = `
      SELECT 
        t.id, t.numero_correlativo, t.gestion, t.tipo_proceso_id, t.estado,
        t.remitente, t.referencia, t.tipo_corres, t.nro_hojas, t.prioridad,
        t.fecha_creacion, t.fecha_limite_respuesta, t.usuario_actual_id, t.ubicacion_actual_id,
        tp.codigo as tipo_proceso_codigo, tp.nombre as tipo_proceso_nombre,
        uo_act.nombre as ubicacion_actual_nombre, uo_act.sigla as ubicacion_actual_sigla,
        u_act.login as usuario_actual_login
      FROM tramites t
      INNER JOIN tipos_proceso tp ON t.tipo_proceso_id = tp.id
      LEFT JOIN ubicaciones_org uo_act ON t.ubicacion_actual_id = uo_act.id
      LEFT JOIN usuarios u_act ON t.usuario_actual_id = u_act.id
      WHERE 1=1
    `;
    const params = [];

    if (activo !== null) {
      sql += ' AND t.activo = ?';
      params.push(activo ? 1 : 0);
    }
    if (estado) {
      sql += ' AND t.estado = ?';
      params.push(estado);
    }
    if (gestion) {
      sql += ' AND t.gestion = ?';
      params.push(gestion);
    }
    if (usuario_actual_id) {
      sql += ' AND t.usuario_actual_id = ?';
      params.push(usuario_actual_id);
    }
    if (ubicacion_actual_id) {
      sql += ' AND t.ubicacion_actual_id = ?';
      params.push(ubicacion_actual_id);
    }
    if (tipo_proceso_id) {
      sql += ' AND t.tipo_proceso_id = ?';
      params.push(tipo_proceso_id);
    }
    if (tipo_corres) {
      sql += ' AND t.tipo_corres = ?';
      params.push(tipo_corres);
    }
    if (search) {
      sql += ' AND (t.numero_correlativo LIKE ? OR t.remitente LIKE ? OR t.referencia LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY t.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Derivación Libre (Avanzar) hacia usuario y/o ubicación destino
   */
  static async derivar(id, {
    usuario_origen_id,
    ubicacion_origen_id,
    usuario_destino_id,
    ubicacion_destino_id,
    proveido,
    instruccion = null,
    tiempo_estimado_minutos = 1440
  }) {
    return await transaction(async (connection) => {
      // Actualizar trámite a estado EN_TRANSITO o POR_RECIBIR
      await connection.query(`
        UPDATE tramites 
        SET 
          estado = 'EN_TRANSITO',
          usuario_actual_id = ?,
          ubicacion_actual_id = ?
        WHERE id = ?
      `, [usuario_destino_id, ubicacion_destino_id, id]);

      // Registrar movimiento inmutable
      await Movimiento.create({
        tramite_id: id,
        tipo_movimiento: 'DERIVACION',
        actividad_nombre: 'Derivación de proceso',
        usuario_origen_id,
        ubicacion_origen_id,
        usuario_destino_id,
        ubicacion_destino_id,
        estado_movimiento: 'EN_TRANSITO',
        proveido,
        instruccion,
        tiempo_estimado_minutos,
        fecha_envio: new Date()
      }, connection);

      return this.findById(id, connection);
    });
  }

  /**
   * Recepción de trámite derivado
   */
  static async recepcionar(id, {
    usuario_id,
    ubicacion_id,
    proveido = 'Trámite recepcionado para atención'
  }) {
    return await transaction(async (connection) => {
      await connection.query(`
        UPDATE tramites 
        SET 
          estado = 'RECIBIDO',
          usuario_actual_id = ?,
          ubicacion_actual_id = ?
        WHERE id = ?
      `, [usuario_id, ubicacion_id, id]);

      await Movimiento.create({
        tramite_id: id,
        tipo_movimiento: 'RECEPCION',
        actividad_nombre: 'Recepción oficial de trámite',
        usuario_origen_id: usuario_id,
        ubicacion_origen_id: ubicacion_id,
        usuario_destino_id: usuario_id,
        ubicacion_destino_id: ubicacion_id,
        estado_movimiento: 'RECIBIDO',
        proveido,
        fecha_recepcion: new Date()
      }, connection);

      return this.findById(id, connection);
    });
  }

  /**
   * Retroceder trámite al remitente/oficina anterior con justificación obligatoria
   */
  static async retroceder(id, {
    usuario_origen_id,
    ubicacion_origen_id,
    usuario_destino_id,
    ubicacion_destino_id,
    justificacion_retroceso
  }) {
    if (!justificacion_retroceso || justificacion_retroceso.trim().length === 0) {
      throw new Error('La justificación es obligatoria para realizar un retroceso de trámite.');
    }

    return await transaction(async (connection) => {
      await connection.query(`
        UPDATE tramites 
        SET 
          estado = 'POR_RECIBIR',
          usuario_actual_id = ?,
          ubicacion_actual_id = ?
        WHERE id = ?
      `, [usuario_destino_id, ubicacion_destino_id, id]);

      await Movimiento.create({
        tramite_id: id,
        tipo_movimiento: 'RETROCESO',
        actividad_nombre: 'Retroceso justificado de trámite',
        usuario_origen_id,
        ubicacion_origen_id,
        usuario_destino_id,
        ubicacion_destino_id,
        estado_movimiento: 'POR_RECIBIR',
        justificacion_retroceso,
        proveido: `Retroceso justificado: ${justificacion_retroceso}`,
        fecha_envio: new Date()
      }, connection);

      return this.findById(id, connection);
    });
  }

  /**
   * Bloquear trámite (Ventanilla Única / Admin)
   */
  static async bloquear(id, { usuario_id, ubicacion_id, motivo }) {
    if (!motivo) throw new Error('Se requiere especificar el motivo del bloqueo.');

    return await transaction(async (connection) => {
      await connection.query(`
        UPDATE tramites 
        SET estado = 'BLOQUEADO', motivo_bloqueo = ? 
        WHERE id = ?
      `, [motivo, id]);

      await Movimiento.create({
        tramite_id: id,
        tipo_movimiento: 'BLOQUEO',
        actividad_nombre: 'Bloqueo administrativo de proceso',
        usuario_origen_id: usuario_id,
        ubicacion_origen_id: ubicacion_id,
        estado_movimiento: 'BLOQUEADO',
        proveido: `Bloqueado por: ${motivo}`
      }, connection);

      return this.findById(id, connection);
    });
  }

  /**
   * Desbloquear trámite
   */
  static async desbloquear(id, { usuario_id, ubicacion_id }) {
    return await transaction(async (connection) => {
      await connection.query(`
        UPDATE tramites 
        SET estado = 'EN_ATENCION', motivo_bloqueo = NULL 
        WHERE id = ?
      `, [id]);

      await Movimiento.create({
        tramite_id: id,
        tipo_movimiento: 'DESBLOQUEO',
        actividad_nombre: 'Desbloqueo administrativo de proceso',
        usuario_origen_id: usuario_id,
        ubicacion_origen_id: ubicacion_id,
        estado_movimiento: 'EN_ATENCION',
        proveido: 'Desbloqueado para reanudar atención'
      }, connection);

      return this.findById(id, connection);
    });
  }

  /**
   * Concluir trámite (Finalización exitosa del flujo)
   */
  static async concluir(id, { usuario_id, ubicacion_id, proveido_final = 'Trámite concluido satisfactoriamente' }) {
    return await transaction(async (connection) => {
      const fechaConclusion = new Date();

      await connection.query(`
        UPDATE tramites 
        SET estado = 'CONCLUIDO', fecha_conclusion = ? 
        WHERE id = ?
      `, [fechaConclusion, id]);

      await Movimiento.create({
        tramite_id: id,
        tipo_movimiento: 'CONCLUSION',
        actividad_nombre: 'Conclusión de trámite',
        usuario_origen_id: usuario_id,
        ubicacion_origen_id: ubicacion_id,
        estado_movimiento: 'CONCLUIDO',
        proveido: proveido_final
      }, connection);

      return this.findById(id, connection);
    });
  }

  /**
   * Anular trámite (Admin Wayka)
   */
  static async anular(id, { usuario_id, ubicacion_id, motivo }) {
    if (!motivo) throw new Error('Se requiere un motivo explícito para anular el trámite.');

    return await transaction(async (connection) => {
      await connection.query(`
        UPDATE tramites 
        SET estado = 'ANULADO', motivo_anulacion = ? 
        WHERE id = ?
      `, [motivo, id]);

      await Movimiento.create({
        tramite_id: id,
        tipo_movimiento: 'ANULACION',
        actividad_nombre: 'Anulación de trámite',
        usuario_origen_id: usuario_id,
        ubicacion_origen_id: ubicacion_id,
        estado_movimiento: 'ANULADO',
        proveido: `Anulación: ${motivo}`
      }, connection);

      return this.findById(id, connection);
    });
  }

  /**
   * Borrado lógico del trámite
   */
  static async softDelete(id) {
    await pool.query('UPDATE tramites SET activo = 0 WHERE id = ?', [id]);
    return true;
  }
}

module.exports = Tramite;
