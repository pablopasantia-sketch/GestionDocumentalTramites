const mysql = require('mysql2/promise');
const config = require('./env');

// Crear pool de conexiones con MySQL 8.0
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: config.db.connectionLimit,
  waitForConnections: config.db.waitForConnections,
  queueLimit: config.db.queueLimit,
  charset: config.db.charset,
  timezone: 'Z',
  multipleStatements: true,
  decimalNumbers: true
});

/**
 * Función para probar la conexión con la base de datos MySQL 8.0
 * @returns {Promise<{connected: boolean, message: string, version?: string}>}
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT VERSION() AS version, NOW() AS server_time, DATABASE() as db_name');
    connection.release();
    
    return {
      connected: true,
      message: 'Conexión exitosa a MySQL 8.0+',
      version: rows[0].version,
      serverTime: rows[0].server_time,
      database: rows[0].db_name
    };
  } catch (error) {
    return {
      connected: false,
      message: `Error al conectar con MySQL: ${error.message}`,
      code: error.code,
      errno: error.errno
    };
  }
}

/**
 * Wrapper para ejecutar consultas SQL con manejo seguro de conexiones
 */
async function query(sql, params = []) {
  const [results] = await pool.execute(sql, params);
  return results;
}

/**
 * Wrapper para ejecutar transacciones
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  query,
  transaction
};
