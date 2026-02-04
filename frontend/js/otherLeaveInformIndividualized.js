document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://adelvalle-88dd0d34d7bd.herokuapp.com';
    const leaveInformContainer = document.getElementById('other-leaves-inform');
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
                const heading = document.createElement('h3');
                heading.textContent = 'Tenés una licencia en curso:';
                leaveInformContainer.appendChild(heading);

                const list = document.createElement('ul');
                const item = document.createElement('li');

                const options = { day: 'numeric', month: 'long', year: 'numeric' };

                const start = new Date(activeLeave.startDate);
                start.setHours(start.getHours() + 3); // ajustar a zona horaria local
                const end = new Date(activeLeave.endDate);
                end.setHours(end.getHours() + 3);

                const concept = activeLeave.type || 'Licencia';
                const formattedStart = start.toLocaleDateString('es-ES', options);
                const formattedEnd = end.toLocaleDateString('es-ES', options);

                item.innerHTML = `<strong>${concept}:</strong> del ${formattedStart} hasta el ${formattedEnd}.`;
                list.appendChild(item);
                leaveInformContainer.appendChild(list);
            }
        }
    })
    .catch(() => {
        window.location.href = 'login.html';
    });
});
