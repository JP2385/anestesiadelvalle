const User = require('../models/userModel');

const getUsersAvailability = async (req, res) => {
    try {
        // Consulta para obtener los usuarios incluyendo su username, workSchedule y vacations
        const users = await User.find({}, 'username workSchedule vacations');
        ('Users:', users);

        // Inicializar disponibilidad para cada día de la semana
        const availability = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: []
        };

        // Obtener la fecha actual y calcular el inicio de la semana (lunes)
        const currentDate = new Date();
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
        ('Start of Week:', startOfWeek);

        // Calcular las fechas para cada día de la semana
        const daysOfWeek = [
            new Date(startOfWeek), // Monday
            new Date(startOfWeek.setDate(startOfWeek.getDate() + 1)), // Tuesday
            new Date(startOfWeek.setDate(startOfWeek.getDate() + 1)), // Wednesday
            new Date(startOfWeek.setDate(startOfWeek.getDate() + 1)), // Thursday
            new Date(startOfWeek.setDate(startOfWeek.getDate() + 1)) // Friday
        ];
        ('Days of Week:', daysOfWeek);

        // Verificar disponibilidad de cada usuario para cada día de la semana
        users.forEach(user => {
            const onVacation = (day) => user.vacations.some(vacation => {
                const start = new Date(vacation.startDate);
                const end = new Date(vacation.endDate);
                return day >= start && day <= end;
            });

            // Agregar usuario a la disponibilidad del día correspondiente si no está de vacaciones y trabaja ese día
            if (user.workSchedule.monday !== 'No trabaja' && !onVacation(daysOfWeek[0])) availability.monday.push(user.username);
            if (user.workSchedule.tuesday !== 'No trabaja' && !onVacation(daysOfWeek[1])) availability.tuesday.push(user.username);
            if (user.workSchedule.wednesday !== 'No trabaja' && !onVacation(daysOfWeek[2])) availability.wednesday.push(user.username);
            if (user.workSchedule.thursday !== 'No trabaja' && !onVacation(daysOfWeek[3])) availability.thursday.push(user.username);
            if (user.workSchedule.friday !== 'No trabaja' && !onVacation(daysOfWeek[4])) availability.friday.push(user.username);
        });

        ('Availability:', availability);
        // Enviar disponibilidad en formato JSON
        res.status(200).json(availability);
    } catch (error) {
        // Manejo de errores
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsersAvailability };


module.exports = {
    getUsersAvailability
};
