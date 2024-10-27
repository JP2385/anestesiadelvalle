import { assignFn, assignIm } from './shiftAssignmentsWeekdays.js';

// Función auxiliar para obtener el número de días de un mes y año
export function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

export function generateTable(users, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader) {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);

    // Limpiamos el contenido anterior
    daysHeader.innerHTML = '<th>Anestesiólogo</th>';
    usersBody.innerHTML = '';

    // Obtenemos el número de días en el mes seleccionado
    const daysInMonth = getDaysInMonth(year, month);

    // Generamos los encabezados con los días del mes y sus abreviaturas de día de la semana
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();

        // Formateamos la fecha sin incluir la hora
        const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const th = document.createElement('th');
        th.textContent = `${dayAbbreviations[dayOfWeek]} ${day}`;
        daysHeader.appendChild(th);
    }

    // Verificar lógica de vacaciones con logs detallados
    users.forEach(user => {
        const row = document.createElement('tr');
        const userCell = document.createElement('td');
        userCell.textContent = user.username;
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
            select.setAttribute('data-username', user.username);
            select.setAttribute('data-day', dayString);
            select.setAttribute('data-dayOfWeek', dayOfWeekAbbreviation);
            select.setAttribute('data-cardio', user.doesCardio);

            // Poblar el select con las opciones regulares
            populateShiftSelect(select, user, isSaturday, guardSites, dayOfWeekAbbreviation, user.username);

            // Verificación de vacaciones con logs
            user.vacations.forEach(vacation => {
                const vacationStartDate = vacation.startDate.slice(0, 10);
                const vacationEndDate = vacation.endDate.slice(0, 10);

                const vacationStartPrevDay = new Date(new Date(vacationStartDate).getTime() - 86400000).toISOString().slice(0, 10);

                // Deshabilitar el día antes del inicio y durante el período de vacaciones
                if ((vacationStartPrevDay <= dayString && vacationEndDate >= dayString)) {
                    select.innerHTML = ''; 
                    const vacationOption = document.createElement('option');
                    vacationOption.value = 'V';
                    vacationOption.textContent = 'V';
                    select.appendChild(vacationOption);
                    select.disabled = true;
                }
            });

            cell.appendChild(select);
            row.appendChild(cell);
        }

        usersBody.appendChild(row);
    });

    // Después de generar la tabla, aplicar las asignaciones por defecto
    applyDefaultAssignments(usersBody);

    // Realizar el recuento de guardias asignadas después de aplicar las asignaciones por defecto
    const shiftCounts = countWeekdayShifts();
    console.log('Conteo de guardias asignadas:', shiftCounts);
}

// Función para obtener los usuarios desde la API
export function fetchUsers(apiUrl, callback) {
    fetch(`${apiUrl}/auth/users`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(response => response.json())
    .then(users => callback(users))
    .catch(error => {
        console.error('Hubo un problema al obtener la lista de usuarios:', error.message);
    });
}

export function processAndGenerateTable(users, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader, generateTable) {
    // Excluimos el usuario con username "montes_esposito"
    const filteredUsers = users.filter(user => user.username !== 'montes_esposito');

    // Ordenamos los usuarios alfabéticamente por nombre de usuario
    filteredUsers.sort((a, b) => a.username.localeCompare(b.username));

    // Generamos la tabla con los usuarios filtrados
    generateTable(filteredUsers, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader);
}

export function assignWeekShiftsWithCardio(users) {
    const rows = document.querySelectorAll('#users-body tr'); // Seleccionamos todas las filas de la tabla de usuarios
    const daysInMonth = document.querySelectorAll('.shift-select[data-day]'); // Seleccionamos todos los selects con data-day

    // Obtener el nombre de usuario en la primera celda de la fila
    const getUsernameFromRow = (row) => row.cells[0].textContent.trim();

    // Obtenemos cada día único a partir de los selects (filtrando por día laboral)
    const uniqueDays = Array.from(new Set(Array.from(daysInMonth)
        .map(select => select.getAttribute('data-day'))
        .filter(day => {
            const date = new Date(day);
            const dayOfWeek = date.getDay();
            return dayOfWeek >= 1 && dayOfWeek <= 4; // Solo de lunes a jueves
        })
    ));

    uniqueDays.forEach(currentDay => {
        const selects = Array.from(document.querySelectorAll(`select[data-day="${currentDay}"]`));
        console.log(`Procesando asignaciones para el día: ${currentDay}`);

        // Verificar asignaciones previas de lharriague y mquiroga para el día actual
        const isLharriagueAssignedToday = selects.some(select => select.getAttribute('data-username') === 'lharriague' && select.value !== '');
        const isMquirogaAssignedToday = selects.some(select => select.getAttribute('data-username') === 'mquiroga' && select.value !== '');

        console.log(`Día: ${currentDay}, lharriague tiene guardia: ${isLharriagueAssignedToday}, mquiroga tiene guardia: ${isMquirogaAssignedToday}`);

        // Inicializar usuarios asignados como null
        let assignedFnUser = null;
        let assignedImUser = null;

        // Asignar Im y Fn para el día actual
        assignedImUser = assignIm(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, getUsernameFromRow);
        assignedFnUser = assignFn(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, getUsernameFromRow);
    });

    // Contar guardias asignadas al finalizar
    const userShiftCounts = countWeekdayShifts();
    console.log('Conteo final de guardias asignadas:', userShiftCounts);
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

    // Para usuarios que hacen guardias, poblar como los días normales
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



