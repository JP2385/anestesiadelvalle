import { isHoliday } from './fetchHolidays.js';

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
            const dayString = select.getAttribute('data-day'); // Formato YYYY-MM-DD para verificar si es feriado
            const assignment = select.value; // Valor del select para la asignación de guardia

            // Verificar si es un día entre lunes y jueves, no está deshabilitado, tiene un valor asignado, y no es feriado
            if (
                dayOfWeek >= 1 && dayOfWeek <= 4 &&
                !select.disabled &&
                assignment !== '' &&
                assignment !== 'ND' &&
                assignment !== 'V' && // 👈 excluir V
                !isHoliday(dayString)
            ) {
                // Contar asignaciones especiales
                if (assignment === "HH") {
                    userShiftCounts[username] += 1.5;
                } else {
                    userShiftCounts[username] += 1;
                }
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
            const dayString = select.getAttribute('data-day'); // Formato YYYY-MM-DD para verificar si es feriado
            const assignment = select.value; // Valor del select para la asignación de guardia

            // Verificar si el día corresponde a viernes a domingo o es un feriado
            if (
                (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0 || isHoliday(dayString)) &&
                !select.disabled &&
                assignment !== '' &&
                assignment !== 'ND' &&
                assignment !== 'V' && // 👈 excluir V
                assignment !== 'P1'
            ) {
                // Contar asignaciones especiales
                if (assignment === "HH") {
                    userShiftCounts[username] += 1.5;
                } else {
                    userShiftCounts[username] += 1;
                }
            }
        });
    });
    
    return userShiftCounts;
}




// Función para contar las guardias asignadas a "P1" y "P2" para cada sábado
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
            
            // Contar solo si es sábado (dayOfWeek === 6) y la guardia es "P1" o "P2"
            if (dayOfWeek === 6 && (select.value === 'P1' || select.value === 'P2') && !select.disabled) {
                userShiftCounts[username]++;
            }
        });
    });

    return userShiftCounts; // Retornar el objeto con los conteos de guardias de "P1" y "P2" en sábado por usuario
}

// Función específica para contar solo las guardias asignadas a "P2" para cada sábado
export function countSaturdayP2Shifts() {
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
            
            // Contar solo si es sábado (dayOfWeek === 6) y la guardia es "P2"
            if (dayOfWeek === 6 && select.value === 'P2' && !select.disabled) {
                userShiftCounts[username]++;
            }
        });
    });

    return userShiftCounts; // Retornar el objeto con los conteos de guardias de "P2" en sábado por usuario
}