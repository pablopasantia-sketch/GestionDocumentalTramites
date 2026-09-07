const { Router } = require('express');
const {
  listarUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  resetPassword,
  eliminarUsuario
} = require('../controllers/usuarioController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN_SISTEMA'));

router.get('/', listarUsuarios);
router.get('/:id', obtenerUsuarioPorId);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.post('/:id/reset-password', resetPassword);
router.delete('/:id', eliminarUsuario);

module.exports = router;
