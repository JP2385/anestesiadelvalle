import { isAlreadyAssigned, countWeekdayShifts, countWeekendShifts, countSaturdayShifts, countSaturdayP2Shifts } from './shiftAssignmentsUtils.js';

// Función para hacer shuffle de un array usando Fisher-Yates
function shuffleArray(array) {
    const shuffled = [...array]; // Crear copia para no mutar el original
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

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

    // Verificar si ya hay un usuario asignado a Im en el día actual
    assignedImUser = isAlreadyAssigned(selects, 'Im');
    if (!assignedImUser) {
        assignedImUser = assignShift(
            selects,
            'Im',
            isLharriagueAssignedToday,
            isMquirogaAssignedToday,
            userShiftCounts,
            false // No es necesario verificar cardio en este punto
        );

        if (assignedImUser) {
            console.log(`Im asignado a ${assignedImUser.getAttribute('data-username')}`);
        } else {
            console.log('No se pudo asignar Im');
        }
    } else {
        console.log(`Im ya asignado a ${assignedImUser.getAttribute('data-username')}`);
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
        
        // Verificar si el día es feriado, si es así, saltar la asignación
        const cell = saturdaySelect.closest('td');
        if (cell && cell.classList.contains('holiday')) {
            console.log(`Saltando asignación P1 en ${currentDay} porque es feriado`);
            return;
        }

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
                // excluir al usuario rriso
                if (user.username === 'rriso') {
                continue;
                }
                // excluir al usuario jbo
                if (user.username === 'jbo') {
                continue;
                }

                // Verificar si el usuario ya fue asignado a P1 o P2 en algún sábado del mes
                const userSaturdaySelects = user.row.querySelectorAll('select[data-daynumber="6"]');
                const hasP1OrP2Assignment = Array.from(userSaturdaySelects).some(satSelect => 
                    satSelect.value === 'P1' || satSelect.value === 'P2'
                );

                if (hasP1OrP2Assignment) {
                    console.log(`Usuario ${user.username} ya tiene asignación P1 o P2 en el mes, excluyendo para P1 en ${currentDay}.`);
                    continue;
                }

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

export function assignSaturdayP2(users, accumulatedCounts) {
    const rows = document.querySelectorAll('#users-body tr');
    const daysInMonth = document.querySelectorAll('.shift-select[data-day]');

    // Filtrar y ordenar los selects para obtener solo los días sábado en orden cronológico
    const saturdays = Array.from(daysInMonth)
        .filter(select => parseInt(select.getAttribute('data-daynumber'), 10) === 6) // Solo sábados
        .sort((a, b) => new Date(a.getAttribute('data-day')) - new Date(b.getAttribute('data-day'))); // Ordenar por fecha

    saturdays.forEach(saturdaySelect => {
        const currentDay = saturdaySelect.getAttribute('data-day');
        
        // Verificar si el día es feriado, si es así, saltar la asignación
        const cell = saturdaySelect.closest('td');
        if (cell && cell.classList.contains('holiday')) {
            console.log(`Saltando asignación P2 en ${currentDay} porque es feriado`);
            return;
        }

        // Verificar si ya existe una asignación de "P2" en el sábado actual
        const isP2Assigned = Array.from(document.querySelectorAll(`.shift-select[data-day="${currentDay}"]`))
            .some(select => select.value === 'P2');

        if (!isP2Assigned) {
            // Obtener el usuario asignado a P1 en este sábado
            const p1Select = Array.from(document.querySelectorAll(`.shift-select[data-day="${currentDay}"]`))
                .find(select => select.value === 'P1');
            
            if (p1Select) {
                const p1Username = p1Select.getAttribute('data-username');
                const p1User = users.find(user => user.username === p1Username);
                
                // Contar asignaciones "P2" en el mes actual
                let userShiftCounts = countSaturdayP2Shifts();

                // Sumar acumulado previo de "P2" en sábados al conteo actual
                Object.keys(userShiftCounts).forEach(username => {
                    if (accumulatedCounts[username]) {
                        userShiftCounts[username] += accumulatedCounts[username].saturday || 0;
                    }
                });

                // Filtrar usuarios según la lógica de pairing regional
                let eligibleUsers = Array.from(rows)
                    .map(row => {
                        const username = row.cells[0].textContent.trim();
                        const user = users.find(u => u.username === username);
                        const totalP2Shifts = userShiftCounts[username] || 0;
                        return { row, username, user, totalP2Shifts };
                    })
                    .filter(userObj => {
                        // Excluir usuarios específicos
                        if (userObj.username === 'rriso' || userObj.username === 'jbo') {
                            return false;
                        }
                        
                        // Excluir el usuario ya asignado a P1
                        if (userObj.username === p1Username) {
                            return false;
                        }

                        // Verificar si el usuario ya fue asignado a P1 o P2 en algún sábado del mes
                        const userSaturdaySelects = userObj.row.querySelectorAll('select[data-daynumber="6"]');
                        const hasP1OrP2Assignment = Array.from(userSaturdaySelects).some(satSelect => 
                            satSelect.value === 'P1' || satSelect.value === 'P2'
                        );

                        if (hasP1OrP2Assignment) {
                            console.log(`Usuario ${userObj.username} ya tiene asignación P1 o P2 en el mes, excluyendo para P2 en ${currentDay}.`);
                            return false;
                        }

                        if (!userObj.user) return false;

                        // Aplicar lógica de pairing regional
                        if (p1User.worksInPrivateRioNegro && !p1User.worksInPrivateNeuquen) {
                            // P1 es de Río Negro, P2 debe ser de Neuquén
                            return userObj.user.worksInPrivateNeuquen;
                        } else if (p1User.worksInPrivateNeuquen && !p1User.worksInPrivateRioNegro) {
                            // P1 es de Neuquén, P2 debe ser de Neuquén
                            return userObj.user.worksInPrivateNeuquen;
                        } else if (p1User.worksInPrivateRioNegro && p1User.worksInPrivateNeuquen) {
                            // P1 es mixto, P2 puede ser cualquiera que trabaje en privado
                            return userObj.user.worksInPrivateRioNegro || userObj.user.worksInPrivateNeuquen;
                        } else {
                            // P1 no trabaja en privado, P2 puede ser cualquiera
                            return true;
                        }
                    })
                    .sort((a, b) => a.totalP2Shifts - b.totalP2Shifts);

                // Intentar asignar "P2" al primer usuario disponible de la lista filtrada
                for (const userObj of eligibleUsers) {
                    const select = userObj.row.querySelector(`.shift-select[data-day="${currentDay}"]`);
                    
                    // Verificar si el select está habilitado antes de asignar "P2"
                    if (select && !select.disabled && select.value === '') {
                        select.value = 'P2';
                        console.log(`Asignado P2 a ${userObj.username} para el sábado ${currentDay}. P1 asignado a ${p1Username} (RN: ${p1User.worksInPrivateRioNegro}, NQ: ${p1User.worksInPrivateNeuquen}).`);
                        break; // Salir del bucle al encontrar una asignación exitosa
                    } else {
                        console.log(`No se puede asignar P2 a ${userObj.username} para el sábado ${currentDay} porque el select está deshabilitado o ya tiene un valor.`);
                    }
                }
            } else {
                console.log(`No se encontró usuario asignado a P1 para el sábado ${currentDay}, no se puede asignar P2.`);
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
        }
    });
}


function assignShift(selects, assignmentType, isLharriagueAssignedToday, isMquirogaAssignedToday, userShiftCounts, isCardioCheck, isWeekend) {
    // Hacer shuffle del array de selects para aleatorizar el orden de asignación
    const shuffledSelects = shuffleArray(selects);
    
    let minShifts = Math.min(...Object.values(userShiftCounts).filter(count => count > 0));
    let maxShifts = calculateMaxShifts(userShiftCounts); // Inicialización de maxShifts como el valor más común en userShiftCounts
    let noAssignment = true; // Para rastrear si se hizo una asignación
    let ignoreRestrictions = false; // Indicador para ignorar restricciones cuando se supera maxShifts
    let highestShiftCount = Math.max(...Object.values(userShiftCounts)); // Mayor cantidad de guardias asignadas

    while (noAssignment) {

        for (const select of shuffledSelects) {
            const username = select.getAttribute('data-username');
            
            // 🔴 EXCLUIR rriso de toda asignación automática
            if (username === 'rriso') {
                continue;
            }
            // 🔴 EXCLUIR jbo de toda asignación automática
            if (username === 'jbo') {
                continue;
            }
            const day = select.getAttribute('data-day');
            const dayNumber = parseInt(select.getAttribute('data-daynumber'), 10); // Obtener el número del día (0-6)
            const shiftOption = Array.from(select.options).find(option => option.value === assignmentType);
            const isCardioUser = isCardioCheck ? select.dataset.cardio === 'true' : true; // Chequeo de cardio

            if (!username || !day) {
                continue;
            }

            // Verificar si el usuario tiene más guardias que el mínimo permitido
            if (userShiftCounts[username] > minShifts) {
                continue;
            }

            // Verificar restricciones solo si ignoreRestrictions es falso
            if (!ignoreRestrictions) {
                // Verificar si el día anterior tiene asignación, excepto si es viernes y el usuario es nvela
                const previousDay = getPreviousDay(day);
                const previousSelect = document.querySelector(`.shift-select[data-username="${username}"][data-day="${previousDay}"]`);
                const isFriday = dayNumber === 5;

                if (
                    previousSelect &&
                    previousSelect.value !== '' &&
                    !(isFriday && (username === 'nvela' || username === 'msalvarezza'))
                ) {
                    continue;
                }

                // Excluir usuario si tiene asignación en domingo y estamos asignando el lunes
                if (!isWeekend && dayNumber === 1) { // Lunes
                    const sunday = getPreviousDay(day, 2); // Obtener el domingo anterior
                    const sundaySelect = document.querySelector(`.shift-select[data-username="${username}"][data-day="${sunday}"]`);
                    if (sundaySelect && sundaySelect.value !== '') {
                        continue;
                    }
                }
            }

            if (username === 'mquiroga' && isLharriagueAssignedToday) {
                continue;
            }

            if (username === 'lharriague' && isMquirogaAssignedToday) {
                continue;
            }

            // Chequeo final antes de asignar, verificando todas las condiciones
            if (select && !select.disabled && select.value === '' && shiftOption && isCardioUser) {
                select.value = assignmentType;
                noAssignment = false; // Se hizo una asignación, salimos del ciclo
                return select; // Retornamos el select asignado
            }
        }

        // Si no se ha asignado ningún usuario, incrementamos minShifts
        if (noAssignment) {
            minShifts++;

            // Activar ignorar restricciones si minShifts supera maxShifts
            if (minShifts > maxShifts) {
                ignoreRestrictions = true;
                
                // Si minShifts vuelve a alcanzar maxShifts después de ignorar restricciones, incrementamos maxShifts
                if (minShifts >= maxShifts) {
                    maxShifts++; 
                }

                // Si maxShifts supera la mayor cantidad de guardias asignadas a un usuario, terminamos la función
                if (maxShifts > highestShiftCount) {
                    return null;
                }
            }
        }
    }
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


