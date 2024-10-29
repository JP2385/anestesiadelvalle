const express = require('express');
const { saveShiftSchedule, getLastShiftSchedule } = require('../controllers/shiftScheduleController');
const router = express.Router();

// Ruta para guardar o actualizar el horario del mes actual
router.post('/save-shift-schedule', saveShiftSchedule);

// Ruta para obtener el último horario
router.get('/last-shift-schedule', getLastShiftSchedule);

module.exports = router;
