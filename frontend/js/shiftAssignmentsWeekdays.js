export function assignIm(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, assignedImUser) {
    let userShiftCounts = countWeekdayShifts();
    const excludedUsers = new Set();

    // Excluir usuarios que ya tienen asignaciones
    excludeAssignedUsers(selects, excludedUsers);
    
    // Verificar si ya hay un usuario asignado a Im
    assignedImUser = isAlreadyAssigned(selects, 'Im');

    if (!assignedImUser) {
        console.log(`Buscando asignación a Im...`);
        
        // Si hay un usuario asignado a Fn, verificar si hace cardio
        if (assignedFnUser) {
            const isFnUserCardio = assignedFnUser.dataset.cardio === 'true';
            
            // Llamamos a la función de asignación con el chequeo de cardio según el usuario de Fn
            assignedImUser = assignShift(selects, 'Im', isLharriagueAssignedToday, isMquirogaAssignedToday, excludedUsers, userShiftCounts, isFnUserCardio);
        } else {
            console.log(`No hay usuario asignado a Fn. Procediendo a asignar Im.`);
            
            // Si no hay usuario asignado a Fn, el chequeo de cardio no es necesario (se pasa como `false`)
            assignedImUser = assignShift(selects, 'Im', isLharriagueAssignedToday, isMquirogaAssignedToday, excludedUsers, userShiftCounts, false);
        }
    }

    return assignedImUser;
}

export function assignFn(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, assignedFnUser) {
    let userShiftCounts = countWeekdayShifts();
    const excludedUsers = new Set();

    excludeAssignedUsers(selects, excludedUsers);
    assignedFnUser = isAlreadyAssigned(selects, 'Fn');

    if (!assignedFnUser) {
        console.log(`Buscando asignación a Fn...`);
        
        // Aquí establecemos que no se requiere que el usuario asignado a Fn haga cardio, incluso si el de Im hace cardio
        assignedFnUser = assignShift(selects, 'Fn', isLharriagueAssignedToday, isMquirogaAssignedToday, excludedUsers, userShiftCounts, false);
    }

    return assignedFnUser;
}

// Función para contar las guardias asignadas a cada usuario en días de semana
export function countWeekdayShifts() {
    const userShiftCounts = {}; // Objeto para almacenar las guardias por usuario

    // Seleccionamos todas las filas de la tabla de usuarios
    const rows = document.querySelectorAll('#users-body tr');

    // Recorremos cada fila de la tabla de usuarios
    rows.forEach(row => {
        const username = row.cells[0].textContent.trim(); // Obtener el nombre de usuario de la primera celda
        const selects = row.querySelectorAll('td select'); // Obtener todos los selects de la fila

        // Inicializar el conteo de guardias para el usuario si no existe
        if (!userShiftCounts[username]) {
            userShiftCounts[username] = 0;
        }

        // Recorremos cada select en la fila (que corresponde a los días de semana)
        selects.forEach(select => {
            if (!select.disabled && select.value !== '' && select.value !== 'ND') {
                // Si el select está habilitado y tiene una asignación válida (no vacío y no "ND")
                userShiftCounts[username]++; // Incrementar el conteo de guardias para el usuario
            }
        });
    });

    return userShiftCounts; // Retornar el objeto con los conteos de guardias por usuario
}

function isAlreadyAssigned(selects, assignmentType) {
    for (const select of selects) {
        const username = select.getAttribute('data-username');
        const day = select.getAttribute('data-day');

        if (!username || !day) continue;

        if (select && !select.disabled && select.value === assignmentType) {
            console.log(`Ya está asignado a ${assignmentType}: ${username} en el día ${day}`);
            return select;  // Retornamos el select del usuario ya asignado
        }
    }
    return null; // No hay asignación previa
}

function excludeAssignedUsers(selects, excludedUsers) {
    selects.forEach(select => {
        const username = select.getAttribute('data-username');
        const dayOfWeek = select.getAttribute('data-dayofweek');

        if (!username || !dayOfWeek || select.disabled) return;

        if (['Lun', 'Mar', 'Mie', 'Jue'].includes(dayOfWeek) && select.value !== '' && select.value !== 'ND') {
            excludedUsers.add(username);
            console.log(`Excluyendo a ${username} porque tiene guardia asignada en la semana actual.`);
        }
    });
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
                console.log(`No se asignará a ${username} porque tiene más guardias (${userShiftCounts[username]}) que el mínimo permitido (${minShifts}).`);
                continue;
            }

            if (select && !select.disabled && select.value === '' && shiftOption && isCardioUser) {
                if (isLharriagueAssignedToday && username === 'mquiroga') {
                    console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`);
                    continue;
                }
                if (isMquirogaAssignedToday && username === 'lharriague') {
                    console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`);
                    continue;
                }

                select.value = assignmentType;
                console.log(`Asignando ${assignmentType} a ${username} en el día ${day}`);
                noAssignment = false; // Se hizo una asignación, salimos del ciclo
                return select; // Salimos del ciclo, ya hemos asignado
            }
        }

        // Si no se ha asignado ningún usuario, incrementamos el minShifts
        if (noAssignment) {
            console.log(`No se pudo asignar ${assignmentType}. Incrementando minShifts y reintentando...`);
            minShifts++;
        }
    }

    return null; // No se asignó ningún usuario
}


