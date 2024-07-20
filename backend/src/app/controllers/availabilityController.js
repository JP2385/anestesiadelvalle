const User = require('../models/userModel');

const getUsersAvailability = async (req, res) => {
    try {
        const users = await User.find();

        const availability = {
            monday: 0,
            tuesday: 0,
            wednesday: 0,
            thursday: 0,
            friday: 0
        };

        const currentDate = new Date();
        const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1));
        const daysOfWeek = [
            new Date(startOfWeek), // Monday
            new Date(startOfWeek.setDate(startOfWeek.getDate() + 1)), // Tuesday
            new Date(startOfWeek.setDate(startOfWeek.getDate() + 2)), // Wednesday
            new Date(startOfWeek.setDate(startOfWeek.getDate() + 3)), // Thursday
            new Date(startOfWeek.setDate(startOfWeek.getDate() + 4)) // Friday
        ];

        users.forEach(user => {
            const onVacation = (day) => user.vacations.some(vacation => {
                const start = new Date(vacation.startDate);
                const end = new Date(vacation.endDate);
                return day >= start && day <= end;
            });

            if (user.workSchedule.monday !== 'No trabaja' && !onVacation(daysOfWeek[0])) availability.monday++;
            if (user.workSchedule.tuesday !== 'No trabaja' && !onVacation(daysOfWeek[1])) availability.tuesday++;
            if (user.workSchedule.wednesday !== 'No trabaja' && !onVacation(daysOfWeek[2])) availability.wednesday++;
            if (user.workSchedule.thursday !== 'No trabaja' && !onVacation(daysOfWeek[3])) availability.thursday++;
            if (user.workSchedule.friday !== 'No trabaja' && !onVacation(daysOfWeek[4])) availability.friday++;
        });

        res.status(200).json(availability);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getUsersAvailability
};