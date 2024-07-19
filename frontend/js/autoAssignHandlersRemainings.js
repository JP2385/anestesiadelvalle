import { updateSelectBackgroundColors, fetchAvailability } from './assignUtils.js';
import { autoAssignRemainingSlots, countAssignmentsByDay} from './autoAssignFunctions.js';

export async function autoAssignRemainings(apiUrl) {
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

            autoAssignRemainingSlots(users);

            updateSelectBackgroundColors();

            alert('Asignación automática completada.');
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
    countAssignmentsByDay();
    fetchAvailability();

}
