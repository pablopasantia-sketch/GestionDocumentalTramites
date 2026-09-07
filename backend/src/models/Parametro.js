const { pool } = require('../config/db');

class Parametro {
  /**
   * Helper para convertir el valor en texto a su tipo primitivo
   */
  static _castValue(valor, tipo_dato) {
    if (valor === null || valor === undefined) return null;

    switch (tipo_dato?.toUpperCase()) {
      case 'INTEGER':
      case 'INT':
        return parseInt(valor, 10);
      case 'FLOAT':
      case 'DECIMAL':
      case 'NUMBER':
        return parseFloat(valor);
      case 'BOOLEAN':
      case 'BOOL':
        return valor === 'true' || valor === '1' || valor === true;
      case 'JSON':
        try {
          return JSON.parse(valor);
        } catch {
          return valor;
        }
      case 'STRING':
      default:
        return valor;
    }
  }

  /**
   * Helper para serializar cualquier tipo primitivo a string para la BD
   */
  static _serializeValue(valor, tipo_dato) {
    if (valor === null || valor === undefined) return '';

    if (tipo_dato?.toUpperCase() === 'JSON' || typeof valor === 'object') {
      return typeof valor === 'string' ? valor : JSON.stringify(valor);
    }

    return String(valor);
  }

  /**
   * Obtener el valor tipado de un parámetro por su clave
   */
  static async get(clave, defaultValue = null) {
    const [rows] = await pool.query('SELECT valor, tipo_dato FROM parametros WHERE clave = ?', [clave]);
    if (rows.length === 0) return defaultValue;

    return this._castValue(rows[0].valor, rows[0].tipo_dato);
  }

  /**
   * Obtener el registro completo de un parámetro
   */
  static async findByClave(clave) {
    const [rows] = await pool.query('SELECT * FROM parametros WHERE clave = ?', [clave]);
    if (rows.length === 0) return null;

    return {
      ...rows[0],
      parsed_value: this._castValue(rows[0].valor, rows[0].tipo_dato)
    };
  }

  /**
   * Listar todos los parámetros del sistema
   */
  static async getAll() {
    const [rows] = await pool.query('SELECT * FROM parametros ORDER BY clave ASC');
    return rows.map(r => ({
      ...r,
      parsed_value: this._castValue(r.valor, r.tipo_dato)
    }));
  }

  /**
   * Guardar o actualizar un parámetro por clave
   */
  static async set(clave, valor, { tipo_dato = 'STRING', descripcion = null, editable = true } = {}) {
    const stringVal = this._serializeValue(valor, tipo_dato);

    await pool.query(`
      INSERT INTO parametros (clave, valor, tipo_dato, descripcion, editable)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        valor = VALUES(valor),
        tipo_dato = VALUES(tipo_dato),
        descripcion = COALESCE(VALUES(descripcion), descripcion)
    `, [clave, stringVal, tipo_dato, descripcion, editable ? 1 : 0]);

    return this.findByClave(clave);
  }

  /**
   * Actualizar solo el valor de un parámetro existente
   */
  static async update(clave, valor) {
    const current = await this.findByClave(clave);
    if (!current) {
      throw new Error(`El parámetro "${clave}" no existe.`);
    }

    if (!current.editable) {
      throw new Error(`El parámetro "${clave}" es de solo lectura y no puede ser modificado.`);
    }

    const stringVal = this._serializeValue(valor, current.tipo_dato);
    await pool.query('UPDATE parametros SET valor = ? WHERE clave = ?', [stringVal, clave]);
    return this.findByClave(clave);
  }
}

module.exports = Parametro;
