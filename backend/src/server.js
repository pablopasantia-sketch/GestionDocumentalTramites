const app = require('./app');
const config = require('./config/env');
const { testConnection } = require('./config/db');

async function startServer() {
  console.log('====================================================');
  console.log('       SISTEMA WAYKA MVP - SERVIDOR BACKEND         ');
  console.log('====================================================');
  
  const server = app.listen(config.port, async () => {
    console.log(`🚀 Servidor ejecutándose en el puerto: ${config.port}`);
    console.log(`🌐 URL Base API: http://localhost:${config.port}/api`);
    console.log(`🩺 Health check: http://localhost:${config.port}/api/health`);
    console.log(`📁 Directorio de uploads: ${config.upload.dir}`);
    console.log('----------------------------------------------------');
    
    // Probar conexión a la Base de Datos MySQL 8.0
    console.log('🔍 Verificando conexión a la Base de Datos MySQL 8.0...');
    const dbStatus = await testConnection();
    if (dbStatus.connected) {
      console.log(`✅ Base de datos conectada: ${dbStatus.database} (MySQL ${dbStatus.version})`);
    } else {
      console.log(`⚠️  Base de datos MySQL no disponible: ${dbStatus.message}`);
      console.log('💡 Sugerencia: Inicia el servicio MySQL y ejecuta: npm run db:init');
    }
    console.log('====================================================');
  });

  // Manejo de apagado elegante
  const shutdown = () => {
    console.log('\n🛑 Cerrando servidor Wayka...');
    server.close(() => {
      console.log('✅ Servidor cerrado.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
