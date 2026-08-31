const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config/env');

async function initDb() {
  console.log('🚀 Iniciando configuración de la Base de Datos MySQL 8.0 para Wayka...');
  
  let connection;
  try {
    // 1. Conectar al servidor MySQL (sin especificar base de datos por si aún no existe)
    console.log(`📡 Conectando al servidor MySQL en ${config.db.host}:${config.db.port} con usuario "${config.db.user}"...`);
    connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      multipleStatements: true
    });

    console.log('✅ Conexión inicial al servidor MySQL establecida con éxito.');

    // 2. Crear la base de datos si no existe
    console.log(`📦 Verificando/Creando base de datos "${config.db.database}"...`);
    await connection.query(`
      CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Base de datos "${config.db.database}" lista.`);

    // 3. Seleccionar la base de datos
    await connection.query(`USE \`${config.db.database}\`;`);

    // 4. Leer y ejecutar el script DDL schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`📄 Leyendo archivo de esquema: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⚙️  Ejecutando sentencias DDL (Tablas, Índices y Restricciones)...');
    await connection.query(schemaSql);
    console.log('✅ Tablas creadas satisfactoriamente.');

    // 5. Listar las tablas creadas
    const [tables] = await connection.query('SHOW TABLES;');
    console.log('\n📋 Tablas creadas en la base de datos:');
    tables.forEach((row, index) => {
      const tableName = Object.values(row)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });

    console.log('\n🎉 ¡Inicialización de Base de Datos completada con éxito!');
  } catch (error) {
    console.error('\n❌ Error durante la inicialización de la base de datos:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('👉 Asegúrate de que el servicio MySQL Server 8.0 esté ejecutándose en el puerto indicado.');
    }
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initDb();
}

module.exports = initDb;
