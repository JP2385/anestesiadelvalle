import { isAlreadyAssigned,excludeAssignedUsers, countWeekdayShifts } from './shiftAssignmentsUtils.js';

export function assignWeekIm(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, assignedImUser) {
    let userShiftCounts = countWeekdayShifts();
    const excludedUsers = new Set();

    // Excluir usuarios que ya tienen asignaciones
    excludeAssignedUsers(selects, excludedUsers);
    
    // Verificar si ya hay un usuario asignado a Im
    assignedImUser = isAlreadyAssigned(selects, 'Im');
    if (assignedImUser) {
        const assignedUsername = assignedImUser.getAttribute('data-username');
    } else {

        // Si hay un usuario asignado a Fn, verificar si hace cardio
        if (assignedFnUser) {
            const isFnUserCardio = assignedFnUser.dataset.cardio === 'true';
            
            // Llamamos a la función de asignación con el chequeo de cardio según el usuario de Fn
            assignedImUser = assignShift(
                selects, 
                'Im', 
                isLharriagueAssignedToday, 
                isMquirogaAssignedToday, 
                excludedUsers, 
                userShiftCounts, 
                isFnUserCardio
            );
        } else {
            
            // Si no hay usuario asignado a Fn, el chequeo de cardio no es necesario (se pasa como `false`)
            assignedImUser = assignShift(
                selects, 
                'Im', 
                isLharriagueAssignedToday, 
                isMquirogaAssignedToday, 
                excludedUsers, 
                userShiftCounts, 
                false
            );
        }
    }

    return assignedImUser;
}


export function assignWeekFn(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, assignedFnUser) {
    let userShiftCounts = countWeekdayShifts();
    const excludedUsers = new Set();

    excludeAssignedUsers(selects, excludedUsers);
    assignedFnUser = isAlreadyAssigned(selects, 'Fn');

    if (!assignedFnUser) {
        // console.log(`Buscando asignación a Fn...`);
        
        // Aquí establecemos que no se requiere que el usuario asignado a Fn haga cardio, incluso si el de Im hace cardio
        assignedFnUser = assignShift(selects, 'Fn', isLharriagueAssignedToday, isMquirogaAssignedToday, excludedUsers, userShiftCounts, false);
    }

    return assignedFnUser;
}

function assignShift(selects, assignmentType, isLharriagueAssignedToday, isMquirogaAssignedToday, excludedUsers, userShiftCounts, isCardioCheck) {
    let minShifts = Math.min(...Object.values(userShiftCounts)); // Obtener el número mínimo de guardias
    let noAssignment = true; // Para rastrear si se hizo una asignación

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
                // Si hay una guardia asignada el día anterior, excluimos al usuario y saltamos a la siguiente iteración
                excludedUsers.add(username);
                console.log(`Excluyendo a ${username} porque tiene guardia asignada el día anterior (${previousDay}).`);
                continue;
            }

            // Chequeo final antes de asignar, verificando todas las condiciones
            if (select && !select.disabled && select.value === '' && shiftOption && isCardioUser) {
                if (isLharriagueAssignedToday && username === 'mquiroga') {
                    console.log(`No se asignará a mquiroga porque lharriague tiene guardia el día ${day}.`);
                    continue;
                }
                if (isMquirogaAssignedToday && username === 'lharriague') {
                    continue;
                }

                select.value = assignmentType;
                noAssignment = false; // Se hizo una asignación, salimos del ciclo
                console.log(`Asignando ${assignmentType} a ${username} en el día ${day}.`);
                return select; // Salimos del ciclo, ya hemos asignado
            }
        }

        // Si no se ha asignado ningún usuario, incrementamos el minShifts y reintentamos
        if (noAssignment) {
            minShifts++;
            console.log(`Incrementando minShifts a ${minShifts} y reintentando asignación.`);
        }
    }
    return null; // No se asignó ningún usuario
}

// Función auxiliar para obtener el día anterior en formato 'YYYY-MM-DD'
function getPreviousDay(currentDay) {
    const [year, month, day] = currentDay.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1); // Restamos un día
    return date.toISOString().slice(0, 10); // Retornamos en formato YYYY-MM-DD
}
