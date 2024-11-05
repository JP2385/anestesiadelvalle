// models/holidayModel.js
const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    }
}, {
    timestamps: true // Crea campos `createdAt` y `updatedAt` automáticamente
});

module.exports = mongoose.model('Holiday', holidaySchema);
