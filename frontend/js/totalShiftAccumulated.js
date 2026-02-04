document.addEventListener('DOMContentLoaded', async () => {
    const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://adelvalle-88dd0d34d7bd.herokuapp.com';

    const tableBody = document.getElementById('accumulated-shift-counts-body');

    try {
        const response = await fetch(`${apiUrl}/shift-schedule/accumulated-counts`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener los datos acumulados');
        }

        const accumulatedData = await response.json();

        Object.entries(accumulatedData)
            .sort(([a], [b]) => a.localeCompare(b)) // Orden alfabético por username
            .forEach(([username, counts]) => {
                const row = document.createElement('tr');

                const userCell = document.createElement('td');
                userCell.textContent = username;
                row.appendChild(userCell);

                const weekCell = document.createElement('td');
                weekCell.textContent = counts.week % 1 !== 0 ? counts.week.toFixed(1) : counts.week.toFixed(0);
                row.appendChild(weekCell);

                const weekendCell = document.createElement('td');
                weekendCell.textContent = counts.weekend % 1 !== 0 ? counts.weekend.toFixed(1) : counts.weekend.toFixed(0);
                row.appendChild(weekendCell);

                const saturdayCell = document.createElement('td');
                saturdayCell.textContent = counts.saturday.toFixed(0);
                row.appendChild(saturdayCell);

                tableBody.appendChild(row);
            });
    } catch (error) {
        console.error('❌ Error al cargar los datos acumulados:', error);
    }
});
