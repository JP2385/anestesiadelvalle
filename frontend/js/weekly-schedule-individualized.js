import toast from './toast.js';
import { buildWorkSiteName, mapWorkSiteRegimes } from './workSiteNameUtils.js';
import { generateWeekHeaders } from './weekDateFormatter.js';

document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com';
    const userAssignmentsContainer = document.getElementById('user-assignments');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    fetch(`${apiUrl}/auth/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            toast.error(`Error: ${data.message}`);
            setTimeout(() => window.location.href = 'login.html', 1500);
        } else {
            const currentUser = data.username;

            // Obtener el último schedule desde MongoDB
            fetch(`${apiUrl}/schedule/last-schedule`)
                .then(response => response.json())
                .then(data => {
                    if (!data.success || !data.schedule) {
                        userAssignmentsContainer.textContent = 'No hay datos de asignaciones disponibles.';
                        return;
                    }

                    const schedule = data.schedule;
                    const assignments = schedule.assignments;
                    const timestamp = schedule.createdAt;
                    const generatedBy = schedule.createdBy?.username || 'Unknown';

                    if (assignments) {
                        // Generar dayHeaders desde weekStart con formato largo
                        const dayHeaders = generateWeekHeaders(schedule.weekStart, true);

                        // Transformar assignments con nueva estructura
                        const userAssignments = transformAssignments(assignments, currentUser);

                        if (userAssignments && Object.keys(userAssignments).length > 0) {
                            const assignmentList = generateAssignmentList(userAssignments, dayHeaders);
                            userAssignmentsContainer.appendChild(assignmentList);
                        } else {
                            userAssignmentsContainer.textContent = 'No tienes asignaciones para esta semana.';
                        }

                        // Formatear la fecha de impresión
                        const formattedTimestamp = formatTimestamp(timestamp);

                        // Crear el contenedor para la fecha y el nombre del usuario
                        const headerDiv = document.createElement('div');
                        headerDiv.className = 'header-div';

                        // Crear el div para la fecha de impresión
                        const timestampDiv = document.createElement('div');
                        timestampDiv.className = 'timestamp-div';

                        // Crear el elemento de fecha de impresión
                        const timestampElement = document.createElement('p');
                        timestampElement.textContent = `Programación generada el ${formattedTimestamp} por ${generatedBy}`;
                        timestampElement.className = 'timestamp';

                        // Añadir el elemento de fecha al div de la fecha
                        timestampDiv.appendChild(timestampElement);

                        // Añadir el contenedor de la cabecera al final del contenedor principal
                        headerDiv.appendChild(timestampDiv);
                        userAssignmentsContainer.appendChild(headerDiv);
                    } else {
                        userAssignmentsContainer.textContent = 'No hay datos de asignaciones disponibles.';
                    }
                })
                .catch(error => {
                    console.error('Error al obtener el schedule:', error);
                    toast.error('Hubo un problema al obtener el último schedule: ' + error.message);
                });
        }
    })
    .catch(error => {
        // alert('Hubo un problema con la solicitud: ' + error.message);
        window.location.href = 'login.html';
    });
});

function transformAssignments(assignments, currentUsername) {
    const userAssignments = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // Mapear regímenes para identificar workSites con múltiples regímenes
    const workSiteRegimes = mapWorkSiteRegimes(assignments);

    days.forEach(day => {
        if (Array.isArray(assignments[day])) {
            assignments[day].forEach(assignment => {
                const workSiteId = assignment.workSiteId;
                const userId = assignment.userId;
                const regime = assignment.regime;

                // Verificar si este assignment pertenece al usuario actual
                const username = userId?.username || userId?.firstName || '';

                if (username === currentUsername) {
                    // Construir el nombre del workSite usando la utilidad
                    const wsId = workSiteId?._id?.toString() || workSiteId?.toString();
                    const hasMultipleRegimes = workSiteRegimes.get(wsId)?.size > 1;

                    const workSiteName = buildWorkSiteName(
                        workSiteId,
                        workSiteId?.institution,
                        regime,
                        true, // Siempre mostrar abreviatura
                        hasMultipleRegimes
                    );

                    if (!userAssignments[day]) {
                        userAssignments[day] = [];
                    }

                    userAssignments[day].push(workSiteName);
                }
            });
        }
    });

    return userAssignments;
}

function generateAssignmentList(userAssignments, dayHeaders) {
    const list = document.createElement('ul');

    // Definir el orden de los días de la semana
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // Obtener las claves de userAssignments y ordenarlas según dayOrder
    const sortedDays = Object.keys(userAssignments).sort((a, b) => {
        return dayOrder.indexOf(a) - dayOrder.indexOf(b);
    });

    // Generar la lista de asignaciones en orden
    sortedDays.forEach(day => {
        const dayHeader = dayHeaders[day];
        const workSites = userAssignments[day];

        workSites.forEach(workSite => {
            const listItem = document.createElement('li');
            listItem.textContent = `${dayHeader}: ${workSite}`;
            list.appendChild(listItem);
        });
    });

    return list;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let formattedDate = date.toLocaleDateString('es-ES', options);

    // Eliminar la coma después del día de la semana
    formattedDate = formattedDate.replace(/,\s/, ' ');

    // Formato 24 horas
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${formattedDate} a las ${hours}:${minutes} hs.`;
}
