const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Usuario que hace la solicitud
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Usuario que recibe la notificación
    message: { type: String, required: true },  // Mensaje de notificación
    vacationPeriod: {  // El período de vacaciones que se solicita
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true }
    },
    periodsToGive: [  // Los períodos de vacaciones que el usuario está dispuesto a ceder
        {
            startDate: { type: Date, required: true },
            endDate: { type: Date, required: true }
        }
    ],
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected', 'canceled', 'notified'],  // Incluimos 'notified' aquí
        default: 'pending' 
    },  // Estado de la solicitud
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
