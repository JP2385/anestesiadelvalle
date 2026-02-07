import toast from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    const vacationInformContainer = document.getElementById('vacation-inform');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // Si no hay token, no hacer nada (sessionManager ya maneja el redirect)
    if (!token) return;

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
            const vacations = data.vacations || [];

            if (vacations.length === 0) {
                vacationInformContainer.textContent = 'No tienes vacaciones registradas.';
                return;
            }

            const upcomingVacations = filterUpcomingVacations(vacations);

            if (upcomingVacations.length > 0) {
                const vacationList = generateVacationList(upcomingVacations);
                vacationInformContainer.appendChild(vacationList);
            } else {
                vacationInformContainer.textContent = 'No tienes vacaciones próximas.';
            }
        }
    })
    .catch(() => {
        window.location.href = 'login.html';
    });
});

// Función para filtrar las próximas 4 vacaciones
function filterUpcomingVacations(vacations) {
    const today = new Date();

    const futureVacations = vacations.filter(vacation => new Date(vacation.startDate) >= today);
    futureVacations.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    return futureVacations.slice(0, 4);
}

// Función para generar la lista de vacaciones
function generateVacationList(vacations) {
    const list = document.createElement('ul');

    vacations.forEach(vacation => {
        const listItem = document.createElement('li');

        const options = { day: 'numeric', month: 'long', year: 'numeric' };

        const startDate = new Date(vacation.startDate);
        startDate.setHours(startDate.getHours() + 3);
        const endDate = new Date(vacation.endDate);
        endDate.setHours(endDate.getHours() + 3);

        const formattedStart = startDate.toLocaleDateString('es-ES', options);
        const formattedEnd = endDate.toLocaleDateString('es-ES', options);

        listItem.textContent = `Del ${formattedStart} hasta el ${formattedEnd}.`;
        list.appendChild(listItem);
    });

    return list;
}
