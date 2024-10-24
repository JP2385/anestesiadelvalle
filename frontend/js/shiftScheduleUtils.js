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
    
    console.log(`Generando tabla para el año: ${year}, mes: ${month + 1}`);
    console.log(`Días en el mes: ${daysInMonth}`);

    // Generamos los encabezados con los días del mes y sus abreviaturas de día de la semana
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay(); // Obtenemos el día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)

        // Formateamos la fecha sin incluir la hora
        const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; // Formato YYYY-MM-DD
        console.log(`Procesando el día: ${day}, Día de la semana: ${dayAbbreviations[dayOfWeek]}, Fecha: ${formattedDate}`);

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
            const dayOfWeekAbbreviation = dayAbbreviations[dayOfWeek]; // Ejemplo: "Lun", "Mar"
            const isSaturday = dayOfWeek === 6;

            // Atributos personalizados para el select
            const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; // Formato YYYY-MM-DD
            select.setAttribute('data-username', user.username);
            select.setAttribute('data-day', dayString);
            select.setAttribute('data-dayOfWeek', dayOfWeekAbbreviation); // Atributo con la abreviatura del día de la semana
            select.setAttribute('data-cardio', user.doesCardio); // Agregar atributo data-cardio a cada select

            // Poblar el select con las opciones regulares
            populateShiftSelect(select, user, isSaturday, guardSites, dayOfWeekAbbreviation, user.username);

            // Verificación de vacaciones con logs
            user.vacations.forEach(vacation => {
                const vacationStartDate = vacation.startDate.slice(0, 10);
                const vacationEndDate = vacation.endDate.slice(0, 10);
                console.log(`Usuario: ${user.username}, Verificando vacaciones: Desde ${vacationStartDate} hasta ${vacationEndDate}, Día actual: ${dayString}`);
            });

            if (user.vacations.some(vacation => vacation.startDate.slice(0, 10) <= dayString && vacation.endDate.slice(0, 10) >= dayString)) {
                select.innerHTML = ''; 
                const vacationOption = document.createElement('option');
                vacationOption.value = 'V';
                vacationOption.textContent = 'V';
                select.appendChild(vacationOption);
                select.disabled = true;
                console.log(`Usuario ${user.username} está de vacaciones en el día ${dayString}`);
            }

            cell.appendChild(select);
            row.appendChild(cell);
        }

        usersBody.appendChild(row);
    });

    // Después de generar la tabla, aplicar las asignaciones por defecto
    applyDefaultAssignments(usersBody, daysHeader);

    // Realizar el recuento de guardias asignadas después de aplicar las asignaciones por defecto
    const shiftCounts = countWeekdayShifts();
    console.log('Conteo de guardias asignadas:', shiftCounts);
}

// Función para obtener los usuarios desde la API
export function fetchUsers(apiUrl, generateTable, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader) {
    fetch(`${apiUrl}/auth/users`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(response => response.json())
    .then(users => {
        // Excluimos el usuario con username "montes_esposito"
        const filteredUsers = users.filter(user => user.username !== 'montes_esposito');

        // Ordenamos los usuarios alfabéticamente por nombre de usuario
        filteredUsers.sort((a, b) => a.username.localeCompare(b.username));
        
        // Generamos la tabla con los usuarios filtrados
        generateTable(filteredUsers, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader);
    })
    .catch(error => {
        console.error('Hubo un problema al obtener la lista de usuarios: ', error.message);
    });
}

export function assignWeekShiftsWithCardio(users) {
    const headers = document.querySelectorAll('#days-header th'); // Seleccionamos todos los headers
    const rows = document.querySelectorAll('#users-body tr'); // Seleccionamos todas las filas de la tabla de usuarios

    // Obtener el nombre de usuario en la primera celda de la fila
    const getUsernameFromRow = (row) => row.cells[0].textContent.trim();

    headers.forEach((header, headerIndex) => {
        if (headerIndex === 0) return;

        // Verificar si el día actual es viernes, sábado o domingo
        if (header.textContent.includes('Vie') || header.textContent.includes('Sab') || header.textContent.includes('Dom')) {
            return; // Saltar fines de semana y viernes
        }

        const dayNumber = header.textContent.split(' ')[1]; 
        const year = document.querySelector('#year-select').value;
        let month = parseInt(document.querySelector('#month-select').value);
        month = (month + 1).toString().padStart(2, '0');
        const currentDay = `${year}-${month}-${dayNumber.padStart(2, '0')}`;

        console.log(`Procesando el header para el día: ${header.textContent}, Fecha completa: ${currentDay}, headerIndex: ${headerIndex}`);

        const selects = document.querySelectorAll(`select[data-day="${currentDay}"]`);
        console.log(`Selects encontrados para el día ${currentDay}:`, selects.length);

        // Verificar asignaciones para lharriague y mquiroga
        const isLharriagueAssignedToday = [...selects].some(select => select.getAttribute('data-username') === 'lharriague' && select.value !== '');
        const isMquirogaAssignedToday = [...selects].some(select => select.getAttribute('data-username') === 'mquiroga' && select.value !== '');

        console.log(`Día: ${header.textContent}, lharriague tiene guardia: ${isLharriagueAssignedToday}, mquiroga tiene guardia: ${isMquirogaAssignedToday}`);

        // Inicializar assignedFnUser como null (o según lógica)
        let assignedFnUser = null;
        let assignedImUser = null;

        // Llamada a la función para asignar Im con los selects del día actual
        assignedImUser = assignIm(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, getUsernameFromRow);

        // Llamada a la función para asignar Fn (una vez que tenemos assignedImUser)
        assignedFnUser = assignFn(rows, selects, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, getUsernameFromRow);
    });

    // Al finalizar la asignación de todo el mes, contar las guardias asignadas
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

function applyDefaultAssignments(usersBody, daysHeader) {
    const defaultAssignments = {
        'lburgueño': { day: 'Mar', value: 'Al' },
        'sdegreef': { day: 'Mie', value: 'Ce' },
        'lalvarez': { day: 'Lun', value: 'Cp' }
    };

    // Recorrer cada fila (usuario) de la tabla
    usersBody.querySelectorAll('tr').forEach(row => {
        const username = row.querySelector('td').textContent.trim(); // Obtener el nombre de usuario de la primera celda

        if (defaultAssignments[username]) {
            const assignment = defaultAssignments[username];
            
            // Recorrer todos los selects para encontrar el que coincida con el día asignado
            Array.from(row.querySelectorAll('td select')).forEach(select => {
                const dayOfWeek = select.getAttribute('data-dayOfWeek'); // Obtener el día del select
                if (dayOfWeek === assignment.day) {
                    // Verificar si el select está habilitado y tiene la opción
                    if (!select.disabled && Array.from(select.options).some(option => option.value === assignment.value)) {
                        select.value = assignment.value; // Asignar el valor por defecto
                        console.log(`Asignación por defecto aplicada: ${username} -> ${assignment.value} en ${dayOfWeek}`);
                    }
                }
            });
        }
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



