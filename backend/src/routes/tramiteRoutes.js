const { Router } = require('express');
const { consultaPublica, listar, obtenerEstadisticas, anular } = require('../controllers/tramiteController');
const authenticateToken = require('../middlewares/authMiddleware');

const router = Router();

// Ruta pública de seguimiento ciudadano (RF-09.1 - sin login)
router.get('/public/consulta', consultaPublica);

// Rutas protegidas
router.get('/', authenticateToken, listar);
router.get('/stats', authenticateToken, obtenerEstadisticas);
router.post('/:id/anular', authenticateToken, anular);

module.exports = router;
