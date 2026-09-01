const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config/env');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Obtener conexión directa al servidor MySQL
 */
async function getDirectConnection(includeDb = true) {
  return await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: includeDb ? config.db.database : undefined,
    multipleStatements: true,
    charset: 'utf8mb4'
  });
}

/**
 * Asegurar que la base de datos y la tabla de control _migrations existan
 */
async function initMigrationTable() {
  // 1. Asegurar base de datos
  const rootConn = await getDirectConnection(false);
  await rootConn.query(`
    CREATE DATABASE IF NOT EXISTS \`${config.db.database}\`
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;
  `);
  await rootConn.end();

  // 2. Asegurar tabla de migraciones
  const conn = await getDirectConnection(true);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`_migrations\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`batch\` INT NOT NULL DEFAULT 1,
      \`executed_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY \`uk_migration_name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.end();
}

/**
 * Ejecutar migraciones pendientes (UP)
 */
async function up() {
  console.log('\n======================================================');
  console.log('       SISTEMA WAYKA - EJECUTOR DE MIGRACIONES        ');
  console.log('======================================================');
  
  await initMigrationTable();
  const conn = await getDirectConnection(true);

  try {
    // 1. Obtener archivos de migración disponibles
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // 2. Obtener migraciones ya aplicadas
    const [appliedRows] = await conn.query('SELECT name FROM `_migrations`;');
    const appliedNames = new Set(appliedRows.map(r => r.name));

    // 3. Determinar el siguiente número de batch
    const [batchRows] = await conn.query('SELECT MAX(batch) as max_batch FROM `_migrations`;');
    const currentBatch = (batchRows[0]?.max_batch || 0) + 1;

    // 4. Filtrar migraciones pendientes
    const pending = files.filter(f => !appliedNames.has(f));

    if (pending.length === 0) {
      console.log('✨ Base de datos al día. No hay migraciones pendientes.');
      console.log('======================================================\n');
      return { applied: 0, pending: 0 };
    }

    console.log(`📦 Se encontraron ${pending.length} migración(es) pendiente(s):\n`);

    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      const start = Date.now();
      process.stdout.write(`   ⚙️  Aplicando: ${file} ... `);

      // Ejecutar migración dentro de una transacción
      await conn.beginTransaction();
      try {
        await conn.query(sql);
        await conn.query(
          'INSERT INTO `_migrations` (`name`, `batch`) VALUES (?, ?);',
          [file, currentBatch]
        );
        await conn.commit();
        const duration = Date.now() - start;
        console.log(`✅ OK (${duration}ms)`);
      } catch (err) {
        await conn.rollback();
        console.log(`❌ ERROR`);
        throw new Error(`Fallo en la migración ${file}: ${err.message}`);
      }
    }

    console.log(`\n🎉 ¡${pending.length} migraciones ejecutadas exitosamente en Batch #${currentBatch}!`);
    console.log('======================================================\n');
    return { applied: pending.length, batch: currentBatch };
  } finally {
    await conn.end();
  }
}

/**
 * Mostrar estado actual de las migraciones
 */
async function status() {
  console.log('\n======================================================');
  console.log('         ESTADO DE MIGRACIONES — SISTEMA WAYKA        ');
  console.log('======================================================');

  await initMigrationTable();
  const conn = await getDirectConnection(true);

  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const [rows] = await conn.query('SELECT name, batch, executed_at FROM `_migrations` ORDER BY id ASC;');
    const appliedMap = new Map(rows.map(r => [r.name, r]));

    console.log(`Total archivos: ${files.length}\n`);
    console.log('  Estado    | Batch | Archivo de Migración           | Fecha Ejecución');
    console.log(' -----------|-------|--------------------------------|----------------------');

    for (const file of files) {
      if (appliedMap.has(file)) {
        const info = appliedMap.get(file);
        const dateStr = new Date(info.executed_at).toISOString().replace('T', ' ').slice(0, 19);
        console.log(`  APLICADA  |   ${info.batch}   | ${file.padEnd(30)} | ${dateStr}`);
      } else {
        console.log(`  PENDIENTE |   -   | ${file.padEnd(30)} | -`);
      }
    }
    console.log('======================================================\n');
  } finally {
    await conn.end();
  }
}

/**
 * Resetear base de datos (Eliminar tablas y re-ejecutar migraciones)
 */
async function reset() {
  console.log('\n⚠️  RESETEANDO BASE DE DATOS WAYKA...');
  const conn = await getDirectConnection(true);
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    const [tables] = await conn.query('SHOW TABLES;');
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      await conn.query(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('🧹 Todas las tablas eliminadas.');
  } finally {
    await conn.end();
  }

  return await up();
}

// Ejecución directa desde CLI
if (require.main === module) {
  const command = process.argv[2] || 'up';
  
  (async () => {
    try {
      if (command === 'up') {
        await up();
      } else if (command === 'status') {
        await status();
      } else if (command === 'reset') {
        await reset();
      } else {
        console.error(`Comando desconocido: "${command}". Use "up", "status" o "reset".`);
        process.exitCode = 1;
      }
    } catch (err) {
      console.error('\n❌ Error:', err.message);
      process.exitCode = 1;
    }
  })();
}

module.exports = {
  up,
  status,
  reset
};
