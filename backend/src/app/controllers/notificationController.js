const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

// Obtener notificaciones de un usuario
const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log('Buscando notificaciones para el usuario:', userId);

        // Buscar notificaciones donde el `receiver` sea el ID del usuario autenticado
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
    
            // Si la respuesta es 'accepted'
            if (response === 'accepted') {
                // Obtener los usuarios involucrados
                const sender = await User.findById(notification.sender);
                const receiver = await User.findById(notification.receiver);
    
                if (!sender || !receiver) {
                    return res.status(404).json({ message: 'Usuarios no encontrados.' });
                }
    
                console.log('req.body.selectedPeriods:', req.body.selectedPeriod);
                // Obtener los períodos seleccionados por el usuario desde la solicitud
                const selectedPeriods = req.body.selectedPeriod.map(period => JSON.parse(period));
    
                // Verificar si el receiver ya tiene alguno de los períodos seleccionados
                const receiverAlreadyHasPeriod = selectedPeriods.some(selectedPeriod => {
                    const selectedStart = new Date(selectedPeriod.startDate).getTime();
                    const selectedEnd = new Date(selectedPeriod.endDate).getTime();
    
                    return receiver.vacations.some(vacation => {
                        const receiverStart = new Date(vacation.startDate).getTime();
                        const receiverEnd = new Date(vacation.endDate).getTime();
    
                        // Agregar logs para ver las fechas que se están comparando
                        console.log('Comparando período de vacaciones del receiver:', { 
                            receiverStart: new Date(vacation.startDate), 
                            receiverEnd: new Date(vacation.endDate) 
                        });
                        console.log('Comparando con el período seleccionado:', { 
                            selectedStart: new Date(selectedPeriod.startDate), 
                            selectedEnd: new Date(selectedPeriod.endDate) 
                        });
    
                        return receiverStart <= selectedStart && receiverEnd >= selectedEnd;
                    });
                });
    
                // Si el receptor ya tiene el período, no cambiar el estado a "accepted"
                if (receiverAlreadyHasPeriod) {
                    return res.status(200).json({ message: 'Ya tienes este período. Por favor rechaza la solicitud o toma otro período. La solicitud seguirá pendiente.' });
                }
    
                // Si no hay conflicto con los períodos, procede con el intercambio
                const selectedPeriodObj = JSON.parse(selectedPeriod);
    
                // Lógica para manejar el intercambio de vacaciones entre sender y receiver
                const cedidoStart = new Date(selectedPeriodObj.startDate);
                const cedidoEnd = new Date(selectedPeriodObj.endDate);
                const originalVacationSender = sender.vacations.find(vacation => 
                    new Date(vacation.startDate).getTime() <= cedidoStart.getTime() &&
                    new Date(vacation.endDate).getTime() >= cedidoEnd.getTime()
                );
                const originalVacationReceiver = receiver.vacations.find(vacation => 
                    new Date(vacation.startDate).getTime() <= new Date(notification.vacationPeriod.startDate).getTime() &&
                    new Date(vacation.endDate).getTime() >= new Date(notification.vacationPeriod.endDate).getTime()
                );
    
                if (originalVacationSender && originalVacationReceiver) {
                    // Calcular la duración de los períodos
                    const originalDurationSender = Math.round((new Date(originalVacationSender.endDate) - new Date(originalVacationSender.startDate)) / (1000 * 60 * 60 * 24)) + 1;
                    const originalDurationReceiver = Math.round((new Date(originalVacationReceiver.endDate) - new Date(originalVacationReceiver.startDate)) / (1000 * 60 * 60 * 24)) + 1;
                    const cedidoDuration = Math.round((cedidoEnd - cedidoStart) / (1000 * 60 * 60 * 24)) + 1;

                    // Eliminar el período completo del sender
                    sender.vacations = sender.vacations.filter(vacation => 
                        vacation.startDate.toISOString() !== originalVacationSender.startDate.toISOString() ||
                        vacation.endDate.toISOString() !== originalVacationSender.endDate.toISOString()
                    );

                    // Eliminar el período completo del receiver
                    receiver.vacations = receiver.vacations.filter(vacation => 
                        vacation.startDate.toISOString() !== originalVacationReceiver.startDate.toISOString() ||
                        vacation.endDate.toISOString() !== originalVacationReceiver.endDate.toISOString()
                    );

                    // Caso 1: Intercambio directo si los períodos tienen la misma duración
                    if (originalDurationSender === cedidoDuration && originalDurationReceiver === cedidoDuration) {
                        console.log("Intercambio directo: ambos períodos tienen la misma duración.");
                        
                        // Agregar el período solicitado a las vacaciones del sender
                        sender.vacations.push(notification.vacationPeriod);

                        // Agregar el período cedido a las vacaciones del receiver
                        receiver.vacations.push(selectedPeriodObj);
                    } 
                    // Caso 2: Si el período del receiver es más largo, dividirlo
                    else if (originalDurationReceiver > cedidoDuration) {
                        console.log("El período del receiver es más largo. Dividiendo el período restante.");

                        // Agregar el período solicitado a las vacaciones del sender
                        sender.vacations.push(notification.vacationPeriod);

                        // Calcular el período restante para el receiver
                        let remainingStart = null;
                        let remainingEnd = null;

                        // Caso A: El período solicitado incluye el último día del período original del receiver
                        if (new Date(notification.vacationPeriod.endDate).getTime() === new Date(originalVacationReceiver.endDate).getTime()) {
                            console.log("El período solicitado incluye el último día del período original del receiver.");
                            
                            // El período restante es desde el inicio del período original del receiver hasta justo antes del inicio del período solicitado
                            remainingStart = new Date(originalVacationReceiver.startDate);
                            remainingEnd = new Date(notification.vacationPeriod.startDate);
                            remainingEnd.setDate(remainingEnd.getDate() - 1);  // Un día antes del inicio del período solicitado

                            // Ajustar sumando 2 días al final del período restante
                            remainingEnd.setDate(remainingEnd.getDate() + 2);
                            console.log(`Período restante ajustado: Inicio - ${remainingStart.toISOString()}, Fin - ${remainingEnd.toISOString()}`);
                        } 

                        // Caso B: El período solicitado incluye el primer día del período original del receiver
                        else if (new Date(notification.vacationPeriod.startDate).getTime() === new Date(originalVacationReceiver.startDate).getTime()) {
                            console.log("El período solicitado incluye el primer día del período original del receiver.");
                            
                            // El período restante es desde justo después del final del período solicitado hasta el final del período original del receiver
                            remainingStart = new Date(notification.vacationPeriod.endDate);
                            remainingStart.setDate(remainingStart.getDate() + 1);  // Un día después del final del período solicitado
                            remainingEnd = new Date(originalVacationReceiver.endDate);

                            // Ajustar sumando 2 días al inicio del período restante
                            remainingStart.setDate(remainingStart.getDate() - 2);
                            console.log(`Período restante ajustado: Inicio - ${remainingStart.toISOString()}, Fin - ${remainingEnd.toISOString()}`);
                        }

                        // Eliminar el período original del receiver
                        receiver.vacations = receiver.vacations.filter(vacation =>
                            vacation.startDate.toISOString() !== originalVacationReceiver.startDate.toISOString() ||
                            vacation.endDate.toISOString() !== originalVacationReceiver.endDate.toISOString()
                        );

                        // Agregar el período restante ajustado al receiver
                        if (remainingStart && remainingEnd) {
                            receiver.vacations.push({
                                startDate: remainingStart,
                                endDate: remainingEnd
                            });
                        }

                        // Agregar el período cedido a las vacaciones del receiver
                        receiver.vacations.push(selectedPeriodObj);
                    } 
                    
                    // Caso 3: Si el período del sender es más largo, aplicar la lógica del período restante
                    else if (originalDurationSender > cedidoDuration) {
                    console.log("El período del sender es más largo. Aplicando la lógica del período restante.");

                    let remainingStart = null;
                    let remainingEnd = null;

                    // Caso A: Cedido al inicio del período original del sender
                    if (cedidoStart.getTime() === new Date(originalVacationSender.startDate).getTime()) {
                        // El período cedido incluye el primer día del período original del sender
                        remainingStart = new Date(cedidoEnd);  // El final del período cedido
                        remainingStart.setDate(remainingStart.getDate() + 1);  // El inicio del período restante
                        remainingEnd = new Date(originalVacationSender.endDate);  // Mantener el mismo fin del período original

                        // Ajustar el período restante sumando 2 días al inicio
                        remainingStart.setDate(remainingStart.getDate() - 2);
                        console.log(`Período restante ajustado: Inicio - ${remainingStart.toISOString()}, Fin - ${remainingEnd.toISOString()} (caso de cedido al inicio)`);
                    } 
                    // Caso B: Cedido al final del período original del sender
                    else if (cedidoEnd.getTime() === new Date(originalVacationSender.endDate).getTime()) {
                        // El período cedido incluye el último día del período original del sender
                        remainingStart = new Date(originalVacationSender.startDate);  // El inicio del período original del sender
                        remainingEnd = new Date(cedidoStart);  // El inicio del período cedido
                        remainingEnd.setDate(remainingEnd.getDate() - 1);  // El final del período restante será un día antes del período cedido

                        // Ajustar el período restante sumando 2 días al final
                        remainingEnd.setDate(remainingEnd.getDate() + 2);
                        console.log(`Período restante ajustado: Inicio - ${remainingStart.toISOString()}, Fin - ${remainingEnd.toISOString()} (caso de cedido al final)`);
                    }

                    // Agregar el período restante ajustado al sender
                    if (remainingStart && remainingEnd) {
                        sender.vacations.push({
                            startDate: remainingStart,
                            endDate: remainingEnd
                        });
                    }

                    // Agregar el período solicitado a las vacaciones del sender
                    sender.vacations.push(notification.vacationPeriod);

                    // Agregar el período cedido a las vacaciones del receiver
                    receiver.vacations.push(selectedPeriodObj);
                }

                await sender.save();
                await receiver.save();

                // Actualizar el estado de la notificación a "accepted" después de completar el intercambio
                notification.status = 'accepted';
                notification.updatedAt = Date.now();
                await notification.save();
                
                    const acceptanceNotification = new Notification({
                        sender: notification.receiver,  // El receiver original se convierte en sender de esta notificación
                        receiver: notification.sender,  // El sender original es ahora el receiver de esta notificación
                        message: `Tu solicitud de intercambio de vacaciones ha sido aceptada por ${receiver.username}. 
                                  Has cedido el período de vacaciones del ${selectedPeriodObj.startDate} al ${selectedPeriodObj.endDate}, 
                                  y a cambio ahora tendrás vacaciones del ${notification.vacationPeriod.startDate} al ${notification.vacationPeriod.endDate}.`,
                        vacationPeriod: notification.vacationPeriod,
                        periodsToGive: [selectedPeriodObj],
                        status: 'accepted',
                        isConfirmation: true  // Esta propiedad indica que es una confirmación para el sender original
                    });
                    
                    await acceptanceNotification.save();
                    console.log('Notificación de aceptación creada:', acceptanceNotification);
                    

                    // Actualizar otras notificaciones relacionadas
                    await Notification.updateMany(
                        {
                            _id: { $ne: notificationId },
                            sender: notification.sender,
                            vacationPeriod: notification.vacationPeriod,
                            status: 'pending'
                        },
                        { $set: { status: 'canceled', updatedAt: Date.now() } }
                    );

                    return res.status(200).json({ message: 'Intercambio realizado exitosamente.' });
                } else {
                    return res.status(404).json({ message: 'No se encontraron períodos de vacaciones válidos para el intercambio.' });
                }
            } else if (response === 'rejected') {
                // Obtener el receiver (usuario que rechazó la solicitud)
                const receiver = await User.findById(notification.receiver);
            
                if (!receiver) {
                    return res.status(404).json({ message: 'Usuario que rechazó la solicitud no encontrado.' });
                }
            
                // Crear una notificación de rechazo para el sender original
                const rejectionNotification = new Notification({
                    sender: notification.receiver,  // El usuario que rechazó la solicitud es ahora el sender de la nueva notificación
                    receiver: notification.sender,  // El sender original es el receiver de la notificación de rechazo
                    message: `Tu solicitud de intercambio de vacaciones ha sido rechazada por ${receiver.username}.`,  // Usamos el nombre del receiver
                    vacationPeriod: notification.vacationPeriod,  // Mantener el período de la solicitud original
                    periodsToGive: notification.periodsToGive,    // Mantener los períodos ofrecidos
                    status: 'rejected',  // Estado rechazado
                    isConfirmation: true  // Indicar que es una confirmación de rechazo
                });
            
                await rejectionNotification.save();
                console.log('Notificación de rechazo creada:', rejectionNotification);
            
                // **Enviar respuesta al frontend**
                return res.status(200).json({ message: 'Solicitud rechazada y notificación creada.' });
            }
             else {
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