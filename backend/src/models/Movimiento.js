const { pool } = require('../config/db');

class Movimiento {
  /**
   * Registrar un nuevo movimiento en el historial inmutable (append-only)
   * Puede ejecutarse dentro de una transacción pasando `connection`
   */
  static async create({
    tramite_id,
    tipo_movimiento,
    actividad_nombre = 'Atención de trámite',
    usuario_origen_id,
    ubicacion_origen_id,
    usuario_destino_id = null,
    ubicacion_destino_id = null,
    estado_movimiento,
    proveido = null,
    instruccion = null,
    justificacion_retroceso = null,
    fecha_recepcion = null,
    fecha_envio = null,
    tiempo_estimado_minutos = 0,
    tiempo_transcurrido_minutos = 0
  }, connection = null) {
    const executor = connection || pool;

    // 1. Obtener el siguiente número de orden y el último movimiento para calcular tiempos
    const [prevRows] = await executor.query(`
      SELECT orden, created_at, fecha_recepcion 
      FROM movimientos 
      WHERE tramite_id = ? 
      ORDER BY orden DESC 
      LIMIT 1
    `, [tramite_id]);

    let siguienteOrden = 1;
    let tiempoCalc = tiempo_transcurrido_minutos;

    if (prevRows.length > 0) {
      siguienteOrden = prevRows[0].orden + 1;

      // Si no se proporcionó tiempo transcurrido explícito, calcularlo automáticamente en minutos
      if (tiempoCalc === 0 && prevRows[0].created_at) {
        const fechaPrevia = new Date(prevRows[0].created_at);
        const ahora = new Date();
        const diffMs = ahora.getTime() - fechaPrevia.getTime();
        tiempoCalc = Math.max(0, Math.round(diffMs / (1000 * 60)));
      }
    }

    const [result] = await executor.query(`
      INSERT INTO movimientos (
        tramite_id, orden, tipo_movimiento, actividad_nombre,
        usuario_origen_id, ubicacion_origen_id, usuario_destino_id, ubicacion_destino_id,
        estado_movimiento, proveido, instruccion, justificacion_retroceso,
        fecha_recepcion, fecha_envio, tiempo_estimado_minutos, tiempo_transcurrido_minutos
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tramite_id,
      siguienteOrden,
      tipo_movimiento,
      actividad_nombre,
      usuario_origen_id,
      ubicacion_origen_id,
      usuario_destino_id,
      ubicacion_destino_id,
      estado_movimiento,
      proveido,
      instruccion,
      justificacion_retroceso,
      fecha_recepcion || new Date(),
      fecha_envio,
      tiempo_estimado_minutos,
      tiempoCalc
    ]);

    return this.findById(result.insertId, connection);
  }

  /**
   * Buscar un movimiento por ID con relaciones completas de auditoría
   */
  static async findById(id, connection = null) {
    const executor = connection || pool;
    const [rows] = await executor.query(`
      SELECT 
        m.*,
        uo_orig.codigo as origen_codigo, uo_orig.nombre as origen_nombre, uo_orig.sigla as origen_sigla,
        u_orig.login as usuario_origen_login, p_orig.nombres as origen_nombres, p_orig.apellido_paterno as origen_ap_paterno,
        uo_dest.codigo as destino_codigo, uo_dest.nombre as destino_nombre, uo_dest.sigla as destino_sigla,
        u_dest.login as usuario_destino_login, p_dest.nombres as destino_nombres, p_dest.apellido_paterno as destino_ap_paterno
      FROM movimientos m
      INNER JOIN ubicaciones_org uo_orig ON m.ubicacion_origen_id = uo_orig.id
      INNER JOIN usuarios u_orig ON m.usuario_origen_id = u_orig.id
      INNER JOIN personas p_orig ON u_orig.persona_id = p_orig.id
      LEFT JOIN ubicaciones_org uo_dest ON m.ubicacion_destino_id = uo_dest.id
      LEFT JOIN usuarios u_dest ON m.usuario_destino_id = u_dest.id
      LEFT JOIN personas p_dest ON u_dest.persona_id = p_dest.id
      WHERE m.id = ?
    `, [id]);

    return rows[0] || null;
  }

  /**
   * Obtener todo el historial cronológico de un trámite (Trazabilidad y Auditoría)
   */
  static async findByTramiteId(tramite_id) {
    const [rows] = await pool.query(`
      SELECT 
        m.*,
        uo_orig.codigo as origen_codigo, uo_orig.nombre as origen_nombre, uo_orig.sigla as origen_sigla,
        u_orig.login as usuario_origen_login, p_orig.nombres as origen_nombres, p_orig.apellido_paterno as origen_ap_paterno,
        uo_dest.codigo as destino_codigo, uo_dest.nombre as destino_nombre, uo_dest.sigla as destino_sigla,
        u_dest.login as usuario_destino_login, p_dest.nombres as destino_nombres, p_dest.apellido_paterno as destino_ap_paterno
      FROM movimientos m
      INNER JOIN ubicaciones_org uo_orig ON m.ubicacion_origen_id = uo_orig.id
      INNER JOIN usuarios u_orig ON m.usuario_origen_id = u_orig.id
      INNER JOIN personas p_orig ON u_orig.persona_id = p_orig.id
      LEFT JOIN ubicaciones_org uo_dest ON m.ubicacion_destino_id = uo_dest.id
      LEFT JOIN usuarios u_dest ON m.usuario_destino_id = u_dest.id
      LEFT JOIN personas p_dest ON u_dest.persona_id = p_dest.id
      WHERE m.tramite_id = ?
      ORDER BY m.orden ASC
    `, [tramite_id]);

    return rows;
  }

  /**
   * Obtener el último movimiento de un trámite
   */
  static async obtenerUltimo(tramite_id, connection = null) {
    const executor = connection || pool;
    const [rows] = await executor.query(`
      SELECT * FROM movimientos 
      WHERE tramite_id = ? 
      ORDER BY orden DESC 
      LIMIT 1
    `, [tramite_id]);

    return rows[0] || null;
  }

  /**
   * REGLA DE NEGOCIO: Inmutabilidad estricta (append-only)
   * Los movimientos no se pueden modificar una vez creados.
   */
  static async update() {
    throw new Error('Regla de inmutabilidad violada: Los movimientos del historial son inmutables (append-only) y no pueden ser modificados.');
  }

  /**
   * REGLA DE NEGOCIO: Inmutabilidad estricta
   * Los movimientos no se pueden eliminar.
   */
  static async delete() {
    throw new Error('Regla de inmutabilidad violada: Los movimientos del historial son inmutables (append-only) y no pueden ser eliminados.');
  }

  static async softDelete() {
    throw new Error('Regla de inmutabilidad violada: Los movimientos del historial son inmutables (append-only) y no admiten borrado lógico.');
  }
}

module.exports = Movimiento;
