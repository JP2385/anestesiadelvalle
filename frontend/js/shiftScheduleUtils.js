import { assignIm, assignFn, assignWeekendIfLtotisAssigned, assignSaturdayP1} from './shiftAssignmentsMonthly.js';
import { countWeekdayShifts, countWeekendShifts, countSaturdayShifts } from './shiftAssignmentsUtils.js';
import { calculateAccumulatedShiftCounts} from './shiftCountTable.js';
import { fetchLastDayAssignments} from './shiftLastDayAssignments.js';

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


function generateTable(users, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader, existingSchedule = null) {
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

            const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const selectKey = `${user.username}-${dayString}`;

            // Asignar atributos de data al select
            select.setAttribute('data-username', user.username);
            select.setAttribute('data-day', dayString);
            select.setAttribute('data-dayOfWeek', dayOfWeekAbbreviation);
            select.setAttribute('data-daynumber', dayOfWeek);
            select.setAttribute('data-cardio', user.doesCardio);

            // Poblar el select con opciones regulares
            populateShiftSelect(select, user, isSaturday, guardSites);

            // Verificar vacaciones y deshabilitar si corresponde
            user.vacations.forEach(vacation => {
                const vacationStartDate = vacation.startDate.slice(0, 10);
                const vacationEndDate = vacation.endDate.slice(0, 10);
                const vacationStartPrevDay = new Date(new Date(vacationStartDate).getTime() - 86400000).toISOString().slice(0, 10);

                if (vacationStartPrevDay <= dayString && vacationEndDate >= dayString) {
                    select.innerHTML = ''; 
                    const vacationOption = document.createElement('option');
                    vacationOption.value = 'V';
                    vacationOption.textContent = 'V';
                    select.appendChild(vacationOption);
                    select.disabled = true;
                }
            });

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
}




export function processAndGenerateTable(users, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader, existingSchedule) {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value) + 1; // Ajuste por mes basado en índice 0

    console.log("processAndGenerateTable - Año y mes seleccionados:", year, month);

    // Excluimos el usuario con username "montes_esposito"
    const filteredUsers = users.filter(user => user.username !== 'montes_esposito');
    console.log("Usuarios después de filtrar:", filteredUsers);

    // Ordenamos los usuarios alfabéticamente por nombre de usuario
    filteredUsers.sort((a, b) => a.username.localeCompare(b.username));

    // Generamos la tabla con los usuarios filtrados
    generateTable(filteredUsers, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader, existingSchedule);
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
        
        if (saturdaySelect && saturdaySelect.value !== '' && !["V", "ND", "P1", "Ce", "HH", "CM", "Cp", "Al", "Jb"].includes(saturdaySelect.value)) {
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
    // Obtener los valores de los atributos directamente del select
    const username = selectElement.getAttribute('data-username');
    const dayOfWeek = selectElement.getAttribute('data-dayOfWeek');

    // Deshabilitar select si se cumplen las condiciones basadas en username y día
    if (shouldDisableSelect(username, dayOfWeek)) {
        selectElement.disabled = true;
        return;
    }

    // Agregar la opción vacía para todos los selects
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '';
    selectElement.appendChild(emptyOption);

    // Agregar la opción "ND" para todos los selects
    const ndOption = document.createElement('option');
    ndOption.value = 'ND';
    ndOption.textContent = 'ND';
    selectElement.appendChild(ndOption);

    // Si el usuario no hace guardias
    if (!user.doesShifts) {
        selectElement.disabled = !isSaturday;  // Deshabilitar los selects excepto los de los sábados
        if (isSaturday) {
            // Solo agregar P1 para los sábados si el usuario no hace guardias
            const option = document.createElement('option');
            option.value = 'P1';
            option.textContent = 'P1';
            selectElement.appendChild(option);
        }
        return;  // Salir de la función si no hace guardias
    }

    // Si el usuario hace guardias, agregar "P1" para los sábados y poblar otros días con guardSites
    if (isSaturday) {
        const option = document.createElement('option');
        option.value = 'P1';
        option.textContent = 'P1';
        selectElement.appendChild(option);
    }

    // Para usuarios que hacen guardias, poblar el select con los sitios regulares de guardia
    populateRegularSites(selectElement, user, guardSites);
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

function shouldDisableSelect(username, dayOfWeek) {
    // Convertir dayOfWeek a minúsculas para asegurar que las comparaciones sean consistentes
    const day = dayOfWeek.toLowerCase();

    // Reglas para deshabilitar días específicos según el usuario
    const disableRules = {
        mschvartzman: ['lun'],
        mmelo: ['lun', 'mar', 'jue'],
        ltotis: ['lun', 'jue'],
        ngrande: ['lun', 'mar'],
        nvela: ['jue'],
        msalvarezza: ['jue'],
    };

    if (disableRules[username] && disableRules[username].includes(day)) {
        return true;
    }

    return false;
}

function applyDefaultAssignments(usersBody) {
    const defaultAssignments = {
        'lburgueño': { day: 'Mar', value: 'Al' },
        'sdegreef': { day: 'Mie', value: 'Ce' },
        'lalvarez': { day: 'Lun', value: 'Cp' }
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



