import toast from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : window.location.origin;
    const leaveInformContainer = document.getElementById('other-leaves-inform');
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
            const otherLeaves = data.otherLeaves || [];
            leaveInformContainer.innerHTML = ''; // Limpiar siempre antes

            if (otherLeaves.length === 0) return;

            const now = new Date();
            const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

            const activeLeave = otherLeaves.find(leave => {
                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);

                return start <= today && end >= today;
            });

            if (activeLeave) {
                leaveInformContainer.appendChild(buildHeading('Tenés una licencia en curso:'));
                leaveInformContainer.appendChild(buildLeaveList([activeLeave]));
            }

            // Licencias que todavía no empezaron, ordenadas de la más próxima a la más lejana
            const upcomingLeaves = otherLeaves
                .filter(leave => new Date(leave.startDate) > today)
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

            if (upcomingLeaves.length > 0) {
                leaveInformContainer.appendChild(buildHeading('Tus próximas licencias son:'));
                leaveInformContainer.appendChild(buildLeaveList(upcomingLeaves));
            }
        }
    })
    .catch(() => {
        window.location.href = 'login.html';
    });
});

function buildHeading(text) {
    const heading = document.createElement('h3');
    heading.textContent = text;
    return heading;
}

function buildLeaveList(leaves) {
    const list = document.createElement('ul');
    const options = { day: 'numeric', month: 'long', year: 'numeric' };

    leaves.forEach(leave => {
        const item = document.createElement('li');

        const start = new Date(leave.startDate);
        start.setHours(start.getHours() + 3); // ajustar a zona horaria local
        const end = new Date(leave.endDate);
        end.setHours(end.getHours() + 3);

        const formattedStart = start.toLocaleDateString('es-ES', options);
        const formattedEnd = end.toLocaleDateString('es-ES', options);

        // El tipo de licencia es texto cargado a mano, así que va por textContent
        const concept = document.createElement('strong');
        concept.textContent = `${leave.type || 'Licencia'}:`;
        item.appendChild(concept);
        item.appendChild(document.createTextNode(` del ${formattedStart} hasta el ${formattedEnd}.`));

        list.appendChild(item);
    });

    return list;
}
