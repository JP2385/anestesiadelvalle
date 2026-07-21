const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: { type: String, enum: ['vacation-swap', 'birthday'], default: 'vacation-swap' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Usuario que hace la solicitud
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Usuario que recibe la notificación
    message: { type: String, required: true },  // Mensaje de notificación
    vacationPeriod: {  // El período de vacaciones que se solicita
        startDate: { type: Date },
        endDate: { type: Date }
    },
    periodsToGive: [  // Los períodos de vacaciones que el usuario está dispuesto a ceder
        {
            startDate: { type: Date },
            endDate: { type: Date }
        }
    ],
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'canceled', 'notified'],  // Incluimos 'notified' aquí
        default: 'pending'
    },  // Estado de la solicitud
    isConfirmation: { type: Boolean, default: false },  // Campo para distinguir entre tipos de notificación
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
