const mongoose = require('mongoose');

// Definimos el esquema para la configuración de los selects
const selectConfigSchema = new mongoose.Schema({
    workSite: { type: String, required: true },
    disabled: { type: Boolean, required: true },
    className: { type: String, required: true } // Almacenamos la clase del select
}, { _id: false }); // No necesitamos _id en los subdocumentos

// Definimos el esquema para la información de disponibilidad por día
const availabilitySchema = new mongoose.Schema({
    sitesEnabled: { type: Number, required: true }, // Nro de lugares habilitados
    available: { type: Number, required: true }, // Nro. de Anestesiólogos disponibles
    assigned: { type: Number, required: true }, // Nro. de Anestesiólogos asignados
    unassigned: { type: String, required: true } // Anestesiólogos no asignados (texto o lista)
}, { _id: false });

// Definimos el esquema de los schedules
const scheduleSchema = new mongoose.Schema({
    timestamp: { type: String, required: true },
    assignments: { type: Object, required: true },
    dayHeaders: { type: Object, required: true },
    selectConfig: {
        monday: [selectConfigSchema],
        tuesday: [selectConfigSchema],
        wednesday: [selectConfigSchema],
        thursday: [selectConfigSchema],
        friday: [selectConfigSchema]
    }, // Configuración detallada para cada día de la semana
    longDaysCount: { type: Object, required: true }, // Recuento de días largos
    availabilityInform: {
        monday: { type: availabilitySchema, required: true },
        tuesday: { type: availabilitySchema, required: true },
        wednesday: { type: availabilitySchema, required: true },
        thursday: { type: availabilitySchema, required: true },
        friday: { type: availabilitySchema, required: true }
    }, // Información sobre disponibilidad por día
    createdAt: { type: Date, default: Date.now, expires: '1y' }, // Campo de expiración
    printedBy: { type: String, required: true },
    longDaysInform: { type: String, required: true }
});

// Creamos el modelo basado en el esquema
const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
