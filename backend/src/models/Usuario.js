const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

class Usuario {
  static async create({ persona_id, login, password, cargo = null }) {
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(`
      INSERT INTO usuarios (persona_id, login, password_hash, cargo, activo)
      VALUES (?, ?, ?, ?, 1)
    `, [persona_id, login, password_hash, cargo]);

    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT 
        u.id, u.persona_id, u.login, u.cargo, u.activo, u.ultimo_acceso, u.created_at, u.updated_at,
        p.nombres, p.apellido_paterno, p.apellido_materno, p.ci, p.ci_expedido, p.email, p.telefono
      FROM usuarios u
      INNER JOIN personas p ON u.persona_id = p.id
      WHERE u.id = ?
    `, [id]);
    return rows[0] || null;
  }

  static async findByLogin(login) {
    const [rows] = await pool.query(`
      SELECT 
        u.id, u.persona_id, u.login, u.password_hash, u.cargo, u.activo, u.ultimo_acceso,
        p.nombres, p.apellido_paterno, p.apellido_materno, p.ci, p.email
      FROM usuarios u
      INNER JOIN personas p ON u.persona_id = p.id
      WHERE u.login = ?
    `, [login]);
    return rows[0] || null;
  }

  static async findAll({ activo = true, search = '' } = {}) {
    let sql = `
      SELECT 
        u.id, u.persona_id, u.login, u.cargo, u.activo, u.ultimo_acceso,
        p.nombres, p.apellido_paterno, p.apellido_materno, p.ci, p.email, p.telefono
      FROM usuarios u
      INNER JOIN personas p ON u.persona_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (activo !== null) {
      sql += ' AND u.activo = ?';
      params.push(activo ? 1 : 0);
    }

    if (search) {
      sql += ' AND (u.login LIKE ? OR p.nombres LIKE ? OR p.apellido_paterno LIKE ? OR p.ci LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY p.apellido_paterno ASC, p.nombres ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    const allowed = ['cargo', 'activo'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);
    params.push(id);
    await pool.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  static async updatePassword(id, plainPassword) {
    const password_hash = await bcrypt.hash(plainPassword, 10);
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [password_hash, id]);
    return true;
  }

  static async softDelete(id) {
    // Desactivar asignaciones de rol y usuario
    await pool.query('UPDATE usuario_roles SET activo = 0 WHERE usuario_id = ?', [id]);
    await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
    return true;
  }

  static async getRoles(id) {
    const [rows] = await pool.query(`
      SELECT 
        ur.id AS usuario_rol_id,
        ur.rol_id,
        r.codigo AS rol_codigo,
        r.nombre AS rol_nombre,
        ur.ubicacion_org_id,
        uo.codigo AS ubicacion_codigo,
        uo.nombre AS ubicacion_nombre,
        ur.nivel_acceso,
        ur.fecha_expiracion,
        ur.filtro,
        ur.es_principal,
        ur.activo
      FROM usuario_roles ur
      INNER JOIN roles r ON ur.rol_id = r.id
      INNER JOIN ubicaciones_org uo ON ur.ubicacion_org_id = uo.id
      WHERE ur.usuario_id = ? AND ur.activo = 1 AND r.activo = 1 AND uo.activo = 1
    `, [id]);
    return rows;
  }
}

module.exports = Usuario;
