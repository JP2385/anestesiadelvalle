const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    province: {
        type: String,
        required: true,
        enum: ['Neuquén', 'Río Negro']
    },
    sector: {
        type: String,
        required: true,
        enum: ['Sector Público', 'Sector Privado']
    },
    hasShifts: {
        type: Boolean,
        default: false
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
institutionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Institution', institutionSchema);
