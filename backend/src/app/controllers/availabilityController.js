const User = require('../models/userModel');

const getUsersAvailability = async (req, res) => {
    try {
        ('Fetching users with their work schedules and vacations');
        const users = await User.find({}, 'username workSchedule vacations');
        ('Users:', users);

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
        ('Start of Week:', startOfWeek);

        const daysOfWeek = [
            new Date(startOfWeek), // Monday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 1)), // Tuesday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 2)), // Wednesday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 3)), // Thursday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 4)) // Friday
        ];
        ('Days of Week:', daysOfWeek);

        const adjustForTimezone = (date) => {
            const adjustedDate = new Date(date);
            adjustedDate.setHours(adjustedDate.getHours() + 3);
            return adjustedDate;
        };

        users.forEach(user => {
            const onVacation = (day) => user.vacations.some(vacation => {
                const start = adjustForTimezone(new Date(vacation.startDate));
                const end = adjustForTimezone(new Date(vacation.endDate));
                (`User ${user.username} checking vacation for day: ${day}, vacation start: ${start}, vacation end: ${end}`);
                return day >= start && day <= end;
            });

            if (user.workSchedule.monday !== 'No trabaja' && !onVacation(daysOfWeek[0])) {
                (`User ${user.username} is available on Monday`);
                availability.monday.push(user.username);
            }
            if (user.workSchedule.tuesday !== 'No trabaja' && !onVacation(daysOfWeek[1])) {
                (`User ${user.username} is available on Tuesday`);
                availability.tuesday.push(user.username);
            }
            if (user.workSchedule.wednesday !== 'No trabaja' && !onVacation(daysOfWeek[2])) {
                (`User ${user.username} is available on Wednesday`);
                availability.wednesday.push(user.username);
            }
            if (user.workSchedule.thursday !== 'No trabaja' && !onVacation(daysOfWeek[3])) {
                (`User ${user.username} is available on Thursday`);
                availability.thursday.push(user.username);
            }
            if (user.workSchedule.friday !== 'No trabaja' && !onVacation(daysOfWeek[4])) {
                (`User ${user.username} is available on Friday`);
                availability.friday.push(user.username);
            }
        });

        ('Availability:', availability);
        res.status(200).json(availability);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsersAvailability };
