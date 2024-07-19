import { getWeekNumber, updateSelectBackgroundColors } from './assignUtils.js';
import { assignSpecificUsers} from './autoAssignFunctions.js';
import { getWorkSchemes } from './workSchemes.js';

export async function autoAssignCaroSandraGabi(apiUrl) {
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
            const montesEsposito = users.find(user => user.username === 'montes_esposito');
            const ggudino = users.find(user => user.username === 'ggudiño');

            const currentWeekNumber = getWeekNumber(new Date());
            const isOddWeek = currentWeekNumber % 2 !== 0;

            const {
                montesEspositoScheme,
                ggudinoScheme,
            } = getWorkSchemes(isOddWeek);

            assignSpecificUsers(montesEspositoScheme, montesEsposito);
            assignSpecificUsers(ggudinoScheme, ggudino);

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