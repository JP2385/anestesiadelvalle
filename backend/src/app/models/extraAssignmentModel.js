const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema para asignaciones extras (fuera de asignaciones por defecto)
 * Se guarda una por semana, con todas las asignaciones extras de esa semana
 */
const extraAssignmentSchema = new Schema({
    weekStart: {
        type: Date,
        required: true,
        index: true
    },
    // Estructura: { workSiteId: { monday: userId, tuesday: userId, ... } }
    assignments: {
        type: Map,
        of: {
            monday: { type: Schema.Types.ObjectId, ref: 'User' },
            tuesday: { type: Schema.Types.ObjectId, ref: 'User' },
            wednesday: { type: Schema.Types.ObjectId, ref: 'User' },
            thursday: { type: Schema.Types.ObjectId, ref: 'User' },
            friday: { type: Schema.Types.ObjectId, ref: 'User' }
        },
        default: {}
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Índice compuesto para búsqueda rápida por semana
extraAssignmentSchema.index({ weekStart: 1 }, { unique: true });

const ExtraAssignment = mongoose.model('ExtraAssignment', extraAssignmentSchema);

module.exports = ExtraAssignment;
