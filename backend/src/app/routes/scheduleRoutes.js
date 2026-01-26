// backend/src/app/routes/scheduleRoutes.js
const express = require('express');
const { saveSchedule, getLastSchedule, getLastScheduleOfEachWeek } = require('../controllers/scheduleController');
const router = express.Router();

// Ruta para guardar un schedule
router.post('/save-schedule', saveSchedule);

// Ruta para obtener el último schedule
router.get('/last-schedule', getLastSchedule);

// Nueva ruta para obtener el último schedule de cada semana
router.get('/last-schedule-of-each-week', getLastScheduleOfEachWeek);

module.exports = router;
