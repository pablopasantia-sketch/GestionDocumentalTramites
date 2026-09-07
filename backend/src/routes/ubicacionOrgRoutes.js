const { Router } = require('express');
const {
  listarUbicaciones,
  obtenerArbol,
  obtenerUbicacion,
  crearUbicacion,
  actualizarUbicacion,
  eliminarUbicacion
} = require('../controllers/ubicacionOrgController');
const authenticateToken = require('../middlewares/authMiddleware');

const router = Router();

router.use(authenticateToken);

// GET  /api/ubicaciones          — Listar todas con filtro de activo
// GET  /api/ubicaciones/arbol    — Árbol jerárquico completo
// GET  /api/ubicaciones/:id      — Detalle de una ubicación
// POST /api/ubicaciones          — Crear nueva ubicación
// PUT  /api/ubicaciones/:id      — Actualizar ubicación
// DELETE /api/ubicaciones/:id    — Baja lógica

router.get('/arbol', obtenerArbol);           // Debe ir ANTES de /:id
router.get('/', listarUbicaciones);
router.get('/:id', obtenerUbicacion);
router.post('/', crearUbicacion);
router.put('/:id', actualizarUbicacion);
router.delete('/:id', eliminarUbicacion);

module.exports = router;
