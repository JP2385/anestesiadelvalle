import { updateSelectBackgroundColors, fetchAvailability } from './assignUtils.js';
import { autoAssignRemainingSlotsByDay } from './autoAssignDayFunctions.js';

export async function autoAssignRemainingsByDay(apiUrl, dayIndex, availability) {
    try {
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const dayName = dayNames[dayIndex];

        if (!availability || !availability[dayName]) {
            console.error(`Day name ${dayName} does not exist in availability.`);
            return;
        }

        const availableUsers = availability[dayName];
        autoAssignRemainingSlotsByDay(dayIndex, availableUsers);
        updateSelectBackgroundColors();
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}