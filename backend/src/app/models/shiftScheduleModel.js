const mongoose = require('mongoose');

// Esquema para las asignaciones de turnos por usuario y día
const userShiftSchema = new mongoose.Schema({
    day: { type: String, required: true },
    assignment: { type: String, required: true },
    isDisabled: { type: Boolean, required: true }
}, { _id: false });

const userScheduleSchema = new mongoose.Schema({
    username: { type: String, required: true },
    shifts: [userShiftSchema]  // Array de turnos para cada día
}, { _id: false });


// Definir el esquema de conteo de guardias
const shiftCountSchema = new mongoose.Schema({
    weekdayShifts: { type: Number, required: true, default: 0 },
    weekendShifts: { type: Number, required: true, default: 0 },
    saturdayShifts: { type: Number, required: true, default: 0 }
}, { _id: false });


// Definir el esquema de configuración de selects
const selectConfigSchema = new mongoose.Schema({
    day: { type: String, required: true },
    username: { type: String, required: true },
    assignment: { type: String, required: true },
    isDisabled: { type: Boolean, required: true }
}, { _id: false });

const shiftScheduleSchema = new mongoose.Schema({
    month: { type: String, required: true },                // Ej: '2024-10' para año-mes
    shiftSchedule: [userScheduleSchema],                    // Guardias asignadas
    shiftCounts: [shiftCountSchema],                        // Conteo de guardias
    selectConfig: [selectConfigSchema],                     // Configuración de selects
    printedBy: { type: String, required: true },            // Usuario que imprimió el horario
    createdAt: { type: Date, default: Date.now }            // Fecha de creación
});

// Crear el modelo basado en el esquema
const ShiftSchedule = mongoose.model('ShiftSchedule', shiftScheduleSchema);

module.exports = ShiftSchedule;
