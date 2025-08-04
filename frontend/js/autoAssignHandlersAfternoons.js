import { updateSelectBackgroundColors } from './assignUtils.js';
import { autoAssignAfternoonWorkersByDay } from './autoAssignDayFunctions.js';

export async function autoAssignAfternoonsByDay(apiUrl, dayIndex, availability, assignedUsers) {
    try {
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const dayName = dayNames[dayIndex];

        if (!availability || !availability[dayName]) {
            console.error(`Day name ${dayName} does not exist in availability.`);
            return;
        }

        const availableUsers = availability[dayName];
        autoAssignAfternoonWorkersByDay(dayIndex, availableUsers, dayName, assignedUsers); // ✅ corregido
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}

