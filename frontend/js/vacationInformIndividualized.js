document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://https://advalle-46fc1873b63d.herokuapp.com/';
    const vacationInformContainer = document.getElementById('vacation-inform');
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

            // Obtener los usuarios y sus vacaciones desde el backend
            fetch(`${apiUrl}/vacations`)
                .then(response => response.json())
                .then(users => {
                    // Buscar el usuario actual en el array de usuarios
                    const user = users.find(u => u.username === currentUser);

                    if (!user || user.vacations.length === 0) {
                        vacationInformContainer.textContent = 'No tienes vacaciones registradas.';
                        return;
                    }

                    // Filtrar las próximas vacaciones del usuario
                    const upcomingVacations = filterUpcomingVacations(user.vacations);

                    if (upcomingVacations.length > 0) {
                        const vacationList = generateVacationList(upcomingVacations);
                        vacationInformContainer.appendChild(vacationList);
                    } else {
                        vacationInformContainer.textContent = 'No tienes vacaciones próximas.';
                    }
                })
                .catch(error => {
                    alert('Hubo un problema al obtener las vacaciones: ' + error.message);
                });
        }
    })
    .catch(error => {
        // alert('Hubo un problema con la solicitud: ' + error.message);
        window.location.href = 'login.html';
    });
});

// Función para filtrar las próximas 4 vacaciones
function filterUpcomingVacations(vacations) {
    const today = new Date();

    // Filtrar vacaciones futuras
    const futureVacations = vacations.filter(vacation => {
        const startDate = new Date(vacation.startDate);
        return startDate >= today;
    });

    // Ordenar por la fecha de inicio más cercana
    futureVacations.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Retornar solo los próximos 4 períodos
    return futureVacations.slice(0, 4);
}

// Función para generar la lista de vacaciones
function generateVacationList(vacations) {
    const list = document.createElement('ul');

    vacations.forEach(vacation => {
        const listItem = document.createElement('li');

        // Función para sumar 3 horas a una fecha
        function addThreeHours(dateString) {
            const date = new Date(dateString);
            date.setHours(date.getHours() + 3);
            return date;
        }

        const options = { day: 'numeric', month: 'long', year: 'numeric' };  // Opciones para el formato
        
        // Sumar 3 horas a las fechas antes de mostrarlas
        const startDate = addThreeHours(vacation.startDate).toLocaleDateString('es-ES', options);
        const endDate = addThreeHours(vacation.endDate).toLocaleDateString('es-ES', options);

        listItem.textContent = `Del ${startDate} hasta el ${endDate}.`;
        list.appendChild(listItem);
    });

    return list;
}
