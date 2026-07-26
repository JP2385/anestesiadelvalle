const mongoose = require('mongoose');

const participacionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    porcentaje: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    }
}, { _id: false });

const groupPeriodSchema = new mongoose.Schema({
    fechaInicio: {
        type: Date,
        required: true,
        unique: true
    },
    motivo: {
        type: String,
        required: true,
        trim: true
    },
    participaciones: {
        type: [participacionSchema],
        required: true
    },
    creadoEn: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('GroupPeriod', groupPeriodSchema);
