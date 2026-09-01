const { pool } = require('../config/db');

class Persona {
  /**
   * Crear una nueva persona
   */
  static async create({ nombres, apellido_paterno, apellido_materno = null, ci, ci_expedido = 'LP', sexo = 'M', estado_civil = null, telefono = null, email = null, empresa_telefonica = null, direccion = null }) {
    const [result] = await pool.query(`
      INSERT INTO personas (nombres, apellido_paterno, apellido_materno, ci, ci_expedido, sexo, estado_civil, telefono, email, empresa_telefonica, direccion, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [nombres, apellido_paterno, apellido_materno, ci, ci_expedido, sexo, estado_civil, telefono, email, empresa_telefonica, direccion]);

    return this.findById(result.insertId);
  }

  /**
   * Buscar persona por ID
   */
  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM personas WHERE id = ?', [id]);
    return rows[0] || null;
  }

  /**
   * Buscar persona por Cédula de Identidad (CI)
   */
  static async findByCi(ci) {
    const [rows] = await pool.query('SELECT * FROM personas WHERE ci = ?', [ci]);
    return rows[0] || null;
  }

  /**
   * Listar todas las personas activas
   */
  static async findAll({ search = '', activo = true, limit = 50, offset = 0 } = {}) {
    let sql = 'SELECT * FROM personas WHERE 1=1';
    const params = [];

    if (activo !== null) {
      sql += ' AND activo = ?';
      params.push(activo ? 1 : 0);
    }

    if (search) {
      sql += ' AND (nombres LIKE ? OR apellido_paterno LIKE ? OR apellido_materno LIKE ? OR ci LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY apellido_paterno ASC, nombres ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Actualizar datos de persona
   */
  static async update(id, data) {
    const fields = [];
    const params = [];

    const allowed = ['nombres', 'apellido_paterno', 'apellido_materno', 'ci', 'ci_expedido', 'sexo', 'estado_civil', 'telefono', 'email', 'empresa_telefonica', 'direccion', 'activo'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);
    await pool.query(`UPDATE personas SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  /**
   * Borrado lógico con verificación de dependencias en usuarios
   */
  static async softDelete(id) {
    const [usuarios] = await pool.query('SELECT id FROM usuarios WHERE persona_id = ? AND activo = 1', [id]);
    if (usuarios.length > 0) {
      throw new Error('No se puede eliminar la persona: tiene un usuario activo asociado en el sistema.');
    }

    await pool.query('UPDATE personas SET activo = 0 WHERE id = ?', [id]);
    return true;
  }
}

module.exports = Persona;
