const express = require('express');
const { getAllMonthlySchedules, saveShiftSchedule, getShiftScheduleByMonth } = require('../controllers/shiftScheduleController');
const router = express.Router();

// Ruta para obtener todos los horarios mensuales
router.get('/all-monthly-schedules', getAllMonthlySchedules); // Definir esta ruta estática primero

// Ruta para guardar o actualizar el horario del mes actual
router.post('/save-shift-schedule', saveShiftSchedule);

// Ruta para obtener el horario de un mes específico
router.get('/:yearMonth', getShiftScheduleByMonth); // Definir esta ruta después

module.exports = router;
