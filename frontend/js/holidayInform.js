document.addEventListener('DOMContentLoaded', async function () {
    const yearSelect = document.getElementById('year');
    const userSelect = document.getElementById('user');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const currentYear = new Date().getFullYear();
    let allUsers = [];
    let allHolidays = [];

    async function fetchHolidaysAndUsers() {
        const apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : 'https://anestesiadelvalle.ar';
    
        try {
            const [usersResponse, holidaysResponse] = await Promise.all([
                fetch(`${apiUrl}/auth/users`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") }
                }),
                fetch(`${apiUrl}/holidays`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") }
                })
            ]);
    
            if (!usersResponse.ok || !holidaysResponse.ok) {
                throw new Error("Error al obtener datos.");
            }
    
            allUsers = await usersResponse.json();
            allHolidays = await holidaysResponse.json();
    
            return { allUsers, allHolidays };
        } catch (error) {
            console.error("❌ Error al obtener datos de feriados y usuarios:", error);
            return { allUsers: [], allHolidays: [] };
        }
    }
    
    try {
        const data = await fetchHolidaysAndUsers();
        allUsers = data.allUsers;
        allHolidays = data.allHolidays;

        if (allHolidays.length === 0) {
            console.warn("⚠️ No se encontraron feriados.");
            return;
        }

        // Poblar selects de usuarios y años
        populateUserSelect(allUsers, userSelect);
        populateYearSelect(allHolidays, yearSelect);

        // Generar el informe inicial solo con feriados largos
        generateHolidayReport(yearSelect.value, userSelect.value, startDateInput.value, endDateInput.value, allHolidays);
    } catch (error) {
        console.error("Error al obtener feriados:", error);
    }

    // Eventos para actualizar el informe
    yearSelect.addEventListener('change', () => generateHolidayReport(yearSelect.value, userSelect.value, startDateInput.value, endDateInput.value, allHolidays));
    userSelect.addEventListener('change', () => generateHolidayReport(yearSelect.value, userSelect.value, startDateInput.value, endDateInput.value, allHolidays));
    startDateInput.addEventListener('change', () => generateHolidayReport(yearSelect.value, userSelect.value, startDateInput.value, endDateInput.value, allHolidays));
    endDateInput.addEventListener('change', () => generateHolidayReport(yearSelect.value, userSelect.value, startDateInput.value, endDateInput.value, allHolidays));
});

// 🔹 Poblar el select de años disponibles (desde el año actual en adelante)
function populateYearSelect(holidays, yearSelect) {
    const currentYear = new Date().getFullYear();
    const years = new Set();

    holidays.forEach(holiday => years.add(new Date(holiday.startDate).getFullYear()));

    for (let year = currentYear; year <= Math.max(currentYear, ...years); year++) {
        years.add(year);
    }

    yearSelect.innerHTML = "";

    Array.from(years).sort((a, b) => b - a).forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    yearSelect.value = currentYear;
}

// 🔹 Poblar el select de usuarios
function populateUserSelect(users, userSelect) {
    userSelect.innerHTML = '<option value="">Todos los usuarios</option>';

    const sortedUsers = users.sort((a, b) => a.username.localeCompare(b.username));

    sortedUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.username;
        userSelect.appendChild(option);
    });
}

// 🔹 Generar el informe de feriados largos (solo los que duren más de 2 días)
function generateHolidayReport(year, selectedUser, startDate, endDate, holidays) {
    const reportBody = document.getElementById('report-body');
    reportBody.innerHTML = '';

    // Aplicar filtro de feriados largos (>2 días)
    const longHolidays = holidays.filter(h => 
        (new Date(h.endDate) - new Date(h.startDate)) / (1000 * 60 * 60 * 24) + 1 > 2
    );

    const filteredHolidays = longHolidays.filter(holiday => {
        let holidayStart = new Date(holiday.startDate);
        let holidayEnd = new Date(holiday.endDate);

        // ✅ Ajustar las fechas a medianoche UTC-3
        holidayStart.setUTCHours(3, 0, 0, 0);
        holidayEnd.setUTCHours(3, 0, 0, 0);

        const isInYear = holidayStart.getUTCFullYear() == year;
        const isInDateRange = (!startDate || holidayStart >= new Date(startDate)) && 
                              (!endDate || holidayEnd <= new Date(endDate));
        const hasUser = !selectedUser || holiday.users.some(user => user.username === selectedUser);

        return isInYear && isInDateRange && hasUser;
    });

    if (filteredHolidays.length > 0) {
        filteredHolidays.forEach(holiday => {
            const row = document.createElement('tr');
            
            // ✅ Convertir la fecha a string asegurando que se muestra correctamente en Argentina (UTC-3)
            let startDateStr = new Date(holiday.startDate);
            let endDateStr = new Date(holiday.endDate);

            startDateStr.setUTCHours(3, 0, 0, 0);
            endDateStr.setUTCHours(3, 0, 0, 0);

            // ✅ Restar un día al startDate para que se muestre el día anterior
            startDateStr.setDate(startDateStr.getDate() - 1);

            row.innerHTML = `
                <td>${holiday.name}</td>
                <td>${startDateStr.toLocaleDateString("es-ES")}</td>
                <td>${endDateStr.toLocaleDateString("es-ES")}</td>
                <td>${holiday.users.map(user => user.username).join(', ')}</td>
            `;
            reportBody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4">No hay feriados largos con los filtros seleccionados.</td>`;
        reportBody.appendChild(row);
    }
}


