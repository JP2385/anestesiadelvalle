import { getWeekNumber} from './assignUtils.js';
import { assignSpecificUsersByDay } from './autoAssignDayFunctions.js';
import { getWorkSchemes } from './workSchemes.js';

export async function autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability, assignedUsers, virtualState) {
    try {
        const dayKey = Object.keys(availability)[dayIndex];
        const workSiteElements = document.querySelectorAll('.work-site');

        const montesEsposito = availability[dayKey].find(user => user.username === 'montes_esposito');
        const ggudino = availability[dayKey].find(user => user.username === 'ggudiño');
        const nvela = availability[dayKey].find(user => user.username === 'nvela');
        const rconsigli = availability[dayKey].find(user => user.username === 'rconsigli');

        const currentWeekNumber = getWeekNumber(new Date());
        const isOddWeek = currentWeekNumber % 2 !== 0;

        const {
            montesEspositoScheme,
            ggudinoScheme,
            nvelaScheme,
            rconsigliScheme
        } = getWorkSchemes(isOddWeek);

        if (montesEsposito) {
            assignSpecificUsersByDay(dayIndex, montesEspositoScheme, montesEsposito, assignedUsers, workSiteElements, virtualState);
        }

        if (ggudino) {
            assignSpecificUsersByDay(dayIndex, ggudinoScheme, ggudino, assignedUsers, workSiteElements, virtualState);
        }

        if (nvela) {
            assignSpecificUsersByDay(dayIndex, nvelaScheme, nvela, assignedUsers, workSiteElements, virtualState);
        }

        if (rconsigli) {
            assignSpecificUsersByDay(dayIndex, rconsigliScheme, rconsigli, assignedUsers, workSiteElements, virtualState);
        }

    } catch (error) {
        console.error('Hubo un problema con la solicitud:', error.message);
    }
}

