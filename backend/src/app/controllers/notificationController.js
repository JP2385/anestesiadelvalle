// notificationController.js

const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const { checkReceiverAlreadyHasPeriod, handleVacationSwap } = require('./notificationControllerUtils');

// Obtener notificaciones de un usuario
const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const notifications = await Notification.find({ receiver: userId });
        res.json(notifications);
    } catch (error) {
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

        if (response === 'accepted') {
            const sender = await User.findById(notification.sender);
            const receiver = await User.findById(notification.receiver);

            if (!sender || !receiver) {
                return res.status(404).json({ message: 'Usuarios no encontrados.' });
            }

            const selectedPeriods = req.body.selectedPeriod.map(period => JSON.parse(period));

            // Verificar si el receiver ya tiene el período
            const receiverAlreadyHasPeriod = checkReceiverAlreadyHasPeriod(receiver, selectedPeriods);

            if (receiverAlreadyHasPeriod) {
                return res.status(200).json({ message: 'Ya tienes este período. La solicitud seguirá pendiente.' });
            }

            const selectedPeriodObj = JSON.parse(selectedPeriod);

            // Manejar el intercambio
            const swapResult = handleVacationSwap(sender, receiver, selectedPeriodObj, notification);

            if (swapResult.originalVacationSender && swapResult.originalVacationReceiver) {
                await sender.save();
                await receiver.save();

                notification.status = 'accepted';
                notification.updatedAt = Date.now();
                await notification.save();

                const acceptanceNotification = new Notification({
                    sender: notification.receiver,
                    receiver: notification.sender,
                    message: `Tu solicitud ha sido aceptada.`,
                    vacationPeriod: notification.vacationPeriod,
                    periodsToGive: [selectedPeriodObj],
                    status: 'accepted',
                    isConfirmation: true
                });

                await acceptanceNotification.save();

                await Notification.updateMany(
                    { _id: { $ne: notificationId }, sender: notification.sender, vacationPeriod: notification.vacationPeriod, status: 'pending' },
                    { $set: { status: 'canceled', updatedAt: Date.now() } }
                );

                return res.status(200).json({ message: 'Intercambio realizado exitosamente.' });
            } else {
                return res.status(404).json({ message: 'No se encontraron períodos válidos.' });
            }
        } else if (response === 'rejected') {
            const receiver = await User.findById(notification.receiver);
        
            if (!receiver) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }
        
            // Actualizar el estado de la notificación original a 'rejected'
            notification.status = 'rejected';
            notification.updatedAt = Date.now();
            await notification.save();  // Guarda la notificación con el estado actualizado
        
            // Crear una nueva notificación de rechazo para el sender original
            const rejectionNotification = new Notification({
                sender: notification.receiver,
                receiver: notification.sender,
                message: `Tu solicitud fue rechazada por ${receiver.username}.`,
                vacationPeriod: notification.vacationPeriod,
                periodsToGive: notification.periodsToGive,
                status: 'rejected',
                isConfirmation: true
            });
        
            await rejectionNotification.save();
        
            return res.status(200).json({ message: 'Solicitud rechazada.' });
        }
        
    } catch (error) {
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

        // Cambiar el estado a 'notified'
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
