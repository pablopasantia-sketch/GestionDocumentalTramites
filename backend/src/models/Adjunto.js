const { pool } = require('../config/db');

class Adjunto {
  /**
   * Registrar un nuevo archivo adjunto asociado a un trámite o movimiento
   */
  static async create({
    tramite_id,
    movimiento_id = null,
    nombre_original,
    nombre_almacenado,
    ruta_archivo,
    tipo_mime = 'application/pdf',
    tamano_bytes = 0,
    subido_por
  }) {
    const [result] = await pool.query(`
      INSERT INTO adjuntos (
        tramite_id, movimiento_id, nombre_original, nombre_almacenado,
        ruta_archivo, tipo_mime, tamano_bytes, subido_por, activo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      tramite_id,
      movimiento_id,
      nombre_original,
      nombre_almacenado,
      ruta_archivo,
      tipo_mime,
      tamano_bytes,
      subido_por
    ]);

    return this.findById(result.insertId);
  }

  /**
   * Buscar adjunto por ID con datos del usuario que lo subió
   */
  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT 
        a.*,
        u.login as subido_por_login,
        p.nombres, p.apellido_paterno
      FROM adjuntos a
      INNER JOIN usuarios u ON a.subido_por = u.id
      INNER JOIN personas p ON u.persona_id = p.id
      WHERE a.id = ?
    `, [id]);

    return rows[0] || null;
  }

  /**
   * Listar todos los adjuntos de un trámite
   */
  static async findByTramiteId(tramite_id, { activo = true } = {}) {
    let sql = `
      SELECT 
        a.*,
        u.login as subido_por_login,
        p.nombres, p.apellido_paterno
      FROM adjuntos a
      INNER JOIN usuarios u ON a.subido_por = u.id
      INNER JOIN personas p ON u.persona_id = p.id
      WHERE a.tramite_id = ?
    `;
    const params = [tramite_id];

    if (activo !== null) {
      sql += ' AND a.activo = ?';
      params.push(activo ? 1 : 0);
    }

    sql += ' ORDER BY a.id ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Listar adjuntos de un movimiento específico
   */
  static async findByMovimientoId(movimiento_id, { activo = true } = {}) {
    let sql = `
      SELECT 
        a.*,
        u.login as subido_por_login,
        p.nombres, p.apellido_paterno
      FROM adjuntos a
      INNER JOIN usuarios u ON a.subido_por = u.id
      INNER JOIN personas p ON u.persona_id = p.id
      WHERE a.movimiento_id = ?
    `;
    const params = [movimiento_id];

    if (activo !== null) {
      sql += ' AND a.activo = ?';
      params.push(activo ? 1 : 0);
    }

    sql += ' ORDER BY a.id ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Borrado lógico de adjunto
   */
  static async softDelete(id) {
    await pool.query('UPDATE adjuntos SET activo = 0 WHERE id = ?', [id]);
    return true;
  }
}

module.exports = Adjunto;
