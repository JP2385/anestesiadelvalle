document.addEventListener('DOMContentLoaded', () => {
    
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';
    const userAssignmentsContainer = document.getElementById('user-assignments');
    const token = localStorage.getItem('token');
    if (!token) {
        alert('No has iniciado sesión.');
        window.location.href = 'login.html';
        return;
    }

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
            const assignments = JSON.parse(localStorage.getItem('savedAssignments'));
            let dayHeaders = JSON.parse(localStorage.getItem('dayHeaders'));

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
            } else {
                userAssignmentsContainer.textContent = 'No hay datos de asignaciones disponibles.';
            }
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
    });

    return userAssignments;
}

function generateAssignmentList(userAssignments, dayHeaders) {
    const list = document.createElement('ul');

    Object.keys(userAssignments).forEach(day => {
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
