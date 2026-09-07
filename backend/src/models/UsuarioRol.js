const { pool } = require('../config/db');

class UsuarioRol {
  /**
   * Asignar un rol con ubicación orgánica a un usuario
   */
  static async create({
    usuario_id,
    rol_id,
    ubicacion_org_id,
    nivel_acceso = 'CONTROL_TOTAL',
    fecha_expiracion = null,
    filtro = null,
    es_principal = false
  }) {
    // Si se define como principal, desmarcar los demás roles principales del usuario
    if (es_principal) {
      await pool.query('UPDATE usuario_roles SET es_principal = 0 WHERE usuario_id = ?', [usuario_id]);
    }

    const [result] = await pool.query(`
      INSERT INTO usuario_roles (
        usuario_id, rol_id, ubicacion_org_id, nivel_acceso, 
        fecha_expiracion, filtro, es_principal, activo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE 
        nivel_acceso = VALUES(nivel_acceso),
        fecha_expiracion = VALUES(fecha_expiracion),
        filtro = VALUES(filtro),
        es_principal = VALUES(es_principal),
        activo = 1
    `, [usuario_id, rol_id, ubicacion_org_id, nivel_acceso, fecha_expiracion, filtro, es_principal ? 1 : 0]);

    const id = result.insertId || (await this.findByUsuarioAndRol(usuario_id, rol_id, ubicacion_org_id))?.id;
    return this.findById(id);
  }

  /**
   * Buscar asignación por ID con datos relacionados
   */
  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT 
        ur.id, ur.usuario_id, ur.rol_id, ur.ubicacion_org_id,
        ur.nivel_acceso, ur.fecha_expiracion, ur.filtro, ur.es_principal, ur.activo,
        ur.created_at, ur.updated_at,
        u.login as usuario_login,
        p.nombres, p.apellido_paterno, p.apellido_materno,
        r.codigo as rol_codigo, r.nombre as rol_nombre,
        uo.codigo as ubicacion_codigo, uo.nombre as ubicacion_nombre, uo.sigla as ubicacion_sigla
      FROM usuario_roles ur
      INNER JOIN usuarios u ON ur.usuario_id = u.id
      INNER JOIN personas p ON u.persona_id = p.id
      INNER JOIN roles r ON ur.rol_id = r.id
      INNER JOIN ubicaciones_org uo ON ur.ubicacion_org_id = uo.id
      WHERE ur.id = ?
    `, [id]);
    return rows[0] || null;
  }

  /**
   * Buscar por usuario, rol y ubicación específica
   */
  static async findByUsuarioAndRol(usuario_id, rol_id, ubicacion_org_id) {
    const [rows] = await pool.query(`
      SELECT * FROM usuario_roles 
      WHERE usuario_id = ? AND rol_id = ? AND ubicacion_org_id = ?
    `, [usuario_id, rol_id, ubicacion_org_id]);
    return rows[0] || null;
  }

  /**
   * Listar todos los roles de un usuario
   */
  static async findByUsuario(usuario_id, { soloActivos = true } = {}) {
    let sql = `
      SELECT 
        ur.id, ur.usuario_id, ur.rol_id, ur.ubicacion_org_id,
        ur.nivel_acceso, ur.fecha_expiracion, ur.filtro, ur.es_principal, ur.activo,
        r.codigo as rol_codigo, r.nombre as rol_nombre,
        uo.codigo as ubicacion_codigo, uo.nombre as ubicacion_nombre, uo.sigla as ubicacion_sigla
      FROM usuario_roles ur
      INNER JOIN roles r ON ur.rol_id = r.id
      INNER JOIN ubicaciones_org uo ON ur.ubicacion_org_id = uo.id
      WHERE ur.usuario_id = ?
    `;
    const params = [usuario_id];

    if (soloActivos) {
      sql += ' AND ur.activo = 1 AND r.activo = 1 AND uo.activo = 1';
      sql += ' AND (ur.fecha_expiracion IS NULL OR ur.fecha_expiracion >= CURDATE())';
    }

    sql += ' ORDER BY ur.es_principal DESC, r.nombre ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Listar todas las asignaciones con filtros
   */
  static async findAll({ usuario_id = null, rol_id = null, ubicacion_org_id = null, activo = true } = {}) {
    let sql = `
      SELECT 
        ur.id, ur.usuario_id, ur.rol_id, ur.ubicacion_org_id,
        ur.nivel_acceso, ur.fecha_expiracion, ur.filtro, ur.es_principal, ur.activo,
        u.login as usuario_login,
        p.nombres, p.apellido_paterno,
        r.codigo as rol_codigo, r.nombre as rol_nombre,
        uo.codigo as ubicacion_codigo, uo.nombre as ubicacion_nombre
      FROM usuario_roles ur
      INNER JOIN usuarios u ON ur.usuario_id = u.id
      INNER JOIN personas p ON u.persona_id = p.id
      INNER JOIN roles r ON ur.rol_id = r.id
      INNER JOIN ubicaciones_org uo ON ur.ubicacion_org_id = uo.id
      WHERE 1=1
    `;
    const params = [];

    if (usuario_id !== null) {
      sql += ' AND ur.usuario_id = ?';
      params.push(usuario_id);
    }
    if (rol_id !== null) {
      sql += ' AND ur.rol_id = ?';
      params.push(rol_id);
    }
    if (ubicacion_org_id !== null) {
      sql += ' AND ur.ubicacion_org_id = ?';
      params.push(ubicacion_org_id);
    }
    if (activo !== null) {
      sql += ' AND ur.activo = ?';
      params.push(activo ? 1 : 0);
    }

    sql += ' ORDER BY ur.usuario_id ASC, ur.es_principal DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Actualizar una asignación
   */
  static async update(id, data) {
    const fields = [];
    const params = [];
    const allowed = ['nivel_acceso', 'fecha_expiracion', 'filtro', 'es_principal', 'activo'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    // Si se activa como principal, desmarcar otros del mismo usuario
    if (data.es_principal) {
      const current = await this.findById(id);
      if (current) {
        await pool.query('UPDATE usuario_roles SET es_principal = 0 WHERE usuario_id = ?', [current.usuario_id]);
      }
    }

    params.push(id);
    await pool.query(`UPDATE usuario_roles SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  /**
   * Marcar un rol como principal del usuario
   */
  static async setPrincipal(usuario_id, usuario_rol_id) {
    await pool.query('UPDATE usuario_roles SET es_principal = 0 WHERE usuario_id = ?', [usuario_id]);
    await pool.query('UPDATE usuario_roles SET es_principal = 1 WHERE id = ? AND usuario_id = ?', [usuario_rol_id, usuario_id]);
    return this.findById(usuario_rol_id);
  }

  /**
   * Borrado lógico
   */
  static async softDelete(id) {
    await pool.query('UPDATE usuario_roles SET activo = 0, es_principal = 0 WHERE id = ?', [id]);
    return true;
  }
}

module.exports = UsuarioRol;
