document.addEventListener('DOMContentLoaded', () => {
    console.log('printSchedule.js cargado');
    const printButton = document.getElementById('print-schedule');
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    printButton.addEventListener('click', async () => {
        console.log('Botón imprimir programación clicado');
        // Almacenar el momento en que se oprimió
        const timestamp = new Date().toISOString();

        // Almacenar las asignaciones y fechas de los encabezados
        const assignments = collectAssignments();
        const dayHeaders = collectDayHeaders();
        const selectConfig = collectSelectConfig(); // Recolectar configuración de los selects

        console.log('Datos recolectados:', { timestamp, assignments, dayHeaders, selectConfig });

        if (assignments) {
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
                    console.log('Datos guardados correctamente en el backend');
                    // Verificar si el Service Worker está controlando la página
                    if (navigator.serviceWorker.controller) {
                        console.log('Service Worker está controlando la página');
                        // Verificar si el permiso de notificación está concedido
                        if (Notification.permission === 'granted') {
                            console.log('Permiso de notificación concedido');
                            console.log('Enviando mensaje al Service Worker para mostrar notificación');
                            navigator.serviceWorker.controller.postMessage({
                                type: 'SHOW_NOTIFICATION',
                                title: 'Programación actualizada',
                                body: 'La programación ha sido actualizada. Por favor revise sus quirófanos asignados.'
                            });
                            console.log('Mensaje enviado al Service Worker');
                        } else {
                            console.log('Permiso de notificación no concedido');
                        }
                    } else {
                        console.log('Service Worker controller no está disponible');
                    }
                } else {
                    console.error('Error al guardar los datos en la base de datos');
                }
            } catch (error) {
                console.error('Error al enviar los datos al servidor:', error);
            }
        }
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
});
