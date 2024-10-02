const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const {
    findFullVacationPeriod,
    calculateVacationDuration,
    createAcceptanceNotification,
    createRejectionNotification
} = require('./notificationControllerUtils');

// Obtener notificaciones de un usuario
const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log('Buscando notificaciones para el usuario:', userId);

        const notifications = await Notification.find({ receiver: userId });
        res.json(notifications);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ message: 'Error al obtener notificaciones' });
    }
};

// Responder a una notificación (aceptar o rechazar)
const respondToNotification = async (req, res) => {
    const { notificationId, response, selectedPeriod } = req.body;

    try {
        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({ message: 'Notificación no encontrada.' });
        }

        notification.status = response === 'accepted' ? 'accepted' : 'rejected';
        notification.updatedAt = Date.now();
        await notification.save();

        if (response === 'accepted') {
            const sender = await User.findById(notification.sender);
            const receiver = await User.findById(notification.receiver);

            if (!sender || !receiver) {
                return res.status(404).json({ message: 'Usuarios no encontrados.' });
            }

            const selectedPeriodObj = JSON.parse(selectedPeriod);
            const cedidoStart = new Date(selectedPeriodObj.startDate);
            const cedidoEnd = new Date(selectedPeriodObj.endDate);

            const originalVacationSender = findFullVacationPeriod(sender, cedidoStart, cedidoEnd);
            const originalVacationReceiver = findFullVacationPeriod(receiver, 
                new Date(notification.vacationPeriod.startDate), 
                new Date(notification.vacationPeriod.endDate)
            );

            if (originalVacationSender && originalVacationReceiver) {
                const originalDurationSender = calculateVacationDuration(
                    new Date(originalVacationSender.startDate),
                    new Date(originalVacationSender.endDate)
                );
                const originalDurationReceiver = calculateVacationDuration(
                    new Date(originalVacationReceiver.startDate),
                    new Date(originalVacationReceiver.endDate)
                );
                const cedidoDuration = calculateVacationDuration(cedidoStart, cedidoEnd);

                // Lógica de intercambio...

                await sender.save();
                await receiver.save();

                await createAcceptanceNotification(notification.sender, notification.receiver, selectedPeriodObj, notification.vacationPeriod);

                await Notification.updateMany(
                    { _id: { $ne: notificationId }, sender: notification.sender, vacationPeriod: notification.vacationPeriod, status: 'pending' },
                    { $set: { status: 'canceled', updatedAt: Date.now() } }
                );

                return res.status(200).json({ message: 'Intercambio realizado exitosamente.' });
            } else {
                return res.status(404).json({ message: 'No se encontraron períodos de vacaciones válidos para el intercambio.' });
            }
        } else if (response === 'rejected') {
            const receiver = await User.findById(notification.receiver);
            if (!receiver) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }

            await createRejectionNotification(notification.sender, notification.receiver, notification.vacationPeriod, notification.periodsToGive);

            return res.status(200).json({ message: 'Solicitud rechazada y notificación creada.' });
        } else {
            return res.status(200).json({ message: `Solicitud de intercambio ${response}.` });
        }
    } catch (error) {
        console.error('Error al responder a la notificación:', error);
        res.status(500).json({ message: 'Error al responder a la notificación.' });
    }
};

// Función para cambiar el estado de la notificación a 'notified'
const markAsNotified = async (req, res) => {
    const { notificationId } = req.body;

    try {
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ message: 'Notificación no encontrada.' });
        }

        notification.status = 'notified';
        notification.updatedAt = Date.now();
        await notification.save();

        res.status(200).json({ message: 'Notificación marcada como vista.' });
    } catch (error) {
        console.error('Error al marcar notificación como vista:', error);
        res.status(500).json({ message: 'Error al marcar notificación como vista.' });
    }
};

module.exports = { getNotifications, respondToNotification, markAsNotified };
