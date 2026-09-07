const { Router } = require('express');
const { login, getProfile, changePassword, switchRole } = require('../controllers/authController');
const authenticateToken = require('../middlewares/authMiddleware');

const router = Router();

// Rutas públicas
router.post('/login', login);

// Rutas protegidas (requieren JWT)
router.get('/profile', authenticateToken, getProfile);
router.post('/change-password', authenticateToken, changePassword);
router.post('/switch-role', authenticateToken, switchRole);

module.exports = router;
