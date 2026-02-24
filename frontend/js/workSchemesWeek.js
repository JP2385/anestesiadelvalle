// Importar la función fetchUsers
import { fetchUsers } from './shiftScheduleUtils.js';

// URL de la API: cambiará según el entorno
const apiUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : window.location.origin;

// Función para agrupar usuarios por esquema y días
function groupUsersByDay(users) {
    const schedules = {
        Mañana: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
        Tarde: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
        Variable: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] },
    };

    // Filtrar al usuario montes_esposito
    const filteredUsers = users.filter(user => user.username !== 'montes_esposito');

    filteredUsers.forEach(user => {
        for (let day in user.workSchedule) {
            const schedule = user.workSchedule[day];
            
            // Si el usuario trabaja mañana y tarde, agregarlo a ambas categorías
            if (schedule === 'Mañana y Tarde') {
                schedules['Mañana'][day].push(user);
                schedules['Tarde'][day].push(user);
            } else if (schedules[schedule]) {
                schedules[schedule][day].push(user); // Guardar el usuario en la franja correspondiente
            }
        }
    });

    return schedules;
}

// Función para generar la primera tabla
function populateTable(users) {
    const tableBody = document.querySelector('#work-schedule-table tbody');
    const schedules = groupUsersByDay(users);

    // Inicializar totales por día
    const dailyTotals = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 };

    for (let [schedule, days] of Object.entries(schedules)) {
        const maxRows = Math.max(...Object.values(days).map(users => users.length));

        for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            const row = document.createElement('tr');

            if (rowIndex === 0) {
                const scheduleCell = document.createElement('td');
                scheduleCell.textContent = schedule;
                scheduleCell.rowSpan = maxRows;
                scheduleCell.classList.add('work-site');
                row.appendChild(scheduleCell);
            }

            for (let day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
                const cell = document.createElement('td');
                const user = days[day][rowIndex];

                if (user) {
                    cell.textContent = user.username;
                    
                    // Aplicar la clase CSS según la categoría de la fila actual (schedule)
                    if (schedule === 'Mañana') {
                        cell.classList.add('option-morning');
                    } else if (schedule === 'Tarde') {
                        cell.classList.add('option-afternoon');
                    } else if (schedule === 'Variable') {
                        cell.classList.add('option-long');
                    }

                    // Incrementar el contador del día
                    dailyTotals[day]++;
                }

                row.appendChild(cell);
            }

            tableBody.appendChild(row);
        }
    }

    // Agregar fila de totales
    const totalRow = document.createElement('tr');
    const totalLabelCell = document.createElement('td');
    totalLabelCell.textContent = 'Totales';
    totalLabelCell.classList.add('work-site');
    totalRow.appendChild(totalLabelCell);

    for (let day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
        const totalCell = document.createElement('td');
        totalCell.textContent = dailyTotals[day];
        totalRow.appendChild(totalCell);
    }

    tableBody.appendChild(totalRow);
}

// Función para generar la segunda tabla
function populateProvinceTable(users) {
    const tableBody = document.querySelector('#province-schedule-table tbody');

    // Inicializar estructura para contar usuarios por provincia, esquema y día
    const provinceCounts = {
        'Rionegrinos Mañana': { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 },
        'Rionegrinos Tarde': { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 },
        'Rionegrinos Variable': { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 },
        'Neuquinos Mañana': { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 },
        'Neuquinos Tarde': { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 },
        'Neuquinos Variable': { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 },
        'Mixtos Mañana': { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 },
        'Mixtos Tarde': { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 },
        'Mixtos Variable': { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 }
    };

    // Clasificar usuarios y contarlos según su provincia, esquema y día
    users.forEach(user => {
        for (let day in user.workSchedule) {
            const schedule = user.workSchedule[day];

            if (schedule) {
                let category = '';

                if (user.worksInPrivateRioNegro && !user.worksInPrivateNeuquen) {
                    category = 'Rionegrinos';
                } else if (user.worksInPrivateNeuquen && !user.worksInPrivateRioNegro) {
                    category = 'Neuquinos';
                } else if (user.worksInPrivateRioNegro && user.worksInPrivateNeuquen) {
                    category = 'Mixtos';
                }

                if (category) {
                    // Si el usuario trabaja mañana y tarde, contarlo en ambas categorías
                    if (schedule === 'Mañana y Tarde') {
                        const morningKey = `${category} Mañana`;
                        const afternoonKey = `${category} Tarde`;
                        if (provinceCounts[morningKey]) {
                            provinceCounts[morningKey][day]++;
                        }
                        if (provinceCounts[afternoonKey]) {
                            provinceCounts[afternoonKey][day]++;
                        }
                    } else {
                        const key = `${category} ${schedule}`;
                        if (provinceCounts[key]) {
                            provinceCounts[key][day]++;
                        }
                    }
                }
            }
        }
    });

    // Generar las filas de la tabla
    for (let category in provinceCounts) {
        const row = document.createElement('tr');

        // Determinar la clase CSS a aplicar en función del esquema de trabajo
        let scheduleType = category.includes('Mañana') ? 'option-morning' :
                           category.includes('Tarde') ? 'option-afternoon' :
                           category.includes('Variable') ? 'option-long' : '';

        // Celda de la combinación Provincia + Esquema
        const categoryCell = document.createElement('td');
        categoryCell.textContent = category;
        categoryCell.classList.add('work-site');
        row.appendChild(categoryCell);

        // Celdas de conteo por día con la clase correspondiente
        for (let day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
            const cell = document.createElement('td');
            cell.textContent = provinceCounts[category][day];
            if (scheduleType) {
                cell.classList.add(scheduleType);
            }
            row.appendChild(cell);
        }

        tableBody.appendChild(row);
    }
}

// Ejecutar la lógica al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    fetchUsers(apiUrl, (users) => {
        populateTable(users);
        populateProvinceTable(users);
    });

});
