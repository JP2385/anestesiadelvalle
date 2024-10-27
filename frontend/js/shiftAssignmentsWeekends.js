import { isAlreadyAssigned, excludeAssignedUsers, countWeekendShifts } from './shiftAssignmentsUtils.js';

export function assignWeekendIm(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, assignedImUser) {
    let userShiftCounts = countWeekendShifts();
    const excludedUsers = new Set();

    // Excluir usuarios que ya tienen asignaciones
    console.log("Ejecutando exclusión de usuarios");
    excludeAssignedUsers(selects, excludedUsers);
    console.log("Usuarios excluidos:", Array.from(excludedUsers));

    // Verificar si ya hay un usuario asignado a Im
    assignedImUser = isAlreadyAssigned(selects, 'Im');
    if (assignedImUser) {
        const assignedUsername = assignedImUser.getAttribute('data-username');
        console.log(`Ya hay un usuario asignado a Im: ${assignedUsername}`);
    } else {
        console.log("Buscando asignación a Im...");

        // Si hay un usuario asignado a Fn, verificar si hace cardio
        if (assignedFnUser) {
            const isFnUserCardio = assignedFnUser.dataset.cardio === 'true';
            const fnUsername = assignedFnUser.getAttribute('data-username');
            console.log(`Usuario asignado a Fn: ${fnUsername}, ¿Hace cardio?: ${isFnUserCardio}`);
            
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

            if (assignedImUser) {
                console.log(`Asignado a Im después de verificar cardio de Fn. Usuario: ${assignedImUser.getAttribute('data-username')}`);
            } else {
                console.log("No se pudo asignar a Im después de verificar cardio de Fn.");
            }
        } else {
            console.log("No hay usuario asignado a Fn. Procediendo a asignar Im sin chequeo de cardio.");
            
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

            if (assignedImUser) {
                console.log(`Asignado a Im sin chequeo de cardio. Usuario: ${assignedImUser.getAttribute('data-username')}`);
            } else {
                console.log("No se pudo asignar a Im sin chequeo de cardio.");
            }
        }
    }

    return assignedImUser;
}

export function assignWeekendFn(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, assignedFnUser) {
    let userShiftCounts = countWeekendShifts();
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

    // Intentar asignar con el minShifts actual
    while (noAssignment) {
        for (const select of selects) {
            const username = select.getAttribute('data-username');
            const day = select.getAttribute('data-day');
            const shiftOption = Array.from(select.options).find(option => option.value === assignmentType);
            const isCardioUser = isCardioCheck ? select.dataset.cardio === 'true' : true; // Chequeo de cardio

            if (!username || !day) continue;

            if (excludedUsers.has(username)) {
                console.log(`No se asignará a ${username} porque tiene guardia en la semana actual.`);
                continue;
            }

            if (userShiftCounts[username] > minShifts) {
                // console.log(`No se asignará a ${username} porque tiene más guardias (${userShiftCounts[username]}) que el mínimo permitido (${minShifts}).`);
                continue;
            }

            if (select && !select.disabled && select.value === '' && shiftOption && isCardioUser) {
                if (isLharriagueAssignedToday && username === 'mquiroga') {
                    // console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`);
                    continue;
                }
                if (isMquirogaAssignedToday && username === 'lharriague') {
                    // console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`);
                    continue;
                }

                select.value = assignmentType;
                // console.log(`Asignando ${assignmentType} a ${username} en el día ${day}`);
                noAssignment = false; // Se hizo una asignación, salimos del ciclo
                return select; // Salimos del ciclo, ya hemos asignado
            }
        }

        // Si no se ha asignado ningún usuario, incrementamos el minShifts
        if (noAssignment) {
            // console.log(`No se pudo asignar ${assignmentType}. Incrementando minShifts y reintentando...`);
            minShifts++;
        }
    }

    return null; // No se asignó ningún usuario
}