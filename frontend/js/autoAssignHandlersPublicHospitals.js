import { getWeekNumber } from './assignUtils.js';
import { assignSpecificUsersByDay } from './autoAssignDayFunctions.js';
import { getWorkSchemes } from './workSchemes.js';

export async function autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability) {
    try {
        const msalvarezza = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'msalvarezza');
        const lburgueño = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'lburgueño');
        const sdegreef = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'sdegreef');
        const lalvarez = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'lalvarez');
        const bvalenti = availability[Object.keys(availability)[dayIndex]].find(user => user.username === 'bvalenti');

        const currentWeekNumber = getWeekNumber(new Date());
        const isOddWeek = currentWeekNumber % 2 !== 0;

        const {
            lburgueñoScheme,
            sdegreefScheme,
            lalvarezScheme,
            msalvarezzaScheme,
            bvalentiScheme,
        } = getWorkSchemes(isOddWeek);

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

        if (msalvarezza ){
            assignSpecificUsersByDay(dayIndex, msalvarezzaScheme, msalvarezza);
        }
        if (bvalenti) {
            assignSpecificUsersByDay(dayIndex, bvalentiScheme, bvalenti);
        }

    } catch (error) {
        console.error('Hubo un problema con la solicitud:', error.message);
    }
}

