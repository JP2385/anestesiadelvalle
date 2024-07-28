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
        let startOfWeek = new Date(currentDate);
        
        // Check if today is Saturday (6) or Sunday (0) and adjust startOfWeek accordingly
        const todayDay = currentDate.getDay();
        if (todayDay === 6) { // If today is Saturday
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 8); // Next Monday
        } else if (todayDay === 0) { // If today is Sunday
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 7); // Next Monday
        } else {
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // This Monday
        } else {
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // This Monday
        }
        
        startOfWeek.setHours(0, 0, 0, 0);

        const daysOfWeek = [
            new Date(startOfWeek), // Monday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 1)), // Tuesday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 2)), // Wednesday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 3)), // Thursday
            new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 4)) // Friday
        ];

        console.log('Days of the week being processed:', daysOfWeek);

        const adjustForTimezone = (date) => {
            const adjustedDate = new Date(date);
            adjustedDate.setHours(adjustedDate.getHours() + 3);
            return adjustedDate;
        };

        users.forEach(user => {
            const onVacation = (day) => user.vacations.some(vacation => {
                const start = adjustForTimezone(new Date(vacation.startDate));
                const end = adjustForTimezone(new Date(vacation.endDate));
                const isOnVacation = day >= start && day <= end;
                // console.log(`User ${user.username} checking vacation for day: ${day}, vacation start: ${start}, vacation end: ${end}, isOnVacation: ${isOnVacation}`);
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
                doesRNM: user.doesRNM
            };

            if (user.workSchedule.monday !== 'No trabaja' && !onVacation(daysOfWeek[0])) {
                // console.log(`User ${user.username} is available on Monday`);
                availability.monday.push(userData);
            }
            if (user.workSchedule.tuesday !== 'No trabaja' && !onVacation(daysOfWeek[1])) {
                // console.log(`User ${user.username} is available on Tuesday`);
                availability.tuesday.push(userData);
            }
            if (user.workSchedule.wednesday !== 'No trabaja' && !onVacation(daysOfWeek[2])) {
                // console.log(`User ${user.username} is available on Wednesday`);
                availability.wednesday.push(userData);
            }
            if (user.workSchedule.thursday !== 'No trabaja' && !onVacation(daysOfWeek[3])) {
                // console.log(`User ${user.username} is available on Thursday`);
                availability.thursday.push(userData);
            }
            if (user.workSchedule.friday !== 'No trabaja' && !onVacation(daysOfWeek[4])) {
                // console.log(`User ${user.username} is available on Friday`);
                availability.friday.push(userData);
            }
        });

        // console.log('Final Availability:', availability);
        res.status(200).json(availability);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsersAvailability };
