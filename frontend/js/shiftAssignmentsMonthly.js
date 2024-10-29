import { isAlreadyAssigned, excludeAssignedUsers, countWeekdayShifts, countWeekendShifts } from './shiftAssignmentsUtils.js';

export function assignIm(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, assignedImUser, isWeekend) {
    // Llamamos al conteo de guardias adecuado dependiendo de si es fin de semana o día de semana
    let userShiftCounts = isWeekend ? countWeekendShifts() : countWeekdayShifts();
    const excludedUsers = new Set();

    // En fin de semana, obtenemos selects de los cuatro días anteriores y el día actual para excluir usuarios de asignaciones recientes
    const extendedSelects = isWeekend ? getExtendedSelects(selects, 4) : selects;

    // Excluir usuarios que ya tienen asignaciones en el select actual (y en días anteriores si es fin de semana)
    excludeAssignedUsers(extendedSelects, excludedUsers);

    // Verificar si ya hay un usuario asignado a Im en el día actual
    assignedImUser = isAlreadyAssigned(selects, 'Im');
    if (!assignedImUser) {
        // Determinar si el usuario asignado a Fn hace cardio
        const isFnUserCardio = assignedFnUser ? assignedFnUser.dataset.cardio === 'true' : false;

        // Llamar a la función de asignación con el chequeo de cardio en función del usuario de Fn
        assignedImUser = assignShift(
            selects, 
            'Im', 
            isLharriagueAssignedToday, 
            isMquirogaAssignedToday, 
            excludedUsers, 
            userShiftCounts, 
            isFnUserCardio
        );
    }

    return assignedImUser;
}

export function assignFn(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, assignedFnUser, isWeekend) {
    // Seleccionamos el conteo de guardias según si es fin de semana o no
    let userShiftCounts = isWeekend ? countWeekendShifts() : countWeekdayShifts();
    const excludedUsers = new Set();

    // En fin de semana, obtenemos selects de los cuatro días anteriores y el día actual para excluir usuarios de asignaciones recientes
    const extendedSelects = isWeekend ? getExtendedSelects(selects, 4) : selects;

    // Excluir usuarios que ya tienen asignaciones en el select actual (y en días anteriores si es fin de semana)
    excludeAssignedUsers(extendedSelects, excludedUsers);

    // Verificar si ya hay un usuario asignado a Fn en el día actual
    assignedFnUser = isAlreadyAssigned(selects, 'Fn');
    if (!assignedFnUser) {
        // Llamar a la función de asignación, sin requerir chequeo de cardio
        assignedFnUser = assignShift(
            selects, 
            'Fn', 
            isLharriagueAssignedToday, 
            isMquirogaAssignedToday, 
            excludedUsers, 
            userShiftCounts, 
            false // El usuario de Fn no requiere hacer cardio
        );
    }

    return assignedFnUser;
}

// Función auxiliar para obtener selects de los días anteriores al actual, usada en fines de semana
function getExtendedSelects(selects, daysBack) {
    const extendedSelects = [...selects];
    selects.forEach(select => {
        const dayString = select.getAttribute('data-day'); // Formato YYYY-MM-DD
        const [year, month, day] = dayString.split('-').map(Number);
        const baseDate = new Date(year, month - 1, day);

        // Agregar selects de los días anteriores según el parámetro `daysBack`
        for (let i = 1; i <= daysBack; i++) {
            const previousDate = new Date(baseDate);
            previousDate.setDate(baseDate.getDate() - i);
            const formattedPrevDay = previousDate.toISOString().slice(0, 10); // Formato YYYY-MM-DD

            // Seleccionar el select correspondiente a la fecha anterior
            const prevSelects = Array.from(document.querySelectorAll(`.shift-select[data-day="${formattedPrevDay}"]`));
            extendedSelects.push(...prevSelects);
        }
    });
    return extendedSelects;
}

function assignShift(selects, assignmentType, isLharriagueAssignedToday, isMquirogaAssignedToday, excludedUsers, userShiftCounts, isCardioCheck, isWeekend) {
    let minShifts = Math.min(...Object.values(userShiftCounts)); // Obtener el número mínimo de guardias
    let noAssignment = true; // Para rastrear si se hizo una asignación
    
    // Intentar asignar hasta encontrar una asignación válida
    while (noAssignment) {
        for (const select of selects) {
            const username = select.getAttribute('data-username');
            const day = select.getAttribute('data-day');
            const dayNumber = parseInt(select.getAttribute('data-daynumber'), 10); // Obtener el número del día (0-6)
            const shiftOption = Array.from(select.options).find(option => option.value === assignmentType);
            const isCardioUser = isCardioCheck ? select.dataset.cardio === 'true' : true; // Chequeo de cardio

            if (!username || !day) continue;

            // Verificar si el usuario está excluido
            if (excludedUsers.has(username)) {
                continue;
            }

            // Verificar si el usuario tiene más guardias que el mínimo permitido
            if (userShiftCounts[username] > minShifts) {
                continue;
            }

            // Verificar si el día anterior tiene asignación
            const previousDay = getPreviousDay(day);
            const previousSelect = document.querySelector(`.shift-select[data-username="${username}"][data-day="${previousDay}"]`);
            if (previousSelect && previousSelect.value !== '') {
                excludedUsers.add(username); // Excluir usuario si tiene asignación el día anterior
                continue;
            }

            // Excluir usuario si tiene asignación en domingo y estamos asignando el lunes
            if (!isWeekend && dayNumber === 1) { // Lunes
                const sunday = getPreviousDay(day, 2); // Obtener el domingo anterior
                const sundaySelect = document.querySelector(`.shift-select[data-username="${username}"][data-day="${sunday}"]`);
                if (sundaySelect && sundaySelect.value !== '') {
                    excludedUsers.add(username);
                    continue;
                }
            }

            // Chequeo final antes de asignar, verificando todas las condiciones
            if (select && !select.disabled && select.value === '' && shiftOption && isCardioUser) {
                if (isLharriagueAssignedToday && username === 'mquiroga') {
                    continue;
                }
                if (isMquirogaAssignedToday && username === 'lharriague') {
                    continue;
                }

                select.value = assignmentType;
                noAssignment = false; // Se hizo una asignación, salimos del ciclo
                return select; // Retornamos el select asignado
            }
        }

        // Si no se ha asignado ningún usuario, incrementamos el minShifts y reintentamos
        if (noAssignment) {
            minShifts++;
        }
    }
    return null; // No se asignó ningún usuario
}

// Función auxiliar para obtener el día anterior en formato 'YYYY-MM-DD'
// Puede ajustar el offset para obtener días específicos antes (ej., -2 para domingo anterior)
function getPreviousDay(currentDay, offset = 1) {
    const [year, month, day] = currentDay.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - offset); // Restamos un día (o el offset dado)
    return date.toISOString().slice(0, 10); // Retornamos en formato YYYY-MM-DD
}

