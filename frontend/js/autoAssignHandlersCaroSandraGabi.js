import { getWeekNumber} from './assignUtils.js';
import { assignSpecificUsersByDay } from './autoAssignDayFunctions.js';
import { getWorkSchemes } from './workSchemes.js';

export async function autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability) {
    try {
        const montesEsposito = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'montes_esposito');
        const ggudino = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'ggudiño');
        const nvela = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'nvela');

        const currentWeekNumber = getWeekNumber(new Date());
        const isOddWeek = currentWeekNumber % 2 !== 0;

        const {
            montesEspositoScheme,
            ggudinoScheme,
            nvelaScheme
        } = getWorkSchemes(isOddWeek);

        // Asignar a montes_esposito si está disponible
        if (montesEsposito) {
            assignSpecificUsersByDay(dayIndex, montesEspositoScheme, montesEsposito);
        }

        // Asignar a ggudino si está disponible
        if (ggudino) {
            assignSpecificUsersByDay(dayIndex, ggudinoScheme, ggudino);
        }

        if (nvela) {
            assignSpecificUsersByDay(dayIndex, nvelaScheme, nvela);
        }

    } catch (error) {
        console.error('Hubo un problema con la solicitud:', error.message);
    }
}
