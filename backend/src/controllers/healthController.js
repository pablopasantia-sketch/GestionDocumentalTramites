const { testConnection } = require('../config/db');
const { success } = require('../utils/response');
const config = require('../config/env');

const startTime = Date.now();

async function getHealth(req, res) {
  const dbStatus = await testConnection();

  const healthData = {
    service: 'Wayka Backend API REST',
    status: dbStatus.connected ? 'HEALTHY' : 'DEGRADED',
    version: '1.0.0-sprint1',
    environment: config.env,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    database: {
      engine: 'MySQL Server 8.0+',
      host: config.db.host,
      port: config.db.port,
      name: config.db.database,
      connected: dbStatus.connected,
      version: dbStatus.version || null,
      serverTime: dbStatus.serverTime || null,
      message: dbStatus.message
    }
  };

  const statusCode = dbStatus.connected ? 200 : 503;
  return res.status(statusCode).json({
    success: dbStatus.connected,
    message: dbStatus.connected ? 'Servicios del sistema operativos' : 'API activa pero base de datos no disponible',
    data: healthData,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  getHealth
};
