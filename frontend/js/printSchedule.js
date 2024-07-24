document.addEventListener('DOMContentLoaded', () => {
    const printButton = document.getElementById('print-schedule');

    printButton.addEventListener('click', () => {
        // Almacenar el momento en que se oprimió
        const timestamp = new Date().toISOString();
        console.log(`Programación impresa a las: ${timestamp}`);

        // Almacenar las asignaciones y fechas de los encabezados
        const assignments = collectAssignments();
        const dayHeaders = collectDayHeaders();
        if (assignments) {
            console.log('Asignaciones:', assignments);
            console.log('Day Headers:', dayHeaders);

            // Guardar las asignaciones, las fechas de los encabezados y el timestamp en el localStorage
            localStorage.setItem('savedAssignments', JSON.stringify(assignments));
            localStorage.setItem('dayHeaders', JSON.stringify(dayHeaders));
            localStorage.setItem('timestamp', timestamp);

            // Redirigir a la nueva página que muestra la tabla generada
            window.location.href = 'print-view.html';
        }
    });
});

function collectAssignments() {
    const assignments = {};
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (workSiteElement) {
            const workSite = workSiteElement.textContent.trim();
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
    }

    return assignments;
}

function collectDayHeaders() {
    const dayHeaders = {};
    const headers = document.querySelectorAll('#schedule-assistant thead th');

    headers.forEach((header, index) => {
        if (index > 0) { // Saltar el primer header que no corresponde a los días de la semana
            const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index - 1];
            dayHeaders[day] = header.textContent.trim();
        }
    });

    return dayHeaders;
}
