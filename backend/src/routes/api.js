const { Router } = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');

const apiRouter = Router();

// Endpoint de información base de la API
apiRouter.get('/', (req, res) => {
  res.json({
    name: 'Wayka Document & Workflow Management API',
    version: '1.0.0-sprint1',
    description: 'API REST para el Sistema Wayka MVP',
    status: 'online',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth'
    }
  });
});

// Registrar módulos
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);

module.exports = apiRouter;
