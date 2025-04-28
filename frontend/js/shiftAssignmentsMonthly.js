import { isAlreadyAssigned, countWeekdayShifts, countWeekendShifts, countSaturdayShifts } from './shiftAssignmentsUtils.js';

export function assignIm(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, assignedImUser, isWeekend, accumulatedCounts) {
    console.log(`\nIniciando asignación de Im para el día: ${selects[0].getAttribute('data-day')}, es fin de semana: ${isWeekend}`);
    
    // Obtener conteo de guardias actual para el día, ya sea de fin de semana o de lunes a jueves
    let userShiftCounts = isWeekend ? countWeekendShifts() : countWeekdayShifts();

    // Sumar los acumulados previos a los conteos actuales
    Object.keys(userShiftCounts).forEach(username => {
        if (accumulatedCounts[username]) {
            // Sumamos acumulado de la semana o del fin de semana según el tipo de conteo
            const accumulated = isWeekend ? accumulatedCounts[username].weekend : accumulatedCounts[username].week;
            userShiftCounts[username] += accumulated;
        }
    });

    console.log("Conteo de guardias actual para cada usuario (inicio de asignación Im) con acumulados:", userShiftCounts);
    
    // Verificar si ya hay un usuario asignado a Im en el día actual
    assignedImUser = isAlreadyAssigned(selects, 'Im');
    console.log(`¿Ya hay usuario asignado a Im? ${assignedImUser ? 'Sí' : 'No'}`);

    if (!assignedImUser) {
        // Llamar a la función de asignación sin necesidad de verificar si Fn hace cardio
        assignedImUser = assignShift(
            selects, 
            'Im', 
            isLharriagueAssignedToday, 
            isMquirogaAssignedToday, 
            userShiftCounts, 
            false // No es necesario verificar cardio en este punto
        );

        if (assignedImUser) {
            console.log(`Asignación exitosa: Im asignado a ${assignedImUser.getAttribute('data-username')} para el día ${selects[0].getAttribute('data-day')}`);
        } else {
            console.log("No se pudo asignar Im tras iterar sobre los usuarios disponibles.");
        }
    } else {
        console.log(`Asignación omitida: Im ya está asignado a ${assignedImUser.getAttribute('data-username')}`);
    }

    return assignedImUser;
}

export function assignFn(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, assignedFnUser, isWeekend, accumulatedCounts) {
    console.log(`\nIniciando asignación de Fn para el día: ${selects[0].getAttribute('data-day')}, es fin de semana: ${isWeekend}`);
    
    // Obtener conteo de guardias actual para el día, ya sea de fin de semana o de lunes a jueves
    let userShiftCounts = isWeekend ? countWeekendShifts() : countWeekdayShifts();

    // Sumar los acumulados previos a los conteos actuales
    Object.keys(userShiftCounts).forEach(username => {
        if (accumulatedCounts[username]) {
            // Sumamos acumulado de la semana o del fin de semana según el tipo de conteo
            const accumulated = isWeekend ? accumulatedCounts[username].weekend : accumulatedCounts[username].week;
            userShiftCounts[username] += accumulated;
        }
    });

    console.log("Conteo de guardias actual para cada usuario (inicio de asignación Fn) con acumulados:", userShiftCounts);
    
    // Verificar si ya hay un usuario asignado a Fn en el día actual
    assignedFnUser = isAlreadyAssigned(selects, 'Fn');
    console.log(`¿Ya hay usuario asignado a Fn? ${assignedFnUser ? 'Sí' : 'No'}`);

    if (!assignedFnUser) {
        // Chequeo de cardio en Fn solo si Im no hace cardio
        const isFnUserCardioCheck = assignedImUser ? assignedImUser.dataset.cardio !== 'true' : true;
        console.log(`¿El usuario asignado a Im hace cardio? ${assignedImUser ? assignedImUser.dataset.cardio === 'true' : 'Ninguno asignado a Im'}`);
        
        assignedFnUser = assignShift(
            selects, 
            'Fn', 
            isLharriagueAssignedToday, 
            isMquirogaAssignedToday, 
            userShiftCounts, 
            isFnUserCardioCheck // Chequeo de cardio para Fn solo si Im no hace cardio
        );

        if (assignedFnUser) {
            console.log(`Asignación exitosa: Fn asignado a ${assignedFnUser.getAttribute('data-username')} para el día ${selects[0].getAttribute('data-day')}`);
        } else {
            console.log("No se pudo asignar Fn tras iterar sobre los usuarios disponibles.");
        }
    } else {
        console.log(`Asignación omitida: Fn ya está asignado a ${assignedFnUser.getAttribute('data-username')}`);
    }

    return assignedFnUser;
}


export function assignSaturdayP1(users, accumulatedCounts) {
    const rows = document.querySelectorAll('#users-body tr');
    const daysInMonth = document.querySelectorAll('.shift-select[data-day]');

    // Filtrar y ordenar los selects para obtener solo los días sábado en orden cronológico
    const saturdays = Array.from(daysInMonth)
        .filter(select => parseInt(select.getAttribute('data-daynumber'), 10) === 6) // Solo sábados
        .sort((a, b) => new Date(a.getAttribute('data-day')) - new Date(b.getAttribute('data-day'))); // Ordenar por fecha

    saturdays.forEach(saturdaySelect => {
        const currentDay = saturdaySelect.getAttribute('data-day');

        // Verificar si ya existe una asignación de "P1" en el sábado actual
        const isP1Assigned = Array.from(document.querySelectorAll(`.shift-select[data-day="${currentDay}"]`))
            .some(select => select.value === 'P1');

        if (!isP1Assigned) {
            // Contar asignaciones "P1" en el mes actual
            let userShiftCounts = countSaturdayShifts();

            // Sumar acumulado previo de "P1" en sábados al conteo actual
            Object.keys(userShiftCounts).forEach(username => {
                if (accumulatedCounts[username]) {
                    userShiftCounts[username] += accumulatedCounts[username].saturday || 0;
                }
            });

            // Elegir al usuario con el menor total acumulado y actual de "P1"
            const sortedUsers = Array.from(rows)
                .map(row => {
                    const username = row.cells[0].textContent.trim();
                    const totalP1Shifts = userShiftCounts[username] || 0;
                    return { row, username, totalP1Shifts };
                })
                .sort((a, b) => a.totalP1Shifts - b.totalP1Shifts);

            // Intentar asignar "P1" al primer usuario disponible de la lista ordenada
            for (const user of sortedUsers) {
                const select = user.row.querySelector(`.shift-select[data-day="${currentDay}"]`);
                
                // Verificar si el select está habilitado antes de asignar "P1"
                if (select && !select.disabled && select.value === '') {
                    select.value = 'P1';
                    console.log(`Asignado P1 a ${user.username} para el sábado ${currentDay} con acumulado incluido.`);
                    break; // Salir del bucle al encontrar una asignación exitosa
                } else {
                    console.log(`No se puede asignar P1 a ${user.username} para el sábado ${currentDay} porque el select está deshabilitado o ya tiene un valor.`);
                }
            }
        }
    });
}




// Función para asignar automáticamente a mmelo los mismos días si ltotis tiene asignaciones de fin de semana, excepto si ltotis tiene asignado P1
export function assignWeekendIfLtotisAssigned(users) {
    const daysInMonth = document.querySelectorAll('.shift-select[data-day]');

    // Filtrar selects de viernes, sábado y domingo para el usuario ltotis
    const weekendSelectsLtotis = Array.from(daysInMonth).filter(select => {
        const username = select.getAttribute('data-username');
        const dayNumber = parseInt(select.getAttribute('data-daynumber'), 10); // Número del día (0=Dom, 5=Vie, 6=Sab)
        const value = select.value;

        // Revisar si es viernes, sábado o domingo, si ltotis tiene asignación válida y no es P1
        return username === 'ltotis' && (dayNumber === 5 || dayNumber === 6 || dayNumber === 0) &&
               value !== '' && value !== 'ND' && value !== 'P1' && !select.disabled;
    });

    // Asignar los mismos días a mmelo si ltotis tiene asignaciones de fin de semana
    weekendSelectsLtotis.forEach(select => {
        const day = select.getAttribute('data-day');
        const assignedValue = select.value;

        // Seleccionar el select de mmelo para el mismo día y asignar el mismo valor
        const mmeloSelect = document.querySelector(`.shift-select[data-username="mmelo"][data-day="${day}"]`);
        if (mmeloSelect && mmeloSelect.value === '') { // Solo asignar si está vacío
            mmeloSelect.value = assignedValue;
            console.log(`Asignando a mmelo ${assignedValue} para el día ${day} (mismo que ltotis, excluyendo P1)`);
        }
    });
}


function assignShift(selects, assignmentType, isLharriagueAssignedToday, isMquirogaAssignedToday, userShiftCounts, isCardioCheck, isWeekend) {
    let minShifts = Math.min(...Object.values(userShiftCounts).filter(count => count > 0));
    let maxShifts = calculateMaxShifts(userShiftCounts); // Inicialización de maxShifts como el valor más común en userShiftCounts
    let noAssignment = true; // Para rastrear si se hizo una asignación
    let ignoreRestrictions = false; // Indicador para ignorar restricciones cuando se supera maxShifts
    let highestShiftCount = Math.max(...Object.values(userShiftCounts)); // Mayor cantidad de guardias asignadas

    console.log(`\nIniciando asignación para ${assignmentType}`);
    console.log(`minShifts al inicio: ${minShifts}`);
    console.log(`maxShifts al inicio: ${maxShifts}`);
    console.log(`¿Es fin de semana? ${isWeekend}`);
    console.log(`Chequeo de cardio para asignación: ${isCardioCheck}`);

    while (noAssignment) {
        console.log(`\nIntento de asignación con minShifts = ${minShifts} y maxShifts = ${maxShifts}`);

        for (const select of selects) {
            const username = select.getAttribute('data-username');
            const day = select.getAttribute('data-day');
            const dayNumber = parseInt(select.getAttribute('data-daynumber'), 10); // Obtener el número del día (0-6)
            const shiftOption = Array.from(select.options).find(option => option.value === assignmentType);
            const isCardioUser = isCardioCheck ? select.dataset.cardio === 'true' : true; // Chequeo de cardio

            if (!username || !day) {
                console.log(`Select sin username o day: ${select}`);
                continue;
            }

            console.log(`Evaluando ${username} para el día ${day}`);
            console.log(`Guardias actuales de ${username}: ${userShiftCounts[username]}`);
            console.log(`Mínimo permitido para asignación: ${minShifts}`);

            // Verificar si el usuario tiene más guardias que el mínimo permitido
            if (userShiftCounts[username] > minShifts) {
                console.log(`${username} tiene más guardias que el mínimo. Saltando.`);
                continue;
            }

            // Verificar restricciones solo si ignoreRestrictions es falso
            if (!ignoreRestrictions) {
                // Verificar si el día anterior tiene asignación
                const previousDay = getPreviousDay(day);
                const previousSelect = document.querySelector(`.shift-select[data-username="${username}"][data-day="${previousDay}"]`);
                if (previousSelect && previousSelect.value !== '') {
                    console.log(`${username} ya tiene asignación el día anterior (${previousDay}). Saltando.`);
                    continue;
                }

                // Excluir usuario si tiene asignación en domingo y estamos asignando el lunes
                if (!isWeekend && dayNumber === 1) { // Lunes
                    const sunday = getPreviousDay(day, 2); // Obtener el domingo anterior
                    const sundaySelect = document.querySelector(`.shift-select[data-username="${username}"][data-day="${sunday}"]`);
                    if (sundaySelect && sundaySelect.value !== '') {
                        console.log(`${username} ya tiene asignación el domingo anterior (${sunday}). Saltando.`);
                        continue;
                    }
                }
            }

            if (username === 'mquiroga' && isLharriagueAssignedToday) {
                console.log(`No se asigna a mquiroga porque lharriague ya fue asignada hoy.`);
                continue;
            }

            if (username === 'lharriague' && isMquirogaAssignedToday) {
                console.log(`No se asigna a lharriague porque mquiroga ya fue asignado hoy.`);
                continue;
            }

            // Chequeo final antes de asignar, verificando todas las condiciones
            if (select && !select.disabled && select.value === '' && shiftOption && isCardioUser) {
                console.log(`Asignación exitosa: ${assignmentType} asignado a ${username} para el día ${day}`);
                select.value = assignmentType;
                noAssignment = false; // Se hizo una asignación, salimos del ciclo
                return select; // Retornamos el select asignado
            }

            console.log(`${username} no cumple con todos los requisitos para la asignación.`);
        }

        // Si no se ha asignado ningún usuario, incrementamos minShifts
        if (noAssignment) {
            minShifts++;
            console.log(`No se encontró una asignación válida. Incrementando minShifts a ${minShifts} y reintentando.`);

            // Activar ignorar restricciones si minShifts supera maxShifts
            if (minShifts > maxShifts) {
                ignoreRestrictions = true;
                console.log(`Superado maxShifts. Ignorando restricciones de asignación consecutiva.`);
                
                // Si minShifts vuelve a alcanzar maxShifts después de ignorar restricciones, incrementamos maxShifts
                if (minShifts >= maxShifts) {
                    maxShifts++; 
                    console.log(`Incrementando maxShifts a ${maxShifts}`);
                }

                // Si maxShifts supera la mayor cantidad de guardias asignadas a un usuario, terminamos la función
                if (maxShifts > highestShiftCount) {
                    console.log(`MaxShifts (${maxShifts}) ha superado la cantidad máxima de guardias de un usuario (${highestShiftCount}). Finalizando asignación.`);
                    return null;
                }
            }
        }
    }
    
    console.log(`No se pudo asignar ${assignmentType} a ningún usuario para el día ${day}.`);
    return null; // No se asignó ningún usuario
}




// Puede ajustar el offset para obtener días específicos antes (ej., -2 para domingo anterior)
function getPreviousDay(currentDay, offset = 1) {
    const [year, month, day] = currentDay.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - offset); // Restamos un día (o el offset dado)
    return date.toISOString().slice(0, 10); // Retornamos en formato YYYY-MM-DD
}

function calculateMaxShifts(userShiftCounts) {
    const counts = Object.values(userShiftCounts).filter(count => count !== 0);

    if (counts.length === 0) {
        return 0; // Retorna 0 si no hay valores distintos de 0
    }

    // Calcular el promedio
    const sum = counts.reduce((acc, count) => acc + count, 0);
    const averageShiftCount = Math.round(sum / counts.length);

    return averageShiftCount;
}


