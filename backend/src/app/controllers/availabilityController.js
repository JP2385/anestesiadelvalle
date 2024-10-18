const User = require('../models/userModel');

const getUsersAvailability = async (req, res) => {
    try {
        const users = await User.find({}, 'username workSchedule vacations worksInCmacOnly worksInPrivateRioNegro worksInPublicRioNegro worksInPublicNeuquen worksInPrivateNeuquen doesPediatrics doesCardio doesRNM _id');

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

            if (user.workSchedule.monday !== 'No trabaja' && !onVacation(daysOfWeek[0])) {
                availability.monday.push(userData);
            }
            if (user.workSchedule.tuesday !== 'No trabaja' && !onVacation(daysOfWeek[1])) {
                availability.tuesday.push(userData);
            }
            if (user.workSchedule.wednesday !== 'No trabaja' && !onVacation(daysOfWeek[2])) {
                availability.wednesday.push(userData);
            }
            if (user.workSchedule.thursday !== 'No trabaja' && !onVacation(daysOfWeek[3])) {
                availability.thursday.push(userData);
            }
            if (user.workSchedule.friday !== 'No trabaja' && !onVacation(daysOfWeek[4])) {
                availability.friday.push(userData);
            }
            if (user.workSchedule.saturday !== 'No trabaja' && !onVacation(daysOfWeek[5])) {
                availability.saturday.push(userData);
            }
        });

        res.status(200).json(availability);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsersAvailability };