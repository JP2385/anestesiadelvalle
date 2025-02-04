const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');

// Ruta para obtener todos los feriados
router.get('/', holidayController.getHolidays);

// Ruta para crear un nuevo feriado
router.post('/', holidayController.createHoliday);

// Ruta para actualizar un feriado por ID
router.put('/:id', holidayController.updateHoliday);

// Ruta para eliminar un feriado por ID
router.delete('/:id', holidayController.deleteHoliday);

module.exports = router;
