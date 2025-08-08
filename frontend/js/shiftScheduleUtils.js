import { assignIm, assignFn, assignWeekendIfLtotisAssigned, assignSaturdayP1} from './shiftAssignmentsMonthly.js';
import { countWeekdayShifts, countWeekendShifts, countSaturdayShifts } from './shiftAssignmentsUtils.js';
import { calculateAccumulatedShiftCounts} from './shiftCountTable.js';
import { fetchLastDayAssignments} from './shiftLastDayAssignments.js';
import { isHoliday } from './fetchHolidays.js';
import { getMeetingDateForMonth } from './meetingsUtils.js';


// Función auxiliar para obtener el número de días de un mes y año
export function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}


// Función para obtener los usuarios desde la API
export function fetchUsers(apiUrl, callback) {
    console.log("Llamando a la API para obtener usuarios..."); // Log de inicio de fetchUsers

    fetch(`${apiUrl}/auth/users`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(response => response.json())
    .then(users => {
        console.log("Usuarios obtenidos:", users); // Confirmar que se obtienen los usuarios
        callback(users);
    })
    .catch(error => {
        console.error('Hubo un problema al obtener la lista de usuarios:', error.message);
    });
}


function generateTable(users, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader, existingSchedule = null, apiUrl) {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);

    // Limpiamos el contenido anterior
    daysHeader.innerHTML = '<th class="user">Anestesiólogo</th>';
    usersBody.innerHTML = '';

    // Obtenemos el número de días en el mes seleccionado
    const daysInMonth = getDaysInMonth(year, month);

    // Generamos encabezados con los días del mes y sus abreviaturas
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const th = document.createElement('th');
        th.textContent = `${dayAbbreviations[dayOfWeek]} ${day}`;

        // Añadir clase 'weekend' para los sábados y domingos
        if (dayOfWeek === 6 || dayOfWeek === 0) { // 6 = sábado, 0 = domingo
            th.classList.add('weekend');
        }

        daysHeader.appendChild(th);
    }

    // Crear un mapa con la configuración de selects del horario existente, si hay uno
    const selectConfigMap = existingSchedule 
        ? Object.fromEntries(existingSchedule.selectConfig.map(config => [`${config.username}-${config.day}`, config]))
        : {};

    users.forEach(user => {
        const row = document.createElement('tr');
        const userCell = document.createElement('td');
        userCell.textContent = user.username;
        userCell.classList.add('user');
        row.appendChild(userCell);

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('td');
            const select = document.createElement('select');
            select.classList.add('shift-select');

            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            const dayOfWeekAbbreviation = dayAbbreviations[dayOfWeek];
            const isSaturday = dayOfWeek === 6;
            const isSunday = dayOfWeek === 0;

            const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const selectKey = `${user.username}-${dayString}`;

            // Aplicar clase 'weekend' para los sábados y domingos
            if (isSaturday || isSunday) {
                cell.classList.add('weekend');
            }

            // Asignar atributos de data al select
            select.setAttribute('data-username', user.username);
            select.setAttribute('data-day', dayString);
            select.setAttribute('data-dayOfWeek', dayOfWeekAbbreviation);
            select.setAttribute('data-daynumber', dayOfWeek);
            select.setAttribute('data-cardio', user.doesCardio);

            // Poblar el select con opciones regulares
            populateShiftSelect(select, user, isSaturday, guardSites);

            // Si existe una configuración de asignación, solo seleccionar la opción sin sobrescribir las existentes
            const existingConfig = selectConfigMap[selectKey];
            if (existingConfig) {
                select.value = existingConfig.assignment;
            }

            cell.appendChild(select);
            row.appendChild(cell);
        }

        usersBody.appendChild(row);
    });

    // Aplicar asignaciones por defecto si no hay un horario existente
    if (!existingSchedule) applyDefaultAssignments(usersBody);

    // Realizar el recuento de guardias asignadas después de aplicar las asignaciones por defecto
    const shiftCounts = countWeekdayShifts();
    console.log('Conteo de guardias luego de las asignaciones por defecto:', shiftCounts);

    // Llamar a la función para resaltar feriados
    highlightHolidays(apiUrl, year, month);
}





export function processAndGenerateTable(users, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader, existingSchedule, apiUrl) {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value) + 1; // Ajuste por mes basado en índice 0

    console.log("processAndGenerateTable - Año y mes seleccionados:", year, month);

    // Excluimos el usuario con username "montes_esposito"
    const filteredUsers = users.filter(user => user.username !== 'montes_esposito');
    console.log("Usuarios después de filtrar:", filteredUsers);

    // Ordenamos los usuarios alfabéticamente por nombre de usuario
    filteredUsers.sort((a, b) => a.username.localeCompare(b.username));

    // Generamos la tabla con los usuarios filtrados
    generateTable(filteredUsers, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader, existingSchedule, apiUrl);
}


export async function assignMonthlyShiftsWithCardio(users, selectedYear, selectedMonth) {
    const rows = document.querySelectorAll('#users-body tr');
    const daysInMonth = document.querySelectorAll('.shift-select[data-day]');

    // Obtener acumulados previos y asignaciones del último día del mes anterior
    const accumulatedCounts = await calculateAccumulatedShiftCounts(selectedYear, selectedMonth);
    console.log("Conteo de acumulados previo para cada usuario:", accumulatedCounts);
    const lastDayAssignments = await fetchLastDayAssignments(selectedYear, selectedMonth);
    console.log("Asignaciones del último día:", lastDayAssignments);

    const uniqueDays = Array.from(new Set(Array.from(daysInMonth)
        .map(select => select.getAttribute('data-day'))
    )).sort();

    uniqueDays.forEach(currentDay => {
        console.log(`Asignando turnos para el día: ${currentDay}`);
        const selects = Array.from(document.querySelectorAll(`select[data-day="${currentDay}"]`));
        const dayNumber = parseInt(selects[0].getAttribute('data-daynumber'), 10);
        const isWeekend = (dayNumber === 5 || dayNumber === 6 || dayNumber === 0);

        // Verificar si es el primer día del mes y aplicar replicación de turnos
        // Bloque para el primer día del mes
       // Bloque para el primer día del mes
const dayOfMonth = parseInt(currentDay.split('-')[2]);
if (dayOfMonth === 1 && lastDayAssignments.length > 0) {
    console.log(`Es el primer día del mes (${currentDay}). Aplicando replicación de turnos u omisiones según corresponda.`);
    
    // Lista de usuarios a omitir en la asignación regular
    const usersToExclude = [];

    selects.forEach(select => {
        const username = select.getAttribute('data-username');
        const lastAssignment = lastDayAssignments.find(assign => assign.username === username);

        if (lastAssignment) {
            const [year, month, day] = lastAssignment.day.split('-').map(Number);
            const lastAssignmentDate = new Date(Date.UTC(year, month - 1, day));
            const lastDayOfWeek = lastAssignmentDate.getUTCDay();

            console.log(`Evaluando asignación del último día para ${username}: ${JSON.stringify(lastAssignment)}`);
            console.log(`Día de la semana para el último día (${lastAssignment.day}): ${lastDayOfWeek} (0=Domingo, 6=Sábado)`);

            if (lastDayOfWeek === 5 || lastDayOfWeek === 6) {
                // Si el último día fue viernes o sábado, replicar asignación de Im o Fn
                if (lastAssignment.assignment === "Im" || lastAssignment.assignment === "Fn") {
                    select.value = lastAssignment.assignment;
                    console.log(`Replicando guardia de ${username} para ${currentDay} con turno ${lastAssignment.assignment}.`);
                }
            } else if (lastDayOfWeek >= 0 && lastDayOfWeek <= 4) {
                // Si el último día fue de domingo a jueves, añadir a la lista de exclusión
                usersToExclude.push(username);
                console.log(`Usuario ${username} será excluido de la asignación regular en ${currentDay} por haber sido asignado el último día del mes anterior.`);
            }
        } else {
            console.log(`No se encontró asignación del último día del mes anterior para ${username}.`);
        }
    });

    // Si el último día fue de domingo a jueves, omitimos la replicación y procedemos con la asignación regular excluyendo usuarios
    if (usersToExclude.length > 0) {
        console.log(`Aplicando asignación regular en ${currentDay}, excluyendo a los usuarios:`, usersToExclude);
        
        // Lógica de asignación regular excluyendo a los usuarios que estuvieron asignados el día anterior
        let isLharriagueAssignedToday = selects.some(select => select.getAttribute('data-username') === 'lharriague' && select.value !== '');
        let isMquirogaAssignedToday = selects.some(select => select.getAttribute('data-username') === 'mquiroga' && select.value !== '');

        let assignedFnUser = null;
        let assignedImUser = null;

        // Aplicar la lógica de asignación de Im, excluyendo usuarios asignados el día anterior
        assignedImUser = assignIm(
            rows,
            selects.filter(select => !usersToExclude.includes(select.getAttribute('data-username'))),
            isLharriagueAssignedToday,
            isMquirogaAssignedToday,
            assignedFnUser,
            assignedImUser,
            isWeekend,
            accumulatedCounts,
            lastDayAssignments
        );

        // Actualizar los estados de asignación de lharriague y mquiroga
        isLharriagueAssignedToday = isLharriagueAssignedToday || (assignedImUser && assignedImUser.getAttribute('data-username') === 'lharriague');
        isMquirogaAssignedToday = isMquirogaAssignedToday || (assignedImUser && assignedImUser.getAttribute('data-username') === 'mquiroga');

        // Aplicar la lógica de asignación de Fn, excluyendo usuarios asignados el día anterior
        assignedFnUser = assignFn(
            rows,
            selects.filter(select => !usersToExclude.includes(select.getAttribute('data-username'))),
            isLharriagueAssignedToday,
            isMquirogaAssignedToday,
            assignedImUser,
            assignedFnUser,
            isWeekend,
            accumulatedCounts,
            lastDayAssignments
        );
    }

    // Finalizamos este bloque y pasamos al siguiente día
    return;
}

// Bloque para replicar asignación del sábado en domingo
const dayOfWeek = new Date(currentDay).getUTCDay();
if (dayOfWeek === 0) { // 0 representa el domingo
    console.log(`Es domingo (${currentDay}). Verificando asignaciones del sábado anterior.`);
    
    const saturday = getPreviousDay(currentDay, 1); // Obtener el sábado anterior
    selects.forEach(select => {
        const username = select.getAttribute('data-username');
        const saturdaySelect = document.querySelector(`.shift-select[data-day="${saturday}"][data-username="${username}"]`);
        
        if (saturdaySelect && saturdaySelect.value !== '' && !["V", "ND", "P1", "Ce", "HH", "CM", "Cp", "Al", "Jb","HP"].includes(saturdaySelect.value)) {
            select.value = saturdaySelect.value;
            console.log(`Replicando guardia de ${username} del sábado ${saturday} para el domingo ${currentDay} con turno ${saturdaySelect.value}.`);
        } else {
            console.log(`No se encontró asignación válida para ${username} el sábado anterior (${saturday}) o es una asignación no válida.`);
        }
    });
    return;
}

// Resto de la lógica de asignación para los días regulares del mes

        
        
        
        // Lógica de asignación regular
        let isLharriagueAssignedToday = selects.some(select => select.getAttribute('data-username') === 'lharriague' && select.value !== '');
        let isMquirogaAssignedToday = selects.some(select => select.getAttribute('data-username') === 'mquiroga' && select.value !== '');

        let assignedFnUser = null;
        let assignedImUser = null;

        if (!isWeekend) { 
            assignedImUser = assignIm(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, assignedImUser, isWeekend, accumulatedCounts, lastDayAssignments);

            isLharriagueAssignedToday = isLharriagueAssignedToday || (assignedImUser && assignedImUser.getAttribute('data-username') === 'lharriague');
            isMquirogaAssignedToday = isMquirogaAssignedToday || (assignedImUser && assignedImUser.getAttribute('data-username') === 'mquiroga');

            assignedFnUser = assignFn(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, assignedFnUser, isWeekend, accumulatedCounts, lastDayAssignments);
        } else { 
            assignedImUser = assignIm(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, assignedImUser, isWeekend, accumulatedCounts, lastDayAssignments);

            isLharriagueAssignedToday = isLharriagueAssignedToday || (assignedImUser && assignedImUser.getAttribute('data-username') === 'lharriague');
            isMquirogaAssignedToday = isMquirogaAssignedToday || (assignedImUser && assignedImUser.getAttribute('data-username') === 'mquiroga');

            assignedFnUser = assignFn(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, assignedFnUser, isWeekend, accumulatedCounts, lastDayAssignments);

            if (assignedFnUser && dayNumber === 5) {
                const assignedUsername = assignedFnUser.getAttribute('data-username');
                assignWeekendDays(currentDay, assignedUsername, 'Fn');
            }

            if (assignedImUser && dayNumber === 5) {
                const assignedUsername = assignedImUser.getAttribute('data-username');
                assignWeekendDays(currentDay, assignedUsername, 'Im');
            }
        }
    });

    assignSaturdayP1(users, accumulatedCounts);

    const userShiftCountsWeek = countWeekdayShifts();
    const userShiftCountsWeekend = countWeekendShifts();
    const saturdayCounts = countSaturdayShifts();
    console.log('Conteo final de guardias asignadas de lunes a jueves:', userShiftCountsWeek);
    console.log('Conteo final de guardias asignadas de viernes a domingo:', userShiftCountsWeekend);
    console.log('Conteo final de guardias asignadas P1 los sábados:', saturdayCounts);
}


function assignWeekendDays(currentDay, assignedUsername, assignmentType) {
    const saturdaySelects = Array.from(document.querySelectorAll(`.shift-select[data-day="${getNextDay(currentDay, 6)}"]`));
    const sundaySelects = Array.from(document.querySelectorAll(`.shift-select[data-day="${getNextDay(currentDay, 0)}"]`));

    [saturdaySelects, sundaySelects].forEach((daySelects, index) => {
        daySelects.forEach(select => {
            if (select.getAttribute('data-username') === assignedUsername && select.value === '') {
                select.value = assignmentType;
                // console.log(`Asignando ${assignmentType} a ${assignedUsername} para el ${index === 0 ? 'sábado' : 'domingo'}`);
            }
        });
    });
}

// Función auxiliar para obtener el siguiente día (sábado o domingo)
function getNextDay(currentDay, dayOfWeek) {
    const [year, month, day] = currentDay.split('-');
    const date = new Date(year, month - 1, day);
    while (date.getDay() !== dayOfWeek) {
        date.setDate(date.getDate() + 1);
    }
    return date.toISOString().slice(0, 10); // Retornar en formato YYYY-MM-DD
}

// Función para poblar los selects basados en las reglas del usuario
function populateShiftSelect(selectElement, user, isSaturday, guardSites) {
    const username = selectElement.getAttribute('data-username');
    const dayOfWeek = selectElement.getAttribute('data-dayOfWeek');
    const dateString = selectElement.getAttribute('data-day');

    let shouldAutoSelectND = false;
    let shouldAutoSelectV = false;

    // Verificar si aplica ND
    if (shouldDisableSelect(username, dayOfWeek, dateString)) {
        shouldAutoSelectND = true;
    }

    // Verificar si aplica V
    user.vacations.forEach(vacation => {
        const vacationStartDate = vacation.startDate.slice(0, 10);
        const vacationEndDate = vacation.endDate.slice(0, 10);
        const vacationStartPrevDay = new Date(new Date(vacationStartDate).getTime() - 86400000).toISOString().slice(0, 10);

        if (vacationStartPrevDay <= dateString && vacationEndDate >= dateString) {
            shouldAutoSelectV = true;
        }
    });

    // Agregar la opción vacía
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '';
    selectElement.appendChild(emptyOption);

    // Agregar "V"
    const vacationOption = document.createElement('option');
    vacationOption.value = 'V';
    vacationOption.textContent = 'V';
    selectElement.appendChild(vacationOption);

    // Agregar "ND"
    const ndOption = document.createElement('option');
    ndOption.value = 'ND';
    ndOption.textContent = 'ND';
    selectElement.appendChild(ndOption);

    // Agregar "P1" para sábados si no hace guardias
    if (!user.doesShifts && isSaturday) {
        const p1Option = document.createElement('option');
        p1Option.value = 'P1';
        p1Option.textContent = 'P1';
        selectElement.appendChild(p1Option);
    }

    // Agregar sitios regulares si hace guardias
    if (user.doesShifts) {
        if (isSaturday) {
            const p1Option = document.createElement('option');
            p1Option.value = 'P1';
            p1Option.textContent = 'P1';
            selectElement.appendChild(p1Option);
        }
        populateRegularSites(selectElement, user, guardSites);
    }

    // Autoselección según la regla
    if (shouldAutoSelectV) {
        selectElement.value = 'V';
    } else if (shouldAutoSelectND) {
        selectElement.value = 'ND';
    }
}


// Función auxiliar para poblar los sitios regulares según el perfil del usuario
function populateRegularSites(selectElement, user, guardSites) {
    if (user.worksInPublicNeuquen) {
        guardSites.publicNeuquen.forEach(site => {
            const option = document.createElement('option');
            option.value = site;
            option.textContent = site;
            selectElement.appendChild(option);
        });
    }

    if (user.worksInPrivateNeuquen) {
        guardSites.privateNeuquen.forEach(site => {
            const option = document.createElement('option');
            option.value = site;
            option.textContent = site;
            selectElement.appendChild(option);
        });
    }

    if (user.worksInPrivateRioNegro) {
        guardSites.privateRioNegro.forEach(site => {
            const option = document.createElement('option');
            option.value = site;
            option.textContent = site;
            selectElement.appendChild(option);
        });
    }

    if (user.worksInPublicRioNegro) {
        guardSites.publicRioNegro.forEach(site => {
            const option = document.createElement('option');
            option.value = site;
            option.textContent = site;
            selectElement.appendChild(option);
        });
    }
}

function shouldDisableSelect(username, dayOfWeek, dateString) {
    const day = dayOfWeek.toLowerCase();

    if (isHoliday(dateString)) {
        return false;
    }

    const disableRules = {
        mschvartzman: ['lun'],
        mmelo: ['mar', 'jue'],
        ltotis: ['jue'],
        ngrande: ['lun', 'mar'],
    };

    // ✅ Crear fecha en horario LOCAL para evitar errores de desfase
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    const meetingDate = getMeetingDateForMonth(year, month);

    if (username === 'jserrano' && (month + 1) % 2 === 0 && isSameLocalDate(date, meetingDate)) {
        return true;
    }

    if (username === 'sdegreef' && (month + 1) % 2 !== 0 && isSameLocalDate(date, meetingDate)) {
        return true;
    }

    return disableRules[username]?.includes(day) || false;
}

function isSameLocalDate(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function applyDefaultAssignments(usersBody) {
    const defaultAssignments = {
        'lburgueño': { day: 'Mar', value: 'Al' },
        'lalvarez': { day: 'Lun', value: 'Cp' },
        'nvela': { day: 'Jue', value: 'CR' },
        'msalvarezza': { day: 'Jue', value: 'Al'},
    };

    // Recorrer cada fila (usuario) de la tabla
    usersBody.querySelectorAll('tr').forEach(row => {
        // Recorrer todos los selects de la fila
        Array.from(row.querySelectorAll('td select')).forEach(select => {
            const username = select.getAttribute('data-username'); // Obtener el nombre de usuario directamente del atributo
            const dayOfWeek = select.getAttribute('data-dayOfWeek'); // Obtener el día del select

            if (defaultAssignments[username] && defaultAssignments[username].day === dayOfWeek) {
                const assignment = defaultAssignments[username];

                // Verificar si el select está habilitado y tiene la opción
                if (!select.disabled && Array.from(select.options).some(option => option.value === assignment.value)) {
                    select.value = assignment.value; // Asignar el valor por defecto
                }
            }
        });
    });
}

function getPreviousDay(currentDay, offset = 1) {
    const [year, month, day] = currentDay.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - offset); // Restamos un día (o el offset dado)
    return date.toISOString().slice(0, 10); // Retornamos en formato YYYY-MM-DD
}

function highlightHolidays(apiUrl, year, month) {
    // Limpiar cualquier clase 'holiday' anterior en las celdas del mes
    document.querySelectorAll('.holiday').forEach(cell => cell.classList.remove('holiday'));

    fetch(`${apiUrl}/holidays`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(response => response.json())
    .then(holidays => {
        console.log("Feriados obtenidos:", holidays);

        holidays.forEach(holiday => {
            const holidayStart = holiday.startDate.slice(0, 10); // Formato YYYY-MM-DD
            const holidayEnd = holiday.endDate.slice(0, 10);     // Formato YYYY-MM-DD

            console.log(`Procesando feriado: ${holiday.name} - Desde ${holidayStart} hasta ${holidayEnd} (UTC)`);

            // Recorrer las fechas entre holidayStart y holidayEnd en formato de cadena
            let currentDate = holidayStart;

            while (currentDate <= holidayEnd) {
                const [currentYear, currentMonth, currentDay] = currentDate.split('-').map(Number);

                if (currentYear === year && currentMonth === month + 1) {
                    const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
                    console.log(`Buscando selects con data-day="${dayString}"`);

                    // Seleccionar todos los selects con el atributo data-day
                    const selects = document.querySelectorAll(`select[data-day="${dayString}"]`);
                    if (selects.length > 0) {
                        selects.forEach(select => {
                            const cell = select.closest('td'); // Encontrar el td contenedor del select
                            if (cell) {
                                cell.classList.add('holiday'); // Aplicar la clase al td
                                console.log(`Celda encontrada y clase holiday aplicada en data-day="${dayString}"`);
                            }
                        });
                    } else {
                        console.log(`No se encontraron selects con data-day="${dayString}"`);
                    }
                }

                // Incrementar currentDate en un día
                const nextDate = new Date(`${currentDate}T00:00:00Z`);
                nextDate.setUTCDate(nextDate.getUTCDate() + 1);
                currentDate = nextDate.toISOString().slice(0, 10);
            }
        });
    })
    .catch(error => {
        console.error('Error al obtener los feriados:', error);
    });
}
    








