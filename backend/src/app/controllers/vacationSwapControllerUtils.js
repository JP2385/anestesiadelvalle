// vacationSwapControllerUtils.js
const Notification = require('../models/notificationModel');

// Función para calcular los días entre dos fechas
const calculateDaysBetween = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));  // Convertir a días
};

// Función para notificar a los usuarios que tienen vacaciones
const notifyVacationUsers = async (users, requestingUser, requestedPeriod, periodsToGive) => {
    try {
        for (const user of users) {
            console.log(`Creando notificación para ${user.username}`);
            console.log(`Períodos a ceder: ${JSON.stringify(periodsToGive)}`);

            const notification = new Notification({
                sender: requestingUser._id,
                receiver: user._id,
                message: `${requestingUser.username} ha solicitado un intercambio de vacaciones contigo.`,
                vacationPeriod: {
                    startDate: requestedPeriod.startDate,
                    endDate: requestedPeriod.endDate
                },
                periodsToGive: periodsToGive.map(period => ({
                    startDate: period.startDate,
                    endDate: period.endDate
                }))
            });

            await notification.save();  // Guardar la notificación en la base de datos
            console.log(`Notificación creada para ${user.username}`);
        }
    } catch (error) {
        console.error('Error al notificar a los usuarios:', error);
    }
};

module.exports = {
    calculateDaysBetween,
    notifyVacationUsers
};
