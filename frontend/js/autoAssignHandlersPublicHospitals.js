import { getWeekNumber } from './assignUtils.js';
import { assignSpecificUsersByDay } from './autoAssignDayFunctions.js';
import { getWorkSchemes } from './workSchemes.js';

export async function autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability, assignedUsers) {
    try {
        const dayKey = Object.keys(availability)[dayIndex];
        const workSiteElements = document.querySelectorAll('.work-site');

        const msalvarezza = availability[dayKey].find(user => user.username === 'msalvarezza');
        const lburgueño = availability[dayKey].find(user => user.username === 'lburgueño');
        const sdegreef = availability[dayKey].find(user => user.username === 'sdegreef');
        const lalvarez = availability[dayKey].find(user => user.username === 'lalvarez');
        const bvalenti = availability[dayKey].find(user => user.username === 'bvalenti');

        const currentWeekNumber = getWeekNumber(new Date());
        const isOddWeek = currentWeekNumber % 2 !== 0;

        const {
            lburgueñoScheme,
            sdegreefScheme,
            lalvarezScheme,
            msalvarezzaScheme,
            bvalentiScheme,
        } = getWorkSchemes(isOddWeek);

        if (lburgueño) {
            assignSpecificUsersByDay(dayIndex, lburgueñoScheme, lburgueño, assignedUsers, workSiteElements);
        }

        if (sdegreef) {
            assignSpecificUsersByDay(dayIndex, sdegreefScheme, sdegreef, assignedUsers, workSiteElements);
        }

        if (lalvarez) {
            assignSpecificUsersByDay(dayIndex, lalvarezScheme, lalvarez, assignedUsers, workSiteElements);
        }

        if (msalvarezza) {
            assignSpecificUsersByDay(dayIndex, msalvarezzaScheme, msalvarezza, assignedUsers, workSiteElements);
        }

        if (bvalenti) {
            assignSpecificUsersByDay(dayIndex, bvalentiScheme, bvalenti, assignedUsers, workSiteElements);
        }

    } catch (error) {
        console.error('Hubo un problema con la solicitud:', error.message);
    }
}
