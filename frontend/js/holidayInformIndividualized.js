document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com';
    const holidayAssignmentsContainer = document.getElementById('holiday-assignments');
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

            // Obtener los feriados asignados desde el backend
            fetch(`${apiUrl}/holidays`)
                .then(response => response.json())
                .then(holidays => {
                    // Filtrar los feriados donde el usuario está asignado
                    const userHolidays = holidays.filter(holiday => 
                        holiday.users.some(user => user.username === currentUser)
                    );

                    if (userHolidays.length === 0) {
                        holidayAssignmentsContainer.textContent = 'No tienes feriados asignados.';
                        return;
                    }

                    // Generar y agregar la lista de feriados asignados
                    const holidayList = generateHolidayList(userHolidays, currentUser);
                    holidayAssignmentsContainer.appendChild(holidayList);
                })
                .catch(error => {
                    alert('Hubo un problema al obtener los feriados: ' + error.message);
                });
        }
    })
    .catch(error => {
        window.location.href = 'login.html';
    });
});

// Función para restar un día manteniendo la zona horaria correcta
function subtractOneDay(dateString) {
    const date = new Date(dateString);
    date.setUTCDate(date.getUTCDate() - 1); // ✅ Usar setUTCDate() para evitar cambios de zona horaria
    return date;
}

function generateHolidayList(holidays, currentUser) {
    const list = document.createElement('ul');

    holidays.forEach(holiday => {
        const listItem = document.createElement('li');

        const options = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };

        // Ajustar fechas antes de mostrarlas
        const startDate = subtractOneDay(holiday.startDate).toLocaleDateString('es-ES', options);
        const endDate = new Date(holiday.endDate).toLocaleDateString('es-ES', options);

        // Obtener la lista de usuarios asignados excluyendo al usuario actual
        const otherUsers = holiday.users
            .filter(user => user.username !== currentUser)
            .map(user => user.username)
            .join(', ');

        // Construcción del contenido con espaciado usando <p>
        let holidayText = `
            <div style="margin-bottom: 6px;"><strong>${holiday.name}.</strong></div>
            <div style="margin-bottom: 6px;">Del ${startDate} al ${endDate}.</div>
        `;

        if (otherUsers.length > 0) {
            holidayText += `<div style="margin-bottom: 6px;">Junto con ${otherUsers}.</div>`;
        }

        listItem.innerHTML = holidayText;
        list.appendChild(listItem);
    });

    return list;
}


