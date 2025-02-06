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
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Referencia a la colección de usuarios
    }]
}, {
    timestamps: true // Crea campos `createdAt` y `updatedAt` automáticamente
});

module.exports = mongoose.model('Holiday', holidaySchema);
