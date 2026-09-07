const { Router } = require('express');
const {
  listarPersonas,
  obtenerPersonaPorId,
  crearPersona,
  actualizarPersona,
  eliminarPersona
} = require('../controllers/personaController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

const router = Router();

// Todas las operaciones de personas requieren autenticación y rol de Administración
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN_SISTEMA'));

router.get('/', listarPersonas);
router.get('/:id', obtenerPersonaPorId);
router.post('/', crearPersona);
router.put('/:id', actualizarPersona);
router.delete('/:id', eliminarPersona);

module.exports = router;
