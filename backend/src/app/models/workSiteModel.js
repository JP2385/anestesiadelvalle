const mongoose = require('mongoose');

const workSiteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    abbreviation: {
        type: String,
        required: true,
        trim: true,
        maxlength: 11
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    // Regímenes horarios disponibles con configuración semanal para cada uno
    scheduleTypes: {
        matutino: {
            enabled: {
                type: Boolean,
                default: true
            },
            weeklySchedule: {
                monday: { type: Boolean, default: true },
                tuesday: { type: Boolean, default: true },
                wednesday: { type: Boolean, default: true },
                thursday: { type: Boolean, default: true },
                friday: { type: Boolean, default: true }
            }
        },
        vespertino: {
            enabled: {
                type: Boolean,
                default: true
            },
            weeklySchedule: {
                monday: { type: Boolean, default: true },
                tuesday: { type: Boolean, default: true },
                wednesday: { type: Boolean, default: true },
                thursday: { type: Boolean, default: true },
                friday: { type: Boolean, default: true }
            }
        },
        largo: {
            enabled: {
                type: Boolean,
                default: true
            },
            weeklySchedule: {
                monday: { type: Boolean, default: true },
                tuesday: { type: Boolean, default: true },
                wednesday: { type: Boolean, default: true },
                thursday: { type: Boolean, default: true },
                friday: { type: Boolean, default: true }
            }
        }
    },
    // Características especiales
    specialties: {
        isCardio: {
            type: Boolean,
            default: false
        },
        isPediatrics: {
            type: Boolean,
            default: false
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Actualizar updatedAt antes de guardar
workSiteSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Índice compuesto único: el nombre debe ser único solo dentro de cada institución
workSiteSchema.index({ name: 1, institution: 1 }, { unique: true });

module.exports = mongoose.model('WorkSite', workSiteSchema);
