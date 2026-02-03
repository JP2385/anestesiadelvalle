const User = require('../models/userModel');

const getUsersAvailability = async (req, res) => {
    try {
        const users = await User.find({}, 'username workSchedule vacations otherLeaves worksInCmacOnly worksInPrivateRioNegro worksInPublicRioNegro worksInPublicNeuquen worksInPrivateNeuquen doesPediatrics doesCardio doesRNM _id');

        const availability = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: []  // Agregamos el sábado
        };
        
        const currentDate = new Date();
        let startOfWeek = new Date(currentDate);

        // Check if today is Saturday (6) and adjust startOfWeek accordingly
        const todayDay = currentDate.getDay();
        if (todayDay === 6) { // Si hoy es sábado
            startOfWeek.setDate(currentDate.getDate() + 2); // Ajustar al lunes siguiente
        } else if (todayDay === 0) { // Si hoy es domingo
            startOfWeek.setDate(currentDate.getDate() + 1); // Ajustar al lunes siguiente
        } else {
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Ajustar al lunes actual
        }

        startOfWeek.setHours(0, 0, 0, 0);

        const daysOfWeek = [
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate())), // Monday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 1)), // Tuesday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 2)), // Wednesday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 3)), // Thursday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 4)), // Friday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 5))  // Saturday
        ];

        const adjustForTimezone = (date) => {
            const adjustedDate = new Date(date);
            adjustedDate.setMinutes(adjustedDate.getMinutes() + adjustedDate.getTimezoneOffset());
            return adjustedDate;
        };

        const isSameDay = (date1, date2) => {
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        };

        users.forEach(user => {
            const onVacation = (day) => user.vacations.some(vacation => {
                const start = adjustForTimezone(new Date(vacation.startDate));
                const end = adjustForTimezone(new Date(vacation.endDate));
                const isOnVacation = (day >= start && day <= end) || isSameDay(day, start) || isSameDay(day, end);
                return isOnVacation;
            });

            const onLeave = (day) => user.otherLeaves.some(leave => {
                const start = adjustForTimezone(new Date(leave.startDate));
                const end = adjustForTimezone(new Date(leave.endDate));
                const isOnLeave = (day >= start && day <= end) || isSameDay(day, start) || isSameDay(day, end);
                return isOnLeave;
            });

            const userData = {
                _id: user._id,
                username: user.username,
                workSchedule: user.workSchedule,
                worksInCmacOnly: user.worksInCmacOnly,
                worksInPrivateRioNegro: user.worksInPrivateRioNegro,
                worksInPublicRioNegro: user.worksInPublicRioNegro,
                worksInPublicNeuquen: user.worksInPublicNeuquen,
                worksInPrivateNeuquen: user.worksInPrivateNeuquen,
                doesCardio: user.doesCardio,
                doesPediatrics: user.doesPediatrics,
                doesRNM: user.doesRNM
            };

            // Helper function para agregar usuario, duplicando si tiene "Mañana y Tarde"
            const addUserToDay = (dayKey, dayIndex, schedule) => {
                if (schedule !== 'No trabaja' && !onVacation(daysOfWeek[dayIndex]) && !onLeave(daysOfWeek[dayIndex])) {
                    if (schedule === 'Mañana y Tarde') {
                        // Agregar como usuario de mañana
                        const morningUser = {
                            ...userData,
                            _id: `${user._id}_morning_${dayKey}`, // ID único para turno mañana
                            workSchedule: { ...user.workSchedule, [dayKey]: 'Mañana' },
                            shift: 'Mañana',
                            displayName: `${user.username} (mañana)`,
                            originalId: user._id
                        };
                        availability[dayKey].push(morningUser);
                        
                        // Agregar como usuario de tarde
                        const afternoonUser = {
                            ...userData,
                            _id: `${user._id}_afternoon_${dayKey}`, // ID único para turno tarde
                            workSchedule: { ...user.workSchedule, [dayKey]: 'Tarde' },
                            shift: 'Tarde',
                            displayName: `${user.username} (tarde)`,
                            originalId: user._id
                        };
                        availability[dayKey].push(afternoonUser);
                    } else {
                        // Usuario normal (sin duplicar)
                        availability[dayKey].push(userData);
                    }
                }
            };

            addUserToDay('monday', 0, user.workSchedule.monday);
            addUserToDay('tuesday', 1, user.workSchedule.tuesday);
            addUserToDay('wednesday', 2, user.workSchedule.wednesday);
            addUserToDay('thursday', 3, user.workSchedule.thursday);
            addUserToDay('friday', 4, user.workSchedule.friday);
            addUserToDay('saturday', 5, user.workSchedule.saturday);
        });

        res.status(200).json(availability);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsersAvailability };