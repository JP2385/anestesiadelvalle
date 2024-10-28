export function isAlreadyAssigned(selects, assignmentType) {
    for (const select of selects) {
        const username = select.getAttribute('data-username');
        const day = select.getAttribute('data-day');

        if (!username || !day) continue;

        if (select && !select.disabled && select.value === assignmentType) {
            return select;  // Retornamos el select del usuario ya asignado
        }
    }
    return null; // No hay asignación previa
}

export function excludeAssignedUsers(selects, excludedUsers) {
    selects.forEach(select => {
        const username = select.getAttribute('data-username');
        const dayOfWeek = select.getAttribute('data-dayofweek');
        const day = select.getAttribute('data-day'); // Fecha completa en formato YYYY-MM-DD

        if (!username || !dayOfWeek || select.disabled) {
            return;
        }

        // Excluir usuario si ya tiene guardia en cualquier día de la semana (Lun a Jue)
        if (['Lun', 'Mar', 'Mie', 'Jue'].includes(dayOfWeek) && select.value !== '' && select.value !== 'ND') {
            excludedUsers.add(username);
        } else {
        }
    });
}

// Función para contar las guardias asignadas a cada usuario de lunes a jueves
export function countWeekdayShifts() {
    const userShiftCounts = {}; // Objeto para almacenar las guardias por usuario

    // Seleccionamos todas las filas de la tabla de usuarios
    const rows = document.querySelectorAll('#users-body tr');

    rows.forEach(row => {
        const username = row.cells[0].textContent.trim(); // Obtener el nombre de usuario de la primera celda
        const selects = row.querySelectorAll('td select'); // Obtener todos los selects de la fila

        if (!userShiftCounts[username]) {
            userShiftCounts[username] = 0;
        }

        selects.forEach(select => {
            const dayOfWeek = parseInt(select.getAttribute('data-daynumber'), 10); // Obtener el día de la semana directamente de data-daynumber

            if (dayOfWeek >= 1 && dayOfWeek <= 4 && !select.disabled && select.value !== '' && select.value !== 'ND') {
                userShiftCounts[username]++;
            }
        });
    });

    return userShiftCounts;
}

// Función para contar las guardias asignadas a cada usuario de viernes a domingo
export function countWeekendShifts() {
    const userShiftCounts = {}; // Objeto para almacenar las guardias por usuario

    // Seleccionamos todas las filas de la tabla de usuarios
    const rows = document.querySelectorAll('#users-body tr');

    rows.forEach(row => {
        const username = row.cells[0].textContent.trim(); // Obtener el nombre de usuario de la primera celda
        const selects = row.querySelectorAll('td select'); // Obtener todos los selects de la fila

        if (!userShiftCounts[username]) {
            userShiftCounts[username] = 0;
        }

        selects.forEach(select => {
            const dayOfWeek = parseInt(select.getAttribute('data-daynumber'), 10); // Obtener el día de la semana directamente de data-daynumber

            if ((dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) && !select.disabled && select.value !== '' && select.value !== 'ND') {
                userShiftCounts[username]++;
            }
        });
    });
    
    return userShiftCounts;
}
