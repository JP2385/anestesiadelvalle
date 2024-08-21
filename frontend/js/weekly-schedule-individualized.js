document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';
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
            alert(`Error: ${data.message}`);
            window.location.href = 'login.html';
        } else {
            const currentUser = data.username;

            // Obtener el último schedule desde MongoDB
            fetch(`${apiUrl}/schedule/last-schedule`)
                .then(response => response.json())
                .then(schedule => {
                    const assignments = schedule.assignments;
                    const timestamp = schedule.timestamp;
                    const generatedBy = schedule.printedBy;
                    let dayHeaders = schedule.dayHeaders;

                    if (assignments && dayHeaders) {
                        // Limpiar los encabezados de los días
                        dayHeaders = cleanDayHeaders(dayHeaders);

                        const userAssignments = transformAssignments(assignments);

                        if (userAssignments[currentUser]) {
                            const assignmentList = generateAssignmentList(userAssignments[currentUser], dayHeaders);
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
                        userAssignmentsContainer.appendChild(headerDiv); // Ahora se añade debajo de la lista
                    } else {
                        userAssignmentsContainer.textContent = 'No hay datos de asignaciones disponibles.';
                    }
                })
                .catch(error => {
                    alert('Hubo un problema al obtener el último schedule: ' + error.message);
                });
        }
    })
    .catch(error => {
        alert('Hubo un problema con la solicitud: ' + error.message);
        window.location.href = 'login.html';
    });
});

function cleanDayHeaders(dayHeaders) {
    const cleanedDayHeaders = {};
    Object.keys(dayHeaders).forEach(day => {
        cleanedDayHeaders[day] = dayHeaders[day].replace(/🔄/g, '').trim();
    });
    return cleanedDayHeaders;
}

function transformAssignments(assignments) {
    const userAssignments = {};

    Object.keys(assignments).forEach(day => {
        if (Array.isArray(assignments[day])) {
            assignments[day].forEach(assignment => {
                const { user, workSite } = assignment;

                if (!userAssignments[user]) {
                    userAssignments[user] = {};
                }

                if (!userAssignments[user][day]) {
                    userAssignments[user][day] = [];
                }

                userAssignments[user][day].push(workSite);
            });
        } else {
            console.error(`Expected assignments[${day}] to be an array, but got:`, assignments[day]);
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
