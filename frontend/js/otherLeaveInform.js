import { fetchOtherLeaves } from './fetchOtherLeaves.js';

document.addEventListener('DOMContentLoaded', async function() {
    const yearSelect = document.getElementById('year');
    const typeSelect = document.getElementById('type');
    const userSelect = document.getElementById('user');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const currentYear = new Date().getFullYear();
    let users = [];

    try {
        users = await fetchOtherLeaves();

        populateUserSelect(users);
        populateTypeSelect(users);

        // Años disponibles según las licencias cargadas
        const leaveYears = new Set();

        users.forEach(user => {
            (user.otherLeaves || []).forEach(leave => {
                leaveYears.add(new Date(leave.startDate).getFullYear());
            });
        });

        const sortedYears = Array.from(leaveYears).sort((a, b) => b - a);

        // "Todos" permite ver una licencia que arranca en diciembre y termina en enero
        const allYearsOption = document.createElement('option');
        allYearsOption.value = '';
        allYearsOption.textContent = 'Todos';
        yearSelect.appendChild(allYearsOption);

        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });

        if (sortedYears.includes(currentYear)) {
            yearSelect.value = currentYear;
        } else if (sortedYears.length > 0) {
            yearSelect.value = sortedYears[0];
        }

        generateReport();

    } catch (error) {
        console.error('Error fetching other leave data:', error);
    }

    [yearSelect, typeSelect, userSelect, startDateInput, endDateInput].forEach(control => {
        control.addEventListener('change', generateReport);
    });

    function generateReport() {
        renderReport({
            year: yearSelect.value,
            type: typeSelect.value,
            selectedUser: userSelect.value,
            startDate: startDateInput.value,
            endDate: endDateInput.value,
            users
        });
    }
});

function populateUserSelect(users) {
    const userSelect = document.getElementById('user');
    userSelect.innerHTML = '<option value="">Todos los usuarios</option>';

    const sortedUsers = [...users].sort((a, b) => String(a.username).localeCompare(String(b.username), 'es'));

    sortedUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.username;
        userSelect.appendChild(option);
    });
}

// Los tipos son texto libre cargado a mano, así que se derivan de los datos.
function populateTypeSelect(users) {
    const typeSelect = document.getElementById('type');
    typeSelect.innerHTML = '<option value="">Todos los tipos</option>';

    const tipos = new Set();
    users.forEach(user => {
        (user.otherLeaves || []).forEach(leave => {
            if (leave.type) tipos.add(leave.type);
        });
    });

    Array.from(tipos).sort((a, b) => a.localeCompare(b, 'es')).forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo;
        option.textContent = tipo;
        typeSelect.appendChild(option);
    });
}

function renderReport({ year, type, selectedUser, startDate, endDate, users }) {
    const reportBody = document.getElementById('report-body');
    const resumenContainer = document.getElementById('resumen-tipos');
    reportBody.innerHTML = '';
    resumenContainer.innerHTML = '';

    const reportData = users.map(user => {
        if (selectedUser && user.username !== selectedUser) {
            return [];
        }

        return (user.otherLeaves || []).filter(leave => {
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);

            // Sin año seleccionado se muestran todas (útil para licencias que cruzan el año)
            const isInYear = !year || leaveStart.getFullYear() == year || leaveEnd.getFullYear() == year;

            const isOfType = !type || leave.type === type;

            const isInDateRange = (!startDate || leaveStart >= new Date(startDate)) &&
                                  (!endDate || leaveEnd <= new Date(endDate));

            return isInYear && isOfType && isInDateRange;
        }).map(leave => ({
            username: user.username,
            type: leave.type || 'Sin especificar',
            startDate: addThreeHours(leave.startDate),
            endDate: addThreeHours(leave.endDate),
            dias: contarDias(leave.startDate, leave.endDate)
        }));
    }).flat().sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    if (reportData.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = 'No se encontraron licencias con los filtros seleccionados.';
        row.appendChild(cell);
        reportBody.appendChild(row);
        return;
    }

    // Resumen: cuántas licencias de cada tipo entraron en el filtro
    const porTipo = {};
    reportData.forEach(l => { porTipo[l.type] = (porTipo[l.type] || 0) + 1; });

    Object.entries(porTipo)
        .sort((a, b) => b[1] - a[1])
        .forEach(([tipo, cantidad]) => {
            const chip = document.createElement('span');
            chip.className = 'resumen-chip';
            chip.textContent = `${tipo}: `;
            const n = document.createElement('span');
            n.className = 'resumen-cantidad';
            n.textContent = cantidad;
            chip.appendChild(n);
            resumenContainer.appendChild(chip);
        });

    reportData.forEach(leave => {
        const row = document.createElement('tr');
        // Usuario y tipo van por textContent: son datos cargados a mano.
        [
            leave.username,
            leave.type,
            new Date(leave.startDate).toLocaleDateString('es-ES'),
            new Date(leave.endDate).toLocaleDateString('es-ES'),
            leave.dias
        ].forEach(valor => {
            const cell = document.createElement('td');
            cell.textContent = valor;
            row.appendChild(cell);
        });
        reportBody.appendChild(row);
    });
}

function contarDias(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function addThreeHours(dateString) {
    const date = new Date(dateString);
    date.setHours(date.getHours() + 3);
    return date;
}
