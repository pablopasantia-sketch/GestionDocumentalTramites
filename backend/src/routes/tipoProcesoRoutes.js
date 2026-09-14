const { Router } = require('express');
const { listar, obtenerPorId, crear, actualizar, eliminar } = require('../controllers/tipoProcesoController');
const authenticateToken = require('../middlewares/authMiddleware');

const router = Router();

// Rutas protegidas (Admin Wayka)
router.get('/', authenticateToken, listar);
router.get('/:id', authenticateToken, obtenerPorId);
router.post('/', authenticateToken, crear);
router.put('/:id', authenticateToken, actualizar);
router.delete('/:id', authenticateToken, eliminar);

module.exports = router;
