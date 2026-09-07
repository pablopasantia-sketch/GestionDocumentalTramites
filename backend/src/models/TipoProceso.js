const { pool } = require('../config/db');

class TipoProceso {
  /**
   * Crear un nuevo tipo de proceso (Trámite o Correspondencia)
   */
  static async create({
    codigo,
    nombre,
    descripcion = null,
    tipo_categoria = 'TRAMITE',
    ubicacion_org_id = null,
    correlativo_seq = 0,
    tiempo_estimado_horas = 24
  }) {
    const [result] = await pool.query(`
      INSERT INTO tipos_proceso (
        codigo, nombre, descripcion, tipo_categoria, 
        ubicacion_org_id, correlativo_seq, tiempo_estimado_horas, activo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, correlativo_seq, tiempo_estimado_horas]);

    return this.findById(result.insertId);
  }

  /**
   * Buscar por ID con información de la unidad orgánica asociada
   */
  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT 
        tp.*,
        uo.codigo as ubicacion_codigo,
        uo.nombre as ubicacion_nombre,
        uo.sigla as ubicacion_sigla
      FROM tipos_proceso tp
      LEFT JOIN ubicaciones_org uo ON tp.ubicacion_org_id = uo.id
      WHERE tp.id = ?
    `, [id]);
    return rows[0] || null;
  }

  /**
   * Buscar por código único de proceso (ej: 'SV', 'CM', 'CORR-EXT')
   */
  static async findByCodigo(codigo) {
    const [rows] = await pool.query(`
      SELECT 
        tp.*,
        uo.codigo as ubicacion_codigo,
        uo.nombre as ubicacion_nombre,
        uo.sigla as ubicacion_sigla
      FROM tipos_proceso tp
      LEFT JOIN ubicaciones_org uo ON tp.ubicacion_org_id = uo.id
      WHERE tp.codigo = ?
    `, [codigo]);
    return rows[0] || null;
  }

  /**
   * Listar todos los tipos de proceso con filtros
   */
  static async findAll({ tipo_categoria = null, activo = true, search = '' } = {}) {
    let sql = `
      SELECT 
        tp.*,
        uo.codigo as ubicacion_codigo,
        uo.nombre as ubicacion_nombre,
        uo.sigla as ubicacion_sigla
      FROM tipos_proceso tp
      LEFT JOIN ubicaciones_org uo ON tp.ubicacion_org_id = uo.id
      WHERE 1=1
    `;
    const params = [];

    if (activo !== null) {
      sql += ' AND tp.activo = ?';
      params.push(activo ? 1 : 0);
    }

    if (tipo_categoria) {
      sql += ' AND tp.tipo_categoria = ?';
      params.push(tipo_categoria);
    }

    if (search) {
      sql += ' AND (tp.codigo LIKE ? OR tp.nombre LIKE ? OR tp.descripcion LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY tp.tipo_categoria ASC, tp.nombre ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Actualizar tipo de proceso
   */
  static async update(id, data) {
    const fields = [];
    const params = [];
    const allowed = ['codigo', 'nombre', 'descripcion', 'tipo_categoria', 'ubicacion_org_id', 'correlativo_seq', 'tiempo_estimado_horas', 'activo'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);
    await pool.query(`UPDATE tipos_proceso SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  /**
   * Borrado lógico con validación de dependencias en trámites activos
   */
  static async softDelete(id) {
    // 1. Verificar si hay trámites asociados activos
    const [tramites] = await pool.query('SELECT id FROM tramites WHERE tipo_proceso_id = ? AND activo = 1 LIMIT 1', [id]);
    if (tramites.length > 0) {
      throw new Error('No se puede eliminar el tipo de proceso: existen trámites activos asociados a este tipo.');
    }

    await pool.query('UPDATE tipos_proceso SET activo = 0 WHERE id = ?', [id]);
    return true;
  }
}

module.exports = TipoProceso;
