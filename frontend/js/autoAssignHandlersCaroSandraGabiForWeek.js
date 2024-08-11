// autoAssignCaroSandraGabiForWeek.js

import { assignSpecificUsersForWeek } from './autoAssignWeekFunctions';
import { getWeekNumber, getWorkSchemes } from './assignUtils'; // Asegúrate de importar las funciones necesarias

export async function autoAssignCaroSandraGabiForWeek(apiUrl, dayIndex, availability) {
    try {
        const montesEsposito = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'montes_esposito');
        const ggudino = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'ggudiño');

        const currentWeekNumber = getWeekNumber(new Date());
        const isOddWeek = currentWeekNumber % 2 !== 0;

        const {
            montesEspositoScheme,
            ggudinoScheme,
        } = getWorkSchemes(isOddWeek);

        let assignments = [];

        if (montesEsposito) {
            const montesAssignments = assignSpecificUsersForWeek(dayIndex, montesEspositoScheme, montesEsposito);
            assignments.push(...montesAssignments);
        } else {
            console.error('montes_esposito not found in availability');
        }

        if (ggudino) {
            const ggudinoAssignments = assignSpecificUsersForWeek(dayIndex, ggudinoScheme, ggudino);
            assignments.push(...ggudinoAssignments);
        } else {
            console.error('ggudino not found in availability');
        }

        return assignments;

    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
        return [];
    }
}
