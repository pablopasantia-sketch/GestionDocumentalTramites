const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config/env');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares de seguridad y utilidad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Servir archivos estáticos subidos (adjuntos / PDFs)
app.use('/uploads', express.static(config.upload.dir));

// Rutas de la API
app.use('/api', apiRoutes);

// Ruta raíz del servidor
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor Backend de Wayka en funcionamiento',
    documentation: '/api',
    healthCheck: '/api/health'
  });
});

// Middleware para rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada en este servidor`
  });
});

// Middleware global de manejo de errores
app.use(errorHandler);

module.exports = app;
