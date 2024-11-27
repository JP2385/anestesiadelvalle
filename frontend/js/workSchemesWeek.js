// Importar la función fetchUsers
import { fetchUsers } from './shiftScheduleUtils.js';

// URL de la API: cambiará según el entorno
const apiUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://adv-37d5b772f5fd.herokuapp.com';

// Función para agrupar usuarios por esquema y días
function groupUsersByDay(users) {
    const schedules = {
        Mañana: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
        Tarde: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
        Variable: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
    };

    users.forEach(user => {
        for (let day in user.workSchedule) {
            const schedule = user.workSchedule[day];
            if (schedules[schedule]) {
                schedules[schedule][day].push({ username: user.username, schedule }); // Guardar también el esquema
            }
        }
    });

    return schedules;
}

// Función para generar la tabla dinámica
function populateTable(users) {
    const tableBody = document.querySelector('#work-schedule-table tbody');
    const schedules = groupUsersByDay(users);

    for (let [schedule, days] of Object.entries(schedules)) {
        const maxRows = Math.max(
            ...Object.values(days).map(users => users.length)
        );

        // Crear una fila por cada usuario
        for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            const row = document.createElement('tr');

            // Agregar la celda del esquema de trabajo en la primera fila
            if (rowIndex === 0) {
                const scheduleCell = document.createElement('td');
                scheduleCell.textContent = schedule;
                scheduleCell.rowSpan = maxRows; // Fusionar tantas filas como sea necesario

                // Agregar la clase 'work-site' a las celdas con "Mañana", "Tarde" y "Variable"
                if (["Mañana", "Tarde", "Variable"].includes(schedule)) {
                    scheduleCell.classList.add('work-site');
                }

                row.appendChild(scheduleCell);
            }

            // Agregar las celdas de los días
            for (let day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
                const cell = document.createElement('td');
                const user = days[day][rowIndex]; // Usuario correspondiente al día y fila
                
                if (user) {
                    cell.textContent = user.username; // Agregar el nombre del usuario
                    // Aplicar la clase CSS según el esquema
                    if (user.schedule === 'Mañana') {
                        cell.classList.add('option-morning');
                    } else if (user.schedule === 'Tarde') {
                        cell.classList.add('option-afternoon');
                    } else if (user.schedule === 'Variable') {
                        cell.classList.add('option-long');
                    }
                }

                row.appendChild(cell);
            }

            tableBody.appendChild(row); // Agregar la fila a la tabla
        }
    }
}


// Ejecutar la lógica al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    fetchUsers(apiUrl, (users) => {
        populateTable(users); // Llamar a la función populateTable con los usuarios obtenidos
    });
});
