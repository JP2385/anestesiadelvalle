import { updateSelectBackgroundColors } from './assignUtils.js';
import { autoAssignAfternoonWorkers} from './autoAssignFunctions.js';
import { autoAssignAfternoonWorkersByDay } from './autoAssignDayFunctions.js';

export async function autoAssignAfternoons(apiUrl) {
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

            autoAssignAfternoonWorkers(users);

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

export async function autoAssignAfternoonsByDay(apiUrl, dayIndex) {
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
            const availableUsers = availability[Object.keys(availability)[dayIndex]];
            autoAssignAfternoonWorkersByDay(dayIndex, availableUsers);
            updateSelectBackgroundColors();
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}
