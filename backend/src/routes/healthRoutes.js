const { Router } = require('express');
const { getHealth } = require('../controllers/healthController');

const router = Router();

// Endpoint público para chequear salud de API y Base de Datos MySQL 8.0
router.get('/', getHealth);

module.exports = router;
