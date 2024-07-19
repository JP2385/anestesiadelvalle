import { updateSelectBackgroundColors } from './assignUtils.js';
import { autoAssignAfternoonWorkers} from './autoAssignFunctions.js';

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

            // Aviso después de la asignación automática
            alert('Asignación automática completada.');
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}
