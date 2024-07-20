import { updateSelectBackgroundColors } from './assignUtils.js';
import { autoAssignLongDayWorkers} from './autoAssignFunctions.js';
import { autoAssignLongDayWorkersByDay } from './autoAssignDayFunctions.js';

export async function autoAssignLongDays(apiUrl) {
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

            autoAssignLongDayWorkers(users);

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

export async function autoAssignLongDaysByDay(apiUrl, dayIndex) {
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
            autoAssignLongDayWorkersByDay(dayIndex, users);
            updateSelectBackgroundColors();
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}