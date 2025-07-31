const express = require('express');
const router = express.Router();
const { getAllMonthlySchedules, saveShiftSchedule, getShiftScheduleByMonth } = require('../controllers/shiftScheduleController');
const shiftScheduleController = require('../controllers/shiftScheduleController');

// ✅ Ruta para acumulado total (debe ir antes de la ruta dinámica)
router.get('/accumulated-counts', shiftScheduleController.getTotalAccumulatedShiftCounts);

// Ruta para obtener todos los horarios mensuales
router.get('/all-monthly-schedules', getAllMonthlySchedules);

// Ruta para guardar o actualizar el horario del mes actual
router.post('/save-shift-schedule', saveShiftSchedule);

// Ruta para obtener el horario de un mes específico (DEBE IR AL FINAL)
router.get('/:yearMonth', getShiftScheduleByMonth);

router.post('/send-schedule-email', shiftScheduleController.sendScheduleEmail);

module.exports = router;
