import { isAlreadyAssigned, countWeekdayShifts, countWeekendShifts, countSaturdayShifts } from './shiftAssignmentsUtils.js';

export function assignIm(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, assignedImUser, isWeekend) {
    let userShiftCounts = isWeekend ? countWeekendShifts() : countWeekdayShifts();

    // Verificar si ya hay un usuario asignado a Im en el día actual
    assignedImUser = isAlreadyAssigned(selects, 'Im');

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
    }

    return assignedImUser;
}

export function assignFn(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, assignedFnUser, isWeekend) {
    let userShiftCounts = isWeekend ? countWeekendShifts() : countWeekdayShifts();

    // Verificar si ya hay un usuario asignado a Fn en el día actual
    assignedFnUser = isAlreadyAssigned(selects, 'Fn');

    if (!assignedFnUser) {
        // Forzar chequeo de cardio en Fn si aún no hay asignación
        const isFnUserCardioCheck = true;
        
        assignedFnUser = assignShift(
            selects, 
            'Fn', 
            isLharriagueAssignedToday, 
            isMquirogaAssignedToday, 
            userShiftCounts, 
            isFnUserCardioCheck // Fuerza el chequeo de cardio en Fn
        );
    }

    return assignedFnUser;
}


export function assignSaturdayP1(users) {
    const rows = document.querySelectorAll('#users-body tr');
    const daysInMonth = document.querySelectorAll('.shift-select[data-day]');

    // Filtrar y ordenar los selects para obtener solo los días sábado en orden cronológico
    const saturdays = Array.from(daysInMonth)
        .filter(select => parseInt(select.getAttribute('data-daynumber'), 10) === 6) // Solo sábados
        .sort((a, b) => new Date(a.getAttribute('data-day')) - new Date(b.getAttribute('data-day'))); // Ordenar por fecha

    console.log("Total de sábados a procesar:", saturdays.length);

    saturdays.forEach(saturdaySelect => {
        const currentDay = saturdaySelect.getAttribute('data-day');
        console.log(`\nProcesando sábado: ${currentDay}`);

        // Verificar si ya existe una asignación de "P1" en el sábado actual
        const isP1Assigned = Array.from(document.querySelectorAll(`.shift-select[data-day="${currentDay}"]`))
            .some(select => select.value === 'P1');

        if (isP1Assigned) {
            console.log(`P1 ya asignado para el sábado ${currentDay}. Saltando.`);
            return; // Si ya hay una asignación "P1", pasar al siguiente sábado
        }

        let assigned = false; // Flag para seguimiento de asignación

        // Intentar asignar a un usuario que no tenga guardia en sábado en el mes actual
        for (const row of rows) {
            const username = row.cells[0].textContent.trim();
            const select = row.querySelector(`.shift-select[data-day="${currentDay}"]`);

            if (select && !select.disabled && select.value === '') {
                // Verificar que el usuario no tenga otra guardia en sábado en el mes
                const hasSaturdayShift = Array.from(row.querySelectorAll('.shift-select[data-daynumber="6"]'))
                    .some(satSelect => satSelect.value !== '' && satSelect.value !== 'ND');

                console.log(`Verificando usuario ${username} para el sábado ${currentDay}. ¿Tiene guardia previa en sábado?: ${hasSaturdayShift}`);

                if (!hasSaturdayShift) {
                    select.value = 'P1';
                    assigned = true;
                    console.log(`Asignado P1 a ${username} para el sábado ${currentDay}`);
                    break; // Salir del bucle una vez asignado "P1" para este sábado
                }
            }
        }

        // Si no se asignó "P1" a un usuario sin guardias en sábado, asignar al usuario con menos asignaciones de "P1" en sábados
        if (!assigned) {
            const saturdayP1Counts = countSaturdayShifts(); // Obtenemos el conteo de "P1" en sábados
            console.log("Conteo de P1 actual en sábados por usuario:", saturdayP1Counts);

            let minP1Shifts = Infinity;
            let candidate = null;

            rows.forEach(row => {
                const username = row.cells[0].textContent.trim();
                const p1Shifts = saturdayP1Counts[username] || 0;

                console.log(`Usuario: ${username}, P1 en sábados: ${p1Shifts}`);

                if (p1Shifts < minP1Shifts) {
                    minP1Shifts = p1Shifts;
                    candidate = { row, username };
                }
            });

            if (candidate) {
                const select = candidate.row.querySelector(`.shift-select[data-day="${currentDay}"]`);
                select.value = 'P1';
                console.log(`Asignado P1 a ${candidate.username} para el sábado ${currentDay} como última opción`);
            } else {
                console.log(`No se encontró un candidato para asignar P1 el sábado ${currentDay}`);
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

            // Verificar si el usuario tiene más guardias que el mínimo permitido
            if (userShiftCounts[username] > minShifts) {
                continue;
            }

            // Verificar si el día anterior tiene asignación
            const previousDay = getPreviousDay(day);
            const previousSelect = document.querySelector(`.shift-select[data-username="${username}"][data-day="${previousDay}"]`);
            if (previousSelect && previousSelect.value !== '') {
                continue; // Saltar si el usuario ya tiene una guardia el día anterior
            }

            // Excluir usuario si tiene asignación en domingo y estamos asignando el lunes
            if (!isWeekend && dayNumber === 1) { // Lunes
                const sunday = getPreviousDay(day, 2); // Obtener el domingo anterior
                const sundaySelect = document.querySelector(`.shift-select[data-username="${username}"][data-day="${sunday}"]`);
                if (sundaySelect && sundaySelect.value !== '') {
                    continue; // Saltar si el usuario ya tiene una guardia el domingo anterior
                }
            }

            // Chequeo final antes de asignar, verificando todas las condiciones
            if (select && !select.disabled && select.value === '' && shiftOption && isCardioUser) {
                if (isLharriagueAssignedToday && username === 'mquiroga') continue;
                if (isMquirogaAssignedToday && username === 'lharriague') continue;

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