import { updateSelectBackgroundColors } from './assignUtils.js';
import { autoAssignMorningWorkers} from './autoAssignFunctions.js';
import { autoAssignMorningWorkersByDay } from './autoAssignDayFunctions.js';

export async function autoAssignMornings(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/auth/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const users = await response.json();

            autoAssignMorningWorkers(users);

            // Actualizar colores de fondo después de la asignación automática
            updateSelectBackgroundColors();

        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}

export async function autoAssignMorningsByDay(apiUrl, dayIndex) {
    try {
        const response = await fetch(`${apiUrl}/availability`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const availability = await response.json();
            const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            const dayName = dayNames[dayIndex];

            if (!availability || !availability[dayName]) {
                console.error(`Day name ${dayName} does not exist in availability.`);
                return;
            }

            const availableUsers = availability[dayName];
            autoAssignMorningWorkersByDay(dayIndex, availableUsers, dayName);
            updateSelectBackgroundColors();
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}
