const { Router } = require('express');
const {
  listarUbicaciones,
  obtenerArbol
} = require('../controllers/ubicacionOrgController');
const authenticateToken = require('../middlewares/authMiddleware');

const router = Router();

router.use(authenticateToken);
router.get('/', listarUbicaciones);
router.get('/arbol', obtenerArbol);

module.exports = router;
