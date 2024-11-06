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

            // Verificar si el select corresponde a lunes a jueves, no está deshabilitado y tiene un valor asignado
            if (dayOfWeek >= 1 && dayOfWeek <= 4 && !select.disabled && select.value !== '' && select.value !== 'ND') {
                // Si el usuario es "nvela", cuenta cada guardia como 1.3 en lugar de 1
                userShiftCounts[username] += (username === "nvela") ? 1.4 : 1;
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

            // Verificar si el select corresponde a viernes a domingo, no está deshabilitado, y tiene un valor asignado
            if ((dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) && !select.disabled && select.value !== '' && select.value !== 'ND' && select.value !== 'P1') {
                // Si el usuario es "nvela", cuenta cada guardia como 1.3 en lugar de 1
                userShiftCounts[username] += (username === "nvela") ? 1.4 : 1;
            }
        });
    });
    
    return userShiftCounts;
}


// Función para contar las guardias asignadas a "P1" para cada sábado
export function countSaturdayShifts() {
    const userShiftCounts = {}; // Objeto para almacenar las guardias por usuario en sábado

    // Seleccionamos todas las filas de la tabla de usuarios
    const rows = document.querySelectorAll('#users-body tr');

    rows.forEach(row => {
        const username = row.cells[0].textContent.trim(); // Obtener el nombre de usuario de la primera celda
        const selects = row.querySelectorAll('td select'); // Obtener todos los selects de la fila

        // Inicializar el conteo de guardias para el usuario si no existe
        if (!userShiftCounts[username]) {
            userShiftCounts[username] = 0;
        }

        selects.forEach(select => {
            const dayOfWeek = parseInt(select.getAttribute('data-daynumber'), 10); // Obtener el día de la semana (0=Dom, ..., 6=Sab)
            
            // Contar solo si es sábado (dayOfWeek === 6) y la guardia es "P1"
            if (dayOfWeek === 6 && select.value === 'P1' && !select.disabled) {
                userShiftCounts[username]++;
            }
        });
    });

    return userShiftCounts; // Retornar el objeto con los conteos de guardias de "P1" en sábado por usuario
}