const { Router } = require('express');
const {
  listarRoles,
  obtenerRolPorId,
  crearRol,
  actualizarRol,
  eliminarRol
} = require('../controllers/rolController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

const router = Router();

router.use(authenticateToken);
// La lectura puede permitirse a ADMIN_SISTEMA y ADMIN_WAYKA, la escritura a ADMIN_SISTEMA
router.get('/', authorizeRoles('ADMIN_SISTEMA', 'ADMIN_WAYKA'), listarRoles);
router.get('/:id', authorizeRoles('ADMIN_SISTEMA', 'ADMIN_WAYKA'), obtenerRolPorId);

router.post('/', authorizeRoles('ADMIN_SISTEMA'), crearRol);
router.put('/:id', authorizeRoles('ADMIN_SISTEMA'), actualizarRol);
router.delete('/:id', authorizeRoles('ADMIN_SISTEMA'), eliminarRol);

module.exports = router;
