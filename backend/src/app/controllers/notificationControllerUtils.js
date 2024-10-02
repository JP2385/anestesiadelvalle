const Notification = require('../models/notificationModel');

// Verificar si el receiver ya posee el período que intenta aceptar
const checkIfReceiverAlreadyHasPeriod = (receiver, notification) => {
    return receiver.vacations.some(vacation => 
        new Date(vacation.startDate).getTime() <= new Date(notification.vacationPeriod.startDate).getTime() &&
        new Date(vacation.endDate).getTime() >= new Date(notification.vacationPeriod.endDate).getTime()
    );
};

// Manejar el intercambio de vacaciones
// notificationControllerUtils.js
const handleVacationSwap = async (sender, receiver, notification, selectedPeriodObj) => {
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

        // Ajustar el período restante para el receiver
        const adjustedRemainingPeriod = adjustRemainingPeriod(notification.vacationPeriod.startDate, notification.vacationPeriod.endDate);

        // Agregar el período restante ajustado al receiver
        receiver.vacations.push(adjustedRemainingPeriod);

        // Agregar el período cedido a las vacaciones del receiver
        receiver.vacations.push(selectedPeriodObj);
    } 

    // Caso 3: Si el período del sender es más largo, aplicar la lógica del período restante
    else if (originalDurationSender > cedidoDuration) {
        console.log("El período del sender es más largo. Aplicando la lógica del período restante.");

        // Ajustar el período restante para el sender
        const adjustedRemainingPeriod = adjustRemainingPeriod(selectedPeriodObj.startDate, selectedPeriodObj.endDate);

        // Agregar el período restante ajustado al sender
        sender.vacations.push(adjustedRemainingPeriod);

        // Agregar el período solicitado a las vacaciones del sender
        sender.vacations.push(notification.vacationPeriod);

        // Agregar el período cedido a las vacaciones del receiver
        receiver.vacations.push(selectedPeriodObj);
    }

    }

    await sender.save();
    await receiver.save();
};

// Crear una notificación de aceptación
const createAcceptanceNotification = async (notification, sender, receiver, selectedPeriodObj) => {
    const acceptanceNotification = new Notification({
        sender: notification.receiver,
        receiver: notification.sender,
        message: `Tu solicitud de intercambio de vacaciones ha sido aceptada por ${receiver.username}. 
                  Has cedido el período de vacaciones del ${selectedPeriodObj.startDate} al ${selectedPeriodObj.endDate}, 
                  y a cambio ahora tendrás vacaciones del ${notification.vacationPeriod.startDate} al ${notification.vacationPeriod.endDate}.`,
        vacationPeriod: notification.vacationPeriod,
        periodsToGive: [selectedPeriodObj],
        status: 'accepted',
        isConfirmation: true
    });
    
    await acceptanceNotification.save();
};

// Crear una notificación de rechazo
const createRejectionNotification = async (notification, sender, receiver) => {
    const rejectionNotification = new Notification({
        sender: notification.receiver,
        receiver: notification.sender,
        message: `Tu solicitud de intercambio de vacaciones ha sido rechazada por ${receiver.username}.`,
        vacationPeriod: notification.vacationPeriod,
        periodsToGive: notification.periodsToGive,
        status: 'rejected',
        isConfirmation: true
    });

    await rejectionNotification.save();
};

function adjustRemainingPeriod(startDate, endDate) {
    // Ajustar el inicio al sábado anterior (o mantener si ya es sábado)
    const adjustedStart = new Date(startDate);
    const dayOfWeekStart = adjustedStart.getUTCDay();
    if (dayOfWeekStart !== 6) { // Si no es sábado, ajustar
        adjustedStart.setDate(adjustedStart.getDate() - ((dayOfWeekStart + 1) % 7));
    }

    // Ajustar el fin al domingo posterior (o mantener si ya es domingo)
    const adjustedEnd = new Date(endDate);
    const dayOfWeekEnd = adjustedEnd.getUTCDay();
    if (dayOfWeekEnd !== 0) { // Si no es domingo, ajustar
        adjustedEnd.setDate(adjustedEnd.getDate() + (7 - dayOfWeekEnd));
    }

    return { startDate: adjustedStart, endDate: adjustedEnd };
}


module.exports = { checkIfReceiverAlreadyHasPeriod, handleVacationSwap, createAcceptanceNotification, createRejectionNotification };
