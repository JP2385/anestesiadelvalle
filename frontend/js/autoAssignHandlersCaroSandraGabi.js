import { getWeekNumber} from './assignUtils.js';
import { assignSpecificUsersByDay } from './autoAssignDayFunctions.js';
import { getWorkSchemes } from './workSchemes.js';

export async function autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability, assignedUsers) {
    try {
        const dayKey = Object.keys(availability)[dayIndex];
        const workSiteElements = document.querySelectorAll('.work-site');

        const montesEsposito = availability[dayKey].find(user => user.username === 'montes_esposito');
        const ggudino = availability[dayKey].find(user => user.username === 'ggudiño');
        const nvela = availability[dayKey].find(user => user.username === 'nvela');

        const currentWeekNumber = getWeekNumber(new Date());
        const isOddWeek = currentWeekNumber % 2 !== 0;

        const {
            montesEspositoScheme,
            ggudinoScheme,
            nvelaScheme
        } = getWorkSchemes(isOddWeek);

        if (montesEsposito) {
            assignSpecificUsersByDay(dayIndex, montesEspositoScheme, montesEsposito, assignedUsers, workSiteElements);
        }

        if (ggudino) {
            assignSpecificUsersByDay(dayIndex, ggudinoScheme, ggudino, assignedUsers, workSiteElements);
        }

        if (nvela) {
            assignSpecificUsersByDay(dayIndex, nvelaScheme, nvela, assignedUsers, workSiteElements);
        }

    } catch (error) {
        console.error('Hubo un problema con la solicitud:', error.message);
    }
}

