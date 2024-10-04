// vacationSwapController.js
const { calculateDaysBetween, notifyVacationUsers } = require('./vacationSwapControllerUtils');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');

// Función para solicitar un intercambio de vacaciones
const requestVacationSwap = async (req, res) => {
    const { userId, periodsToGive, periodToRequest } = req.body;

    try {
        // Obtener el usuario que está solicitando el intercambio
        const requestingUser = await User.findById(userId);
        if (!requestingUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar los períodos a ceder
        const validPeriodsToGive = periodsToGive.every(period => {
            return requestingUser.vacations.some(v => {
                const vacationStart = new Date(v.startDate).getTime();
                const vacationEnd = new Date(v.endDate).getTime();
                const periodStart = new Date(period.startDate).getTime();
                const periodEnd = new Date(period.endDate).getTime();

                // Verificar si el período a ceder está dentro del período de vacaciones del usuario
                return vacationStart <= periodStart && vacationEnd >= periodEnd;
            });
        });

        if (!validPeriodsToGive) {
            return res.status(400).json({ message: 'El usuario no tiene los períodos seleccionados para ceder' });
        }

        // Obtener los usuarios que tienen el período solicitado
        const requestedVacationUsers = await User.find({
            'vacations.startDate': { $lte: periodToRequest.startDate },
            'vacations.endDate': { $gte: periodToRequest.endDate },
            '_id': { $ne: userId }  // Excluir al current user (solicitante)
        });

        // Validar los días cedidos vs días solicitados
        const totalDaysToGive = periodsToGive.reduce((total, period) => {
            const start = new Date(period.startDate);
            const end = new Date(period.endDate);
            return total + calculateDaysBetween(start, end);
        }, 0);
        
        const daysRequested = calculateDaysBetween(new Date(periodToRequest.startDate), new Date(periodToRequest.endDate));

        if (totalDaysToGive < daysRequested) {
            return res.status(400).json({ message: 'Los períodos cedidos deben tener al menos la misma cantidad de días que el período solicitado' });
        }

        // Si el período solicitado ya tiene usuarios disponibles, notificar a esos usuarios
        await notifyVacationUsers(requestedVacationUsers, requestingUser, periodToRequest, periodsToGive);

        return res.status(200).json({ message: 'Solicitud enviada a los usuarios para su aprobación' });

    } catch (error) {
        console.error('Error al solicitar el intercambio de vacaciones:', error);
        return res.status(500).json({ message: 'Error al solicitar el intercambio de vacaciones', error });
    }
};

module.exports = {
    requestVacationSwap
};