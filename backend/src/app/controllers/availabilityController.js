const User = require('../models/userModel');

const getUsersAvailability = async (req, res) => {
    try {
        const users = await User.find({}, 'username workSchedule vacations worksInCmacOnly worksInPrivateRioNegro worksInPublicRioNegro worksInPublicNeuquen worksInPrivateNeuquen doesCardio doesRNM _id');

        const availability = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: []
        };

        const currentDate = new Date();
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        const daysOfWeek = [
            new Date(startOfWeek), // Monday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 1)), // Tuesday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 2)), // Wednesday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 3)), // Thursday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 4)) // Friday
        ];

        const adjustForTimezone = (date) => {
            const adjustedDate = new Date(date);
            adjustedDate.setHours(adjustedDate.getHours() + 3);
            return adjustedDate;
        };

        users.forEach(user => {
            const onVacation = (day) => user.vacations.some(vacation => {
                const start = adjustForTimezone(new Date(vacation.startDate));
                const end = adjustForTimezone(new Date(vacation.endDate));
                return day >= start && day <= end;
            });

            const userData = {
                _id: user._id, // Asegurarse de incluir el _id aquí
                username: user.username,
                workSchedule: user.workSchedule,
                worksInCmacOnly: user.worksInCmacOnly,
                worksInPrivateRioNegro: user.worksInPrivateRioNegro,
                worksInPublicRioNegro: user.worksInPublicRioNegro,
                worksInPublicNeuquen: user.worksInPublicNeuquen,
                worksInPrivateNeuquen: user.worksInPrivateNeuquen,
                doesCardio: user.doesCardio,
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
        });

        res.status(200).json(availability);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsersAvailability };
