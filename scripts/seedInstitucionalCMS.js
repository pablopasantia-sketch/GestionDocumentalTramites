#!/usr/bin/env node
/**
 * =============================================================================
 * Ejecutor de Seed Institucional CMS: Concejo Municipal de Sucre
 * Base de Datos: DB_TRAMITES_EXTERNOS
 * 
 * Invoca el script SQL idempotente scripts/seedInstitucionalCMS.sql mediante:
 * 1. Docker SQL Server container (gestion_documental_mssql) con sqlcmd, o
 * 2. Fallback a dotnet CLI (DatabaseManager.SeedInstitucionalCMSAsync)
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const SQL_FILE_PATH = path.resolve(__dirname, 'seedInstitucionalCMS.sql');
const DOCKER_CONTAINER = 'gestion_documental_mssql';
const DB_NAME = 'DB_TRAMITES_EXTERNOS';
const DB_USER = 'sa';
const DB_PASS = 'SqlAdminSucre2026!';

console.log('=============================================================================');
console.log('🏛️  INICIANDO EJECUCIÓN DE SEED INSTITUCIONAL CMS');
console.log('=============================================================================');

if (!fs.existsSync(SQL_FILE_PATH)) {
  console.error(`❌ Error: No se encontró el archivo SQL en: ${SQL_FILE_PATH}`);
  process.exit(1);
}

function isDockerContainerRunning(containerName) {
  try {
    const output = execSync(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`, { encoding: 'utf-8' });
    return output.trim().includes(containerName);
  } catch (err) {
    return false;
  }
}

function runViaDocker() {
  return new Promise((resolve, reject) => {
    console.log(`🐳 Ejecutando seed mediante contenedor Docker '${DOCKER_CONTAINER}'...`);
    
    const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf-8');
    const child = spawn(
      'docker',
      [
        'exec',
        '-i',
        DOCKER_CONTAINER,
        '/opt/mssql-tools18/bin/sqlcmd',
        '-S', 'localhost',
        '-U', DB_USER,
        '-P', DB_PASS,
        '-C',
        '-d', DB_NAME
      ],
      { stdio: ['pipe', 'inherit', 'inherit'] }
    );

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`docker sqlcmd terminó con código de salida ${code}`));
      }
    });

    child.stdin.write(sqlContent);
    child.stdin.end();
  });
}

function runViaDotnet() {
  return new Promise((resolve, reject) => {
    console.log('⚙️  Ejecutando seed mediante ASP.NET Core CLI (dotnet run)...');
    
    // Buscar carpeta backend-dotnet
    const projectDir = path.resolve(__dirname, '..', 'backend-dotnet', 'GestionDocumental.Api');
    const child = spawn('dotnet', ['run', '--project', projectDir, '--', 'db:seed:institucional'], {
      stdio: 'inherit'
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`dotnet run terminó con código de salida ${code}`));
      }
    });
  });
}

async function main() {
  try {
    if (isDockerContainerRunning(DOCKER_CONTAINER)) {
      await runViaDocker();
    } else {
      console.log(`⚠️  Contenedor '${DOCKER_CONTAINER}' no detectado activo. Intentando mediante .NET...`);
      await runViaDotnet();
    }
    console.log('\n✨ ¡Proceso de Seed Institucional CMS finalizado exitosamente!\n');
    process.exit(0);
  } catch (dockerErr) {
    console.warn(`⚠️  Fallo en ejecución vía Docker (${dockerErr.message}). Probando vía .NET...`);
    try {
      await runViaDotnet();
      console.log('\n✨ ¡Proceso de Seed Institucional CMS finalizado exitosamente vía .NET!\n');
      process.exit(0);
    } catch (dotnetErr) {
      console.error('\n❌ Error ejecutando seed institucional en ambos métodos:');
      console.error(`- Docker: ${dockerErr.message}`);
      console.error(`- .NET:   ${dotnetErr.message}`);
      process.exit(1);
    }
  }
}

main();
