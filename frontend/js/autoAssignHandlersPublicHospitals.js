import { getWeekNumber } from './assignUtils.js';
import { assignSpecificUsersByDay } from './autoAssignDayFunctions.js';
import { getWorkSchemes } from './workSchemes.js';

export async function autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability) {
    try {
        const ltotis = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'ltotis');
        const lburgueño = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'lburgueño');
        const sdegreef = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'sdegreef');
        const lalvarez = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'lalvarez');

        const currentWeekNumber = getWeekNumber(new Date());
        const isOddWeek = currentWeekNumber % 2 !== 0;

        const {
            ltotisScheme,
            lburgueñoScheme,
            sdegreefScheme,
            lalvarezScheme
        } = getWorkSchemes(isOddWeek);

        // Asignar a ltotis si está disponible
        if (ltotis) {
            assignSpecificUsersByDay(dayIndex, ltotisScheme, ltotis);
        }

        // Asignar a lburgueño si está disponible
        if (lburgueño) {
            assignSpecificUsersByDay(dayIndex, lburgueñoScheme, lburgueño);
        }

        // Asignar a sdegreef si está disponible
        if (sdegreef) {
            assignSpecificUsersByDay(dayIndex, sdegreefScheme, sdegreef);
        }

        if (lalvarez ){
            assignSpecificUsersByDay(dayIndex, lalvarezScheme, lalvarez);
        }

    } catch (error) {
        console.error('Hubo un problema con la solicitud:', error.message);
    }
}

