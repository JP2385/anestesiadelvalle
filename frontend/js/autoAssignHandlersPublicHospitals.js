import { getWeekNumber, updateSelectBackgroundColors } from './assignUtils.js';
import { assignSpecificUsersByDay } from './autoAssignDayFunctions.js';
import { getWorkSchemes } from './workSchemes.js';

export async function autoAssignPublicHospitals(apiUrl) {
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
            const lalvarez = users.find(user => user.username === 'lalvarez');
            const ltotis = users.find(user => user.username === 'ltotis');
            const lburgueño = users.find(user => user.username === 'lburgueño');
            const sdegreef = users.find(user => user.username === 'sdegreef');

            const currentWeekNumber = getWeekNumber(new Date());
            const isOddWeek = currentWeekNumber % 2 !== 0;

            const {
                lalvarezScheme,
                ltotisScheme,
                lburgueñoScheme,
                sdegreefScheme
            } = getWorkSchemes(isOddWeek);

            assignSpecificUsers(lalvarezScheme, lalvarez);
            assignSpecificUsers(ltotisScheme, ltotis);
            assignSpecificUsers(lburgueñoScheme, lburgueño);
            assignSpecificUsers(sdegreefScheme, sdegreef);

            // Actualizar colores de fondo después de la asignación automática
            updateSelectBackgroundColors();


        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}

export async function autoAssignPublicHospitalsByDay(apiUrl, dayIndex) {
    try {
        const response = await fetch(`${apiUrl}/availability`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const availability = await response.json();
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

        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}
