import { fetchVacations } from './fetchVacations.js';  // Asegúrate de que la ruta del archivo sea correcta

document.addEventListener('DOMContentLoaded', async function() {
    const yearSelect = document.getElementById('year');
    const userSelect = document.getElementById('user');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const currentYear = new Date().getFullYear();
    let users = [];

    try {
        // Usar la función fetchVacations para obtener los datos de las vacaciones
        users = await fetchVacations();

        // Poblar el select de usuarios
        populateUserSelect(users);

        // Obtener todos los años de las vacaciones disponibles
        const vacationYears = new Set();

        users.forEach(user => {
            user.vacations.forEach(vacation => {
                const year = new Date(vacation.startDate).getFullYear();
                vacationYears.add(year);
            });
        });

        // Convertir el Set a Array y ordenar los años de mayor a menor
        const sortedYears = Array.from(vacationYears).sort((a, b) => b - a);

        // Poblar el select con los años disponibles
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });

        // Seleccionar el año actual por defecto
        if (sortedYears.includes(currentYear)) {
            yearSelect.value = currentYear;
        } else {
            yearSelect.value = sortedYears[0];
        }

        // Mostrar las vacaciones por defecto con el año y usuario actual
        generateReport(yearSelect.value, userSelect.value, startDateInput.value, endDateInput.value, users);

    } catch (error) {
        console.error('Error fetching vacation data:', error);
    }

    // Agregar eventos para actualizar el reporte cuando se cambia el año, usuario, o fechas
    yearSelect.addEventListener('change', function() {
        generateReport(yearSelect.value, userSelect.value, startDateInput.value, endDateInput.value, users);
    });

    userSelect.addEventListener('change', function() {
        generateReport(yearSelect.value, userSelect.value, startDateInput.value, endDateInput.value, users);
    });

    startDateInput.addEventListener('change', function() {
        generateReport(yearSelect.value, userSelect.value, startDateInput.value, endDateInput.value, users);
    });

    endDateInput.addEventListener('change', function() {
        generateReport(yearSelect.value, userSelect.value, startDateInput.value, endDateInput.value, users);
    });
});

// Función para poblar el select de usuarios
function populateUserSelect(users) {
    const userSelect = document.getElementById('user');
    userSelect.innerHTML = '<option value="">All Users</option>';

    const sortedUsers = users.sort((a, b) => a.username.localeCompare(b.username));

    sortedUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.username;
        userSelect.appendChild(option);
    });
}

// Función para generar el informe basado en el año, usuario, y rango de fechas seleccionados
function generateReport(year, selectedUser, startDate, endDate, users) {
    const reportBody = document.getElementById('report-body');
    reportBody.innerHTML = '';  // Limpiar resultados anteriores

    const reportData = users.map(user => {
        if (selectedUser && user.username !== selectedUser) {
            return [];
        }

        return user.vacations.filter(vacation => {
            const vacationStart = new Date(vacation.startDate);
            const vacationEnd = new Date(vacation.endDate);

            // Verificar que las vacaciones estén dentro del año seleccionado
            const isInYear = vacationStart.getFullYear() == year;

            // Verificar si las vacaciones están dentro del rango de fechas (si se seleccionaron fechas)
            const isInDateRange = (!startDate || vacationStart >= new Date(startDate)) &&
                                  (!endDate || vacationEnd <= new Date(endDate));

            return isInYear && isInDateRange;
        }).map(vacation => ({
            username: user.username,
            startDate: vacation.startDate,
            endDate: vacation.endDate
        }));
    }).flat().sort((a, b) => new Date(b.endDate) - new Date(a.endDate)); // Ordenar por endDate

    // Mostrar los resultados en la tabla
    if (reportData.length > 0) {
        reportData.forEach(vacation => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${vacation.username}</td>
                <td>${new Date(vacation.startDate).toLocaleDateString()}</td>
                <td>${new Date(vacation.endDate).toLocaleDateString()}</td>
            `;
            reportBody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3">No vacations found for ${year} ${selectedUser ? `and user ${selectedUser}` : ''} in the selected date range.</td>`;
        reportBody.appendChild(row);
    }
}
