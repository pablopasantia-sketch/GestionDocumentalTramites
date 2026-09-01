const { pool } = require('../config/db');

class UbicacionOrg {
  /**
   * Crear una nueva ubicación orgánica (Unidad / Oficina)
   */
  static async create({ codigo, nombre, sigla = null, padre_id = null, nivel = 1, descripcion = null }) {
    // Si tiene padre_id, calcular nivel automáticamente
    if (padre_id) {
      const padre = await this.findById(padre_id);
      if (padre) {
        nivel = padre.nivel + 1;
      }
    }

    const [result] = await pool.query(`
      INSERT INTO ubicaciones_org (codigo, nombre, sigla, padre_id, nivel, descripcion, activo)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [codigo, nombre, sigla, padre_id, nivel, descripcion]);

    return this.findById(result.insertId);
  }

  /**
   * Buscar ubicación orgánica por ID
   */
  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT uo.*, padre.nombre as padre_nombre, padre.sigla as padre_sigla
      FROM ubicaciones_org uo
      LEFT JOIN ubicaciones_org padre ON uo.padre_id = padre.id
      WHERE uo.id = ?
    `, [id]);
    return rows[0] || null;
  }

  /**
   * Buscar por código
   */
  static async findByCodigo(codigo) {
    const [rows] = await pool.query('SELECT * FROM ubicaciones_org WHERE codigo = ?', [codigo]);
    return rows[0] || null;
  }

  /**
   * Listar todas las ubicaciones
   */
  static async findAll({ activo = true } = {}) {
    let sql = `
      SELECT uo.*, padre.nombre as padre_nombre, padre.sigla as padre_sigla
      FROM ubicaciones_org uo
      LEFT JOIN ubicaciones_org padre ON uo.padre_id = padre.id
    `;
    const params = [];

    if (activo !== null) {
      sql += ' WHERE uo.activo = ?';
      params.push(activo ? 1 : 0);
    }

    sql += ' ORDER BY uo.nivel ASC, uo.nombre ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Obtener árbol jerárquico de organigrama
   */
  static async findTree() {
    const all = await this.findAll({ activo: true });
    const map = new Map();
    const roots = [];

    all.forEach(item => {
      map.set(item.id, { ...item, hijos: [] });
    });

    all.forEach(item => {
      if (item.padre_id && map.has(item.padre_id)) {
        map.get(item.padre_id).hijos.push(map.get(item.id));
      } else {
        roots.push(map.get(item.id));
      }
    });

    return roots;
  }

  /**
   * Actualizar ubicación
   */
  static async update(id, data) {
    const fields = [];
    const params = [];

    const allowed = ['codigo', 'nombre', 'sigla', 'padre_id', 'nivel', 'descripcion', 'activo'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);
    await pool.query(`UPDATE ubicaciones_org SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  /**
   * Borrado lógico con control de dependencias
   */
  static async softDelete(id) {
    // 1. Verificar si tiene oficinas hijas activas
    const [hijos] = await pool.query('SELECT id FROM ubicaciones_org WHERE padre_id = ? AND activo = 1', [id]);
    if (hijos.length > 0) {
      throw new Error('No se puede eliminar la unidad: tiene sub-unidades u oficinas dependientes.');
    }

    // 2. Verificar si hay asignaciones de usuario-rol activas
    const [usrRoles] = await pool.query('SELECT id FROM usuario_roles WHERE ubicacion_org_id = ? AND activo = 1', [id]);
    if (usrRoles.length > 0) {
      throw new Error('No se puede eliminar la unidad: tiene funcionarios con roles asignados a esta oficina.');
    }

    await pool.query('UPDATE ubicaciones_org SET activo = 0 WHERE id = ?', [id]);
    return true;
  }
}

module.exports = UbicacionOrg;
