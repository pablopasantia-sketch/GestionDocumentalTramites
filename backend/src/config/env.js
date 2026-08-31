const dotenv = require('dotenv');
const path = require('path');

// Cargar .env desde la raíz del backend
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wayka_db',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4'
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'wayka_jwt_secret_default_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'wayka_refresh_secret_key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  upload: {
    dir: path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'),
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

module.exports = config;
