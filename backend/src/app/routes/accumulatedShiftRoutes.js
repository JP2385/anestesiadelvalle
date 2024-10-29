// routes/accumulatedShiftRoutes.js
const express = require('express');
const { getAccumulatedShifts, updateAccumulatedShifts } = require('../controllers/shiftAccumulatedController');
const router = express.Router();

// Ruta para obtener el acumulado de guardias
router.get('/', getAccumulatedShifts);

// Ruta para actualizar el acumulado de guardias
router.post('/', updateAccumulatedShifts);

module.exports = router;
