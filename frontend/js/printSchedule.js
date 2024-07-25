document.addEventListener('DOMContentLoaded', () => {
    const printButton = document.getElementById('print-schedule');
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    printButton.addEventListener('click', async () => {
        // Almacenar el momento en que se oprimió
        const timestamp = new Date().toISOString();
        console.log(`Programación impresa a las: ${timestamp}`);

        // Almacenar las asignaciones y fechas de los encabezados
        const assignments = collectAssignments();
        const dayHeaders = collectDayHeaders();
        const selectConfig = collectSelectConfig(); // Recolectar configuración de los selects

        if (assignments) {
            console.log('Asignaciones:', assignments);
            console.log('Day Headers:', dayHeaders);
            console.log('Select Config:', selectConfig);

            try {
                // Enviar los datos al backend
                const response = await fetch(`${apiUrl}/schedule/save-schedule`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ timestamp, assignments, dayHeaders, selectConfig }) // Incluir selectConfig
                });

                if (response.ok) {
                    console.log('Datos guardados correctamente en la base de datos');
                    window.location.href = 'print-view.html'; // Redirigir a la vista de impresión
                } else {
                    console.error('Error al guardar los datos en la base de datos');
                }
            } catch (error) {
                console.error('Error al enviar los datos al servidor:', error);
            }
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

                if (selectedUser !== "") {
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
        if (index > 0) {
            const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index - 1];
            dayHeaders[day] = header.textContent.trim();
        }
    });

    return dayHeaders;
}

function collectSelectConfig() {
    const selectConfig = {};
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (workSiteElement) {
            const workSite = workSiteElement.textContent.trim();
            const selects = row.querySelectorAll('select');

            selects.forEach((select, index) => {
                const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index];
                
                if (!selectConfig[day]) {
                    selectConfig[day] = [];
                }

                selectConfig[day].push({
                    workSite: workSite,
                    disabled: select.disabled
                });
            });
        }
    }

    return selectConfig;
}
