const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

// Función para buscar períodos de vacaciones completos
const findFullVacationPeriod = (user, startDate, endDate) => {
    return user.vacations.find(vacation => 
        new Date(vacation.startDate).getTime() <= startDate.getTime() &&
        new Date(vacation.endDate).getTime() >= endDate.getTime()
    );
};

// Función para calcular la duración de un período de vacaciones en días
const calculateVacationDuration = (startDate, endDate) => {
    return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
};

// Función para crear una notificación de aceptación de intercambio
const createAcceptanceNotification = async (sender, receiver, selectedPeriodObj, vacationPeriod) => {
    const acceptanceNotification = new Notification({
        sender: receiver._id,
        receiver: sender._id,
        message: `Tu solicitud de intercambio de vacaciones ha sido aceptada por ${receiver.username}. 
                  Has cedido el período de vacaciones del ${selectedPeriodObj.startDate} al ${selectedPeriodObj.endDate}, 
                  y a cambio ahora tendrás vacaciones del ${vacationPeriod.startDate} al ${vacationPeriod.endDate}.`,
        vacationPeriod: vacationPeriod,
        periodsToGive: [selectedPeriodObj],
        status: 'accepted',
        isConfirmation: true
    });
    await acceptanceNotification.save();
    return acceptanceNotification;
};

// Función para crear una notificación de rechazo de intercambio
const createRejectionNotification = async (sender, receiver, vacationPeriod, periodsToGive) => {
    const rejectionNotification = new Notification({
        sender: receiver._id,
        receiver: sender._id,
        message: `Tu solicitud de intercambio de vacaciones ha sido rechazada por ${receiver.username}.`,
        vacationPeriod: vacationPeriod,
        periodsToGive: periodsToGive,
        status: 'rejected',
        isConfirmation: true
    });
    await rejectionNotification.save();
    return rejectionNotification;
};

module.exports = {
    findFullVacationPeriod,
    calculateVacationDuration,
    createAcceptanceNotification,
    createRejectionNotification
};

