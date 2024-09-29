const express = require('express');
const { requestVacationSwap } = require('../controllers/vacationSwapController');
const router = express.Router();

// Ruta para solicitar intercambio de vacaciones
router.post('/request-swap', requestVacationSwap);

module.exports = router;
