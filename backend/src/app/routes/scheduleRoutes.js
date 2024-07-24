// backend/src/app/routes/scheduleRoutes.js
const express = require('express');
const { saveSchedule, getLastSchedule } = require('../controllers/scheduleController');
const router = express.Router();

// Ruta para guardar un schedule
router.post('/save-schedule', saveSchedule);

// Ruta para obtener el último schedule
router.get('/last-schedule', getLastSchedule);

module.exports = router;
