const { calculateDaysBetween, notifyVacationUsers } = require('./vacationSwapControllerUtils');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');

// Función para solicitar un intercambio de vacaciones
const requestVacationSwap = async (req, res) => {
    const { userId, periodsToGive, periodToRequest } = req.body;

    try {
        // Log para verificar que la función se ejecuta
        console.log('Iniciando el proceso de intercambio de vacaciones');
        console.log('Usuario solicitante:', userId);
        console.log('Período solicitado:', periodToRequest);
        console.log('Períodos a ceder:', periodsToGive);

        // Obtener el usuario que está solicitando el intercambio
        const requestingUser = await User.findById(userId);
        if (!requestingUser) {
            console.log('Usuario no encontrado');
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        console.log('Usuario solicitante encontrado:', requestingUser.username);

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
            console.log('El usuario no tiene los períodos seleccionados para ceder');
            return res.status(400).json({ message: 'El usuario no tiene los períodos seleccionados para ceder' });
        }

        // Usar $elemMatch para asegurarse de que ambas condiciones (startDate y endDate) se aplican al mismo período de vacaciones
        console.log('Buscando usuarios que tienen vacaciones que cubren completamente el período solicitado:', periodToRequest);

        const requestedVacationUsers = await User.find({
            vacations: {
                $elemMatch: {
                    startDate: { $lte: new Date(periodToRequest.startDate) },
                    endDate: { $gte: new Date(periodToRequest.endDate) }
                }
            },
            _id: { $ne: userId }  // Excluir al current user (solicitante)
        });

        console.log('Usuarios encontrados:', requestedVacationUsers.length);
        requestedVacationUsers.forEach(user => {
            console.log(`- Usuario: ${user.username}, ID: ${user._id}, Vacaciones: ${user.vacations.map(v => `${v.startDate} a ${v.endDate}`).join(', ')}`);
        });

        // Validar los días cedidos vs días solicitados
        const totalDaysToGive = periodsToGive.reduce((total, period) => {
            const start = new Date(period.startDate);
            const end = new Date(period.endDate);
            return total + calculateDaysBetween(start, end);
        }, 0);
        
        const daysRequested = calculateDaysBetween(new Date(periodToRequest.startDate), new Date(periodToRequest.endDate));

        console.log(`Total días a ceder: ${totalDaysToGive}, Días solicitados: ${daysRequested}`);

        if (totalDaysToGive < daysRequested) {
            console.log('Los períodos cedidos no tienen suficientes días');
            return res.status(400).json({ message: 'Los períodos cedidos deben tener al menos la misma cantidad de días que el período solicitado' });
        }

        // Si el período solicitado ya tiene usuarios disponibles, notificar a esos usuarios
        console.log('Notificando a los usuarios disponibles para el intercambio...');
        await notifyVacationUsers(requestedVacationUsers, requestingUser, periodToRequest, periodsToGive);

        console.log('Solicitud de intercambio enviada con éxito');
        return res.status(200).json({ message: 'Solicitud enviada a los usuarios para su aprobación' });

    } catch (error) {
        console.error('Error al solicitar el intercambio de vacaciones:', error);
        return res.status(500).json({ message: 'Error al solicitar el intercambio de vacaciones', error });
    }
};

module.exports = {
    requestVacationSwap
};
