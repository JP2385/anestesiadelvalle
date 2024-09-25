document.addEventListener('DOMContentLoaded', async function() {
    const yearSelect = document.getElementById('year');
    const userSelect = document.getElementById('user');
    const currentYear = new Date().getFullYear();
    let users = [];  // Mover la declaración de `users` fuera del bloque try

    try {
        // Realizar la solicitud al backend para obtener las vacaciones
        const response = await fetch('http://localhost:3000/vacations'); // Ajusta la URL según tu configuración
        users = await response.json();  // Ahora la variable `users` es accesible en todo el bloque

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
            yearSelect.value = sortedYears[0]; // Si no hay vacaciones para el año actual, seleccionar el más reciente
        }

        // Mostrar las vacaciones por defecto con el año y usuario actual
        generateReport(yearSelect.value, userSelect.value, users);

    } catch (error) {
        console.error('Error fetching vacation data:', error);
    }

    // Agregar eventos para actualizar el reporte cuando se cambia el año o el usuario
    yearSelect.addEventListener('change', function() {
        generateReport(yearSelect.value, userSelect.value, users);
    });

    userSelect.addEventListener('change', function() {
        generateReport(yearSelect.value, userSelect.value, users);
    });
});

// Función para poblar el select de usuarios
function populateUserSelect(users) {
    const userSelect = document.getElementById('user');
    userSelect.innerHTML = '<option value="">All Users</option>';  // Opción para mostrar todos los usuarios

    // Ordenar los usuarios alfabéticamente por username
    const sortedUsers = users.sort((a, b) => a.username.localeCompare(b.username));

    // Poblar el select con los usuarios ordenados
    sortedUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.username;
        userSelect.appendChild(option);
    });
}

// Función para generar el informe basado en el año y usuario seleccionados
function generateReport(year, selectedUser, users) {
    const reportBody = document.getElementById('report-body');
    reportBody.innerHTML = '';  // Limpiar resultados anteriores

    // Filtrar y ordenar las vacaciones por endDate, considerando el año y el usuario
    const reportData = users.map(user => {
        if (selectedUser && user.username !== selectedUser) {
            return [];  // Si un usuario está seleccionado, solo mostramos sus vacaciones
        }

        return user.vacations.filter(vacation => {
            const startDate = new Date(vacation.startDate);
            return startDate.getFullYear() == year;
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
        row.innerHTML = `<td colspan="3">No vacations found for ${year} ${selectedUser ? `and user ${selectedUser}` : ''}</td>`;
        reportBody.appendChild(row);
    }
}
