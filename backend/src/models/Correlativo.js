const { pool } = require('../config/db');

class Correlativo {
  /**
   * Obtener el siguiente número secuencial atómico garantizando unicidad y concurrencia
   * Soporta ejecución dentro de una transacción activa pasándole `connection`
   */
  static async siguiente({
    tipo_proceso_id = null,
    ubicacion_org_id = null,
    gestion = new Date().getFullYear(),
    connection = null
  } = {}) {
    const executor = connection || pool;

    // Normalizar nulls para matching exacto en SQL
    // En MySQL, UNIQUE KEY con NULL permite duplicados si no se maneja adecuadamente.
    // Usamos COALESCE o búsqueda específica con IS NULL
    let selectSql = `
      SELECT id, ultimo_numero 
      FROM correlativos 
      WHERE gestion = ?
    `;
    const params = [gestion];

    if (tipo_proceso_id !== null) {
      selectSql += ' AND tipo_proceso_id = ?';
      params.push(tipo_proceso_id);
    } else {
      selectSql += ' AND tipo_proceso_id IS NULL';
    }

    if (ubicacion_org_id !== null) {
      selectSql += ' AND ubicacion_org_id = ?';
      params.push(ubicacion_org_id);
    } else {
      selectSql += ' AND ubicacion_org_id IS NULL';
    }

    // Si viene dentro de una conexión de transacción, aplicar FOR UPDATE
    if (connection) {
      selectSql += ' FOR UPDATE';
    }

    const [rows] = await executor.query(selectSql, params);

    let nuevoNumero = 1;

    if (rows.length === 0) {
      // Inserción inicial para esta tupla (tipo_proceso, ubicacion, gestion)
      try {
        await executor.query(`
          INSERT INTO correlativos (tipo_proceso_id, ubicacion_org_id, gestion, ultimo_numero)
          VALUES (?, ?, ?, 1)
        `, [tipo_proceso_id, ubicacion_org_id, gestion]);
        nuevoNumero = 1;
      } catch (err) {
        // En caso de colisión concurrente al insertar por primera vez, reintentar actualización
        if (err.code === 'ER_DUP_ENTRY') {
          return this.siguiente({ tipo_proceso_id, ubicacion_org_id, gestion, connection });
        }
        throw err;
      }
    } else {
      nuevoNumero = rows[0].ultimo_numero + 1;
      await executor.query(`
        UPDATE correlativos 
        SET ultimo_numero = ? 
        WHERE id = ?
      `, [nuevoNumero, rows[0].id]);
    }

    return nuevoNumero;
  }

  /**
   * Generar código correlativo formateado completo [CÓDIGO]-[NÚMERO]/[GESTIÓN]
   * Ej: SV-1/2026, CORR-EXT-3/2026
   */
  static async generarCodigo({
    tipo_proceso_id = null,
    ubicacion_org_id = null,
    gestion = new Date().getFullYear(),
    connection = null
  } = {}) {
    const executor = connection || pool;
    let prefijo = 'TRAM';

    if (tipo_proceso_id) {
      const [tipos] = await executor.query('SELECT codigo FROM tipos_proceso WHERE id = ?', [tipo_proceso_id]);
      if (tipos.length > 0) {
        prefijo = tipos[0].codigo;
      }
    } else if (ubicacion_org_id) {
      const [ubis] = await executor.query('SELECT sigla, codigo FROM ubicaciones_org WHERE id = ?', [ubicacion_org_id]);
      if (ubis.length > 0) {
        prefijo = ubis[0].sigla || ubis[0].codigo;
      }
    }

    const numero = await this.siguiente({
      tipo_proceso_id,
      ubicacion_org_id,
      gestion,
      connection
    });

    const numeroCorrelativo = `${prefijo}-${numero}/${gestion}`;

    return {
      numeroCorrelativo,
      numero,
      prefijo,
      gestion
    };
  }

  /**
   * Obtener el estado actual del correlativo sin incrementar
   */
  static async obtenerActual({
    tipo_proceso_id = null,
    ubicacion_org_id = null,
    gestion = new Date().getFullYear()
  } = {}) {
    let sql = 'SELECT * FROM correlativos WHERE gestion = ?';
    const params = [gestion];

    if (tipo_proceso_id !== null) {
      sql += ' AND tipo_proceso_id = ?';
      params.push(tipo_proceso_id);
    } else {
      sql += ' AND tipo_proceso_id IS NULL';
    }

    if (ubicacion_org_id !== null) {
      sql += ' AND ubicacion_org_id = ?';
      params.push(ubicacion_org_id);
    } else {
      sql += ' AND ubicacion_org_id IS NULL';
    }

    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  }
}

module.exports = Correlativo;
