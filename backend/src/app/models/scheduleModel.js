const mongoose = require('mongoose');

// Definimos el esquema de los schedules
const scheduleSchema = new mongoose.Schema({
    timestamp: { type: String, required: true },
    assignments: { type: Object, required: true },
    dayHeaders: { type: Object, required: true },
    selectConfig: { type: Object, required: true }, // Nueva configuración para los selects
    longDaysCount: { type: Object, required: true }, // Agregamos el recuento de días largos
    createdAt: { type: Date, default: Date.now, expires: '7d' }, // Campo de expiración
    printedBy: { type: String, required: true },
    longDaysInform: {type: String, required: true}
});

// Creamos el modelo basado en el esquema
const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
