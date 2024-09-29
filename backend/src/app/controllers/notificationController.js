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


const respondToNotification = async (req, res) => {
    const { notificationId, response, selectedPeriod } = req.body;  // Incluimos el período seleccionado

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

            // Parsear el período seleccionado
            const selectedPeriodObj = JSON.parse(selectedPeriod);

            // Dividir el período de vacaciones del sender, manejando superposición
            const updatedSenderVacations = [];

            sender.vacations.forEach(vacation => {
                const vacationStart = new Date(vacation.startDate);
                const vacationEnd = new Date(vacation.endDate);
                const periodStart = new Date(selectedPeriodObj.startDate);
                const periodEnd = new Date(selectedPeriodObj.endDate);

                // Caso 1: El período de vacaciones del sender abarca el período cedido
                if (vacationStart <= periodStart && vacationEnd >= periodEnd) {
                    // Mantener la parte antes del período cedido
                    if (vacationStart < periodStart) {
                        updatedSenderVacations.push({
                            startDate: vacationStart,
                            endDate: new Date(periodStart.setDate(periodStart.getDate() - 1))  // Un día antes del período cedido
                        });
                    }

                    // Mantener la parte después del período cedido
                    if (vacationEnd > periodEnd) {
                        updatedSenderVacations.push({
                            startDate: new Date(periodEnd.setDate(periodEnd.getDate() + 1)),  // Un día después del período cedido
                            endDate: vacationEnd
                        });
                    }
                } else {
                    // Caso 2: No hay superposición o el período no es parte del cedido, mantenerlo
                    updatedSenderVacations.push(vacation);
                }
            });

            // Actualizar las vacaciones del sender con las partes que no fueron cedidas
            sender.vacations = updatedSenderVacations;

            // Agregar el nuevo período adquirido a las vacaciones del sender
            sender.vacations.push(notification.vacationPeriod);  // Período que el sender obtiene (19/10/2024 al 27/10/2024)
            await sender.save();

            // Quitar el período cedido de las vacaciones del receiver
            receiver.vacations = receiver.vacations.filter(vacation => 
                !(vacation.startDate.toISOString() === notification.vacationPeriod.startDate.toISOString() &&
                  vacation.endDate.toISOString() === notification.vacationPeriod.endDate.toISOString())
            );

            // Agregar el período cedido a las vacaciones del receiver
            receiver.vacations.push(selectedPeriodObj);
            await receiver.save();

            // Crear una nueva notificación para el sender informándole que su intercambio fue aceptado
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