// notificationController.js

const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const { checkReceiverAlreadyHasPeriod, handleVacationSwap, removeDuplicateVacations } = require('./notificationControllerUtils');

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
    
            // Procesar múltiples períodos seleccionados
            const selectedPeriods = req.body.selectedPeriod.map(period => JSON.parse(period));
    
            // Verificar si el receiver ya tiene alguno de los períodos seleccionados
            const receiverAlreadyHasPeriod = checkReceiverAlreadyHasPeriod(receiver, selectedPeriods);
    
            if (receiverAlreadyHasPeriod) {
                return res.status(200).json({ message: 'Ya tienes alguno de estos períodos. La solicitud seguirá pendiente.' });
            }
    
            const periodsToRemoveSender = [];
            const periodsToRemoveReceiver = [];

            // Manejar el intercambio para cada período seleccionado
            for (const selectedPeriodObj of selectedPeriods) {
                const swapResult = handleVacationSwap(sender, receiver, selectedPeriodObj, notification);
    
                if (!swapResult.originalVacationSender || !swapResult.originalVacationReceiver) {
                    return res.status(404).json({ message: 'No se encontraron períodos válidos para el intercambio.' });
                }

                // Acumular los períodos originales para eliminarlos después
                periodsToRemoveSender.push(swapResult.originalVacationSender);
                periodsToRemoveReceiver.push(swapResult.originalVacationReceiver);

                // Después de cada intercambio, eliminar períodos duplicados
                sender.vacations = removeDuplicateVacations(sender.vacations);
                receiver.vacations = removeDuplicateVacations(receiver.vacations);
            }

            // Ahora eliminar los períodos originales después de todos los intercambios
            sender.vacations = sender.vacations.filter(vacation => !periodsToRemoveSender.includes(vacation));
            receiver.vacations = receiver.vacations.filter(vacation => !periodsToRemoveReceiver.includes(vacation));

    
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
                periodsToGive: selectedPeriods,  // Ahora se envían múltiples períodos
                status: 'accepted',
                isConfirmation: true
            });
    
            await acceptanceNotification.save();
    
            await Notification.updateMany(
                { _id: { $ne: notificationId }, sender: notification.sender, vacationPeriod: notification.vacationPeriod, status: 'pending' },
                { $set: { status: 'canceled', updatedAt: Date.now() } }
            );
    
            return res.status(200).json({ message: 'Intercambio realizado exitosamente.' });
        } else if (response === 'rejected') {
            const receiver = await User.findById(notification.receiver);
    
            if (!receiver) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }
    
            // Actualizar el estado de la notificación original a 'rejected'
            notification.status = 'rejected';
            notification.updatedAt = Date.now();
            await notification.save();
    
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
