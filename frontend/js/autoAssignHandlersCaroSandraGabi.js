import { getWeekNumber, updateSelectBackgroundColors } from './assignUtils.js';
import { assignSpecificUsersByDay } from './autoAssignDayFunctions.js';
import { getWorkSchemes } from './workSchemes.js';

// autoAssignHandlersCaroSandraGabi.js

export async function autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability) {
    try {
        const montesEsposito = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'montes_esposito');
        const ggudino = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'ggudiño');

        const currentWeekNumber = getWeekNumber(new Date());
        const isOddWeek = currentWeekNumber % 2 !== 0;

        const {
            montesEspositoScheme,
            ggudinoScheme,
        } = getWorkSchemes(isOddWeek);

        if (montesEsposito) {
            assignSpecificUsersByDay(dayIndex, montesEspositoScheme, montesEsposito);
        } else {
            console.error('montes_esposito not found in availability');
        }

        if (ggudino) {
            assignSpecificUsersByDay(dayIndex, ggudinoScheme, ggudino);
        } else {
            console.error('ggudino not found in availability');
        }

        updateSelectBackgroundColors();

    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}
