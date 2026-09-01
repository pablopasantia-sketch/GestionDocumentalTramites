const { pool } = require('../config/db');

class Rol {
  static async create({ codigo, nombre, descripcion = null }) {
    const [result] = await pool.query(`
      INSERT INTO roles (codigo, nombre, descripcion, activo)
      VALUES (?, ?, ?, 1)
    `, [codigo, nombre, descripcion]);
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async findByCodigo(codigo) {
    const [rows] = await pool.query('SELECT * FROM roles WHERE codigo = ?', [codigo]);
    return rows[0] || null;
  }

  static async findAll({ activo = true } = {}) {
    let sql = 'SELECT * FROM roles';
    const params = [];
    if (activo !== null) {
      sql += ' WHERE activo = ?';
      params.push(activo ? 1 : 0);
    }
    sql += ' ORDER BY id ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    const allowed = ['codigo', 'nombre', 'descripcion', 'activo'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);
    params.push(id);
    await pool.query(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  static async softDelete(id) {
    const [usrRoles] = await pool.query('SELECT id FROM usuario_roles WHERE rol_id = ? AND activo = 1', [id]);
    if (usrRoles.length > 0) {
      throw new Error('No se puede eliminar el rol: tiene usuarios activos asignados.');
    }
    await pool.query('UPDATE roles SET activo = 0 WHERE id = ?', [id]);
    return true;
  }
}

module.exports = Rol;
