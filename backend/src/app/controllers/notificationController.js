const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

// Obtener notificaciones de un usuario
const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log('Buscando notificaciones para el usuario:', userId);

        // Buscar notificaciones donde el `receiver` sea el ID del usuario autenticado
        const notifications = await Notification.find({ receiver: userId });

        if (notifications.length === 0) {
            console.log('No se encontraron notificaciones para este usuario.');
        } else {
            console.log(`Notificaciones encontradas (${notifications.length}):`, notifications);
        }

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

        // Actualizar el estado de la notificación
        notification.status = response === 'accepted' ? 'accepted' : 'rejected';
        notification.updatedAt = Date.now();
        await notification.save();

        if (response === 'accepted') {
            // Obtener los usuarios involucrados
            const sender = await User.findById(notification.sender);
            const receiver = await User.findById(notification.receiver);

            if (!sender || !receiver) {
                return res.status(404).json({ message: 'Usuarios no encontrados.' });
            }

            const selectedPeriodObj = JSON.parse(selectedPeriod);

            // Convertir las fechas del período cedido y del período original en objetos Date
            const cedidoStart = new Date(selectedPeriodObj.startDate);
            const cedidoEnd = new Date(selectedPeriodObj.endDate);

            // Buscar el período completo de vacaciones que incluye las fechas a ceder
            const originalVacation = sender.vacations.find(vacation => 
                new Date(vacation.startDate).getTime() <= cedidoStart.getTime() &&
                new Date(vacation.endDate).getTime() >= cedidoEnd.getTime()
            );

            if (originalVacation) {
                // Eliminar el período completo de vacaciones del sender
                sender.vacations = sender.vacations.filter(vacation => 
                    vacation.startDate.toISOString() !== originalVacation.startDate.toISOString() ||
                    vacation.endDate.toISOString() !== originalVacation.endDate.toISOString()
                );

                const originalStart = new Date(originalVacation.startDate);
                const originalEnd = new Date(originalVacation.endDate);

                let remainingStart = null;
                let remainingEnd = null;

                 // Caso 1: Cedido al inicio del período original
                if (cedidoStart.getTime() === originalStart.getTime()) {
                    remainingStart = new Date(cedidoEnd);
                    remainingStart.setDate(remainingStart.getDate() - 1);  // Comienza el día anterior al período cedido
                    remainingEnd = originalEnd;

                    
                } else if (cedidoEnd.getTime() === originalEnd.getTime()) { 
                    // Caso 2: Cedido al final del período original
                    remainingStart = originalStart;
                    remainingEnd = new Date(cedidoStart);
                    remainingEnd.setDate(remainingEnd.getDate() +1);  // Termina un día después al período cedido

                }


                // Si tenemos un período restante válido, lo agregamos a las vacaciones del sender
                if (remainingStart && remainingEnd && remainingStart.getTime() <= remainingEnd.getTime()) {
                    console.log(`Agregando el período restante al sender: ${remainingStart.toISOString()} a ${remainingEnd.toISOString()}`);
                    sender.vacations.push({
                        startDate: remainingStart,
                        endDate: remainingEnd
                    });
                } else {
                    console.log("No se encontró un período restante para agregar.");
                }
            }

            // Agregar el período solicitado a las vacaciones del sender
            sender.vacations.push(notification.vacationPeriod);
            await sender.save();

            // Quitar el período solicitado de las vacaciones del receptor
            receiver.vacations = receiver.vacations.filter(vacation => 
                !(vacation.startDate.toISOString() === notification.vacationPeriod.startDate.toISOString() &&
                  vacation.endDate.toISOString() === notification.vacationPeriod.endDate.toISOString())
            );

            // Agregar el período cedido a las vacaciones del receptor
            receiver.vacations.push(selectedPeriodObj);
            await receiver.save();

            // Crear una nueva notificación para el `sender` informándole que su intercambio fue aceptado
            const acceptanceNotification = new Notification({
                sender: notification.receiver,  // El que acepta
                receiver: notification.sender,  // El que solicitó el intercambio
                message: `Tu solicitud de intercambio de vacaciones ha sido aceptada por ${receiver.username}. 
                          Has cedido el período de vacaciones del ${selectedPeriodObj.startDate} al ${selectedPeriodObj.endDate}, 
                          y a cambio ahora tendrás vacaciones del ${notification.vacationPeriod.startDate} al ${notification.vacationPeriod.endDate}.`,
                vacationPeriod: notification.vacationPeriod,  // El nuevo período de vacaciones para el sender
                periodsToGive: [selectedPeriodObj],  // El período que cedió el sender
                status: 'accepted'  // Estado inicial como aceptada
            });
            await acceptanceNotification.save();

            // Actualizar otras notificaciones vinculadas al mismo intercambio
            await Notification.updateMany(
                {
                    _id: { $ne: notificationId },  // Excluir la notificación actual
                    sender: notification.sender,
                    vacationPeriod: notification.vacationPeriod,
                    status: 'pending'  // Solo actualizar notificaciones pendientes
                },
                { $set: { status: 'canceled', updatedAt: Date.now() } }  // Marcar como canceladas
            );

            return res.status(200).json({ message: 'Intercambio realizado exitosamente.' });
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