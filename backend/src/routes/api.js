const { Router } = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const personaRoutes = require('./personaRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const rolRoutes = require('./rolRoutes');
const usuarioRolRoutes = require('./usuarioRolRoutes');
const ubicacionOrgRoutes = require('./ubicacionOrgRoutes');

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
      auth: '/api/auth',
      personas: '/api/personas',
      usuarios: '/api/usuarios',
      roles: '/api/roles',
      usuarioRoles: '/api/usuario-roles',
      ubicaciones: '/api/ubicaciones'
    }
  });
});

// Registrar módulos
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/personas', personaRoutes);
apiRouter.use('/usuarios', usuarioRoutes);
apiRouter.use('/roles', rolRoutes);
apiRouter.use('/usuario-roles', usuarioRolRoutes);
apiRouter.use('/ubicaciones', ubicacionOrgRoutes);

module.exports = apiRouter;

