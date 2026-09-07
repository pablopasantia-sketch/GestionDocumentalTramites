const { Router } = require('express');
const {
  listarAsignaciones,
  obtenerRolesPorUsuario,
  asignarRol,
  actualizarAsignacion,
  marcarPrincipal,
  eliminarAsignacion
} = require('../controllers/usuarioRolController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN_SISTEMA'));

router.get('/', listarAsignaciones);
router.get('/usuario/:usuarioId', obtenerRolesPorUsuario);
router.post('/', asignarRol);
router.put('/:id', actualizarAsignacion);
router.patch('/:id/principal', marcarPrincipal);
router.delete('/:id', eliminarAsignacion);

module.exports = router;
