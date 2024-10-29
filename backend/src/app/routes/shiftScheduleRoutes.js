// routes/shiftScheduleRoutes.js
const express = require('express');
const { saveShiftSchedule, getLastShiftSchedule, getShiftScheduleByMonth } = require('../controllers/shiftScheduleController');
const router = express.Router();

// Ruta para guardar o actualizar el horario del mes actual
router.post('/save-shift-schedule', saveShiftSchedule);

// Ruta para obtener el último horario
router.get('/last-shift-schedule', getLastShiftSchedule);

// Ruta para obtener un horario específico por mes y año
router.get('/:yearMonth', getShiftScheduleByMonth); // Ruta correcta para yearMonth

module.exports = router;
