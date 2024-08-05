import { autoAssignMorningWorkersByDay } from './autoAssignDayFunctions.js';

export async function autoAssignMorningsByDay(apiUrl, dayIndex, availability) {
    try {
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const dayName = dayNames[dayIndex];

        if (!availability || !availability[dayName]) {
            console.error(`Day name ${dayName} does not exist in availability.`);
            return;
        }

        const availableUsers = availability[dayName];
        autoAssignMorningWorkersByDay(dayIndex, availableUsers, dayName);
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}
