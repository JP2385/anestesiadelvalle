import { getWeekNumber, updateSelectBackgroundColors } from './assignUtils.js';
import { assignSpecificUsersByDay } from './autoAssignDayFunctions.js';
import { getWorkSchemes } from './workSchemes.js';

export async function autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability) {
    try {
        const lalvarez = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'lalvarez');
        const ltotis = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'ltotis');
        const lburgueño = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'lburgueño');
        const sdegreef = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'sdegreef');

        const currentWeekNumber = getWeekNumber(new Date());
        const isOddWeek = currentWeekNumber % 2 !== 0;

        const {
            lalvarezScheme,
            ltotisScheme,
            lburgueñoScheme,
            sdegreefScheme
        } = getWorkSchemes(isOddWeek);

        assignSpecificUsersByDay(dayIndex, lalvarezScheme, lalvarez);
        assignSpecificUsersByDay(dayIndex, ltotisScheme, ltotis);
        assignSpecificUsersByDay(dayIndex, lburgueñoScheme, lburgueño);
        assignSpecificUsersByDay(dayIndex, sdegreefScheme, sdegreef);

        // Actualizar colores de fondo después de la asignación automática
        updateSelectBackgroundColors();

    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}
