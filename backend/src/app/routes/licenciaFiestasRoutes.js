const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorization');
const {
    getAsignaciones,
    guardarAsignaciones
} = require('../controllers/licenciaFiestasController');

router.get('/', authMiddleware, requireAdmin, getAsignaciones);
router.post('/', authMiddleware, requireAdmin, guardarAsignaciones);

module.exports = router;
