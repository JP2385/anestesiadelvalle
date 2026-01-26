const mongoose = require('mongoose');

// Esquema simplificado para un assignment individual
const assignmentSchema = new mongoose.Schema({
    workSiteId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkSite', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null }, // Puede ser null para selects enabled vacíos
    regime: { type: String, enum: ['matutino', 'vespertino', 'largo'], required: true }
}, { _id: false });

// Esquema para los assignments por día
const dailyAssignmentsSchema = new mongoose.Schema({
    monday: [assignmentSchema],
    tuesday: [assignmentSchema],
    wednesday: [assignmentSchema],
    thursday: [assignmentSchema],
    friday: [assignmentSchema]
}, { _id: false });

// Definimos el esquema de los schedules (OPTIMIZADO)
const scheduleSchema = new mongoose.Schema({
    // Información de la semana
    weekStart: { type: Date, required: true }, // Sábado de inicio
    weekEnd: { type: Date, required: true },   // Viernes de fin

    // Asignaciones (SIMPLIFICADO - solo IDs)
    assignments: { type: dailyAssignmentsSchema, required: true },

    // Estado de Mortal Kombat (tiene sentido guardarlo)
    mortalCombat: {
        globalMode: { type: Boolean, default: false },
        dailyModes: {
            monday: { type: Boolean, default: false },
            tuesday: { type: Boolean, default: false },
            wednesday: { type: Boolean, default: false },
            thursday: { type: Boolean, default: false },
            friday: { type: Boolean, default: false }
        }
    },

    // Conteo de días largos por usuario (para reportes históricos)
    longDaysCount: {
        type: Map,
        of: {
            count: { type: Number, required: true }
        },
        default: {}
    },

    // Informe textual del esquema de programación
    longDaysInform: {
        type: String,
        required: false
    },

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true, // Mongoose maneja createdAt y updatedAt automáticamente
    expires: '1y' // Expira después de 1 año
});

// Índice para buscar schedules por semana de manera eficiente
scheduleSchema.index({ weekStart: 1, weekEnd: 1 });

// Creamos el modelo basado en el esquema
const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
