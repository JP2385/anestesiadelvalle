document.addEventListener('DOMContentLoaded', () => {
    const printButton = document.getElementById('print-schedule');

    printButton.addEventListener('click', () => {
        // Almacenar el momento en que se oprimió
        const timestamp = new Date().toISOString();
        console.log(`Programación impresa a las: ${timestamp}`);

        // Almacenar las asignaciones
        const assignments = collectAssignments();
        console.log('Asignaciones:', assignments);

        // Guardar las asignaciones y el timestamp en el localStorage para recuperarlas después
        localStorage.setItem('savedAssignments', JSON.stringify(assignments));
        localStorage.setItem('timestamp', timestamp);

        // Generar la tabla de resumen
        const summaryTable = generateSummaryTable(assignments);
        document.body.appendChild(summaryTable);

        // (Opcional) Volcar la información en una sección específica de la app
        // Aquí puedes añadir código para enviar las asignaciones a tu backend o almacenarlas de alguna otra forma
    });
});

function collectAssignments() {
    const assignments = {};
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const workSite = row.querySelector('.work-site').textContent.trim();
        const selects = row.querySelectorAll('select');

        selects.forEach((select, index) => {
            const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index];
            const selectedUser = select.options[select.selectedIndex].text;

            if (!assignments[day]) {
                assignments[day] = [];
            }

            if (selectedUser !== "") { // Asegurarse de que no está vacío
                assignments[day].push({
                    workSite: workSite,
                    user: selectedUser
                });
            }
        });
    }

    return assignments;
}

function generateSummaryTable(assignments) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const headerRow = document.createElement('tr');
    const headers = ['Día', 'Sitio de Trabajo', 'Usuario'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    Object.keys(assignments).forEach(day => {
        assignments[day].forEach(assignment => {
            const row = document.createElement('tr');

            const dayCell = document.createElement('td');
            dayCell.textContent = day.charAt(0).toUpperCase() + day.slice(1); // Capitalizar el día
            row.appendChild(dayCell);

            const workSiteCell = document.createElement('td');
            workSiteCell.textContent = assignment.workSite;
            row.appendChild(workSiteCell);

            const userCell = document.createElement('td');
            userCell.textContent = assignment.user;
            row.appendChild(userCell);

            tbody.appendChild(row);
        });
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    return table;
}
