document.addEventListener('DOMContentLoaded', async () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    console.log('Fetching users...');
    const users = await fetchUsers(apiUrl);
    console.log('Users fetched:', users);

    console.log('Fetching last schedule...');
    const lastSchedule = await fetchLongDaysCount(apiUrl);
    console.log('Last schedule fetched:', lastSchedule);

    const longDaysCount = lastSchedule.longDaysCount || {};
    console.log('Long days count:', longDaysCount);

    const weekYear = getWeekYearFromSchedule(lastSchedule);
    console.log('Week/Year from schedule:', weekYear);

    console.log('Generating table headers...');
    generateTableHeaders(users);

    console.log('Generating table rows...');
    generateTableRows(longDaysCount, users, weekYear);
});

// Fetch users from backend
async function fetchUsers(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/auth/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            return await response.json();
        } else {
            const errorData = await response.json();
            console.error(`Error fetching users: ${errorData.message}`);
            return [];
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

// Fetch long days count data from backend
async function fetchLongDaysCount(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/schedule/last-schedule`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            return await response.json();
        } else {
            const errorData = await response.json();
            console.error(`Error fetching last schedule: ${errorData.message}`);
            return {};
        }
    } catch (error) {
        console.error('Error fetching long days count:', error);
        return {};
    }
}

// Generate table headers
function generateTableHeaders(users) {
    const thead = document.querySelector('#long-days-count-table thead tr');
    thead.innerHTML = '<th>Semana/Año</th>'; // Reset the headers
    users.forEach(user => {
        const th = document.createElement('th');
        th.textContent = user.username; // Ajusta esto según el formato de los datos de usuario
        thead.appendChild(th);
    });
}

// Generate table rows
function generateTableRows(longDaysCount, users, weekYear) {
    const tbody = document.querySelector('#long-days-count-table tbody');
    tbody.innerHTML = ''; // Clear existing rows

    // Generate a single row for the week of the schedule
    const tr = document.createElement('tr');
    const weekYearTd = document.createElement('td');
    weekYearTd.textContent = weekYear;
    tr.appendChild(weekYearTd);

    users.forEach(user => {
        const td = document.createElement('td');
        const userLongDaysCount = longDaysCount[user._id] ? longDaysCount[user._id].count : 0;
        td.textContent = userLongDaysCount;
        tr.appendChild(td);
    });

    tbody.appendChild(tr);
}

// Helper function to get week/year from the schedule's timestamp
function getWeekYearFromSchedule(schedule) {
    const timestamp = new Date(schedule.timestamp);
    const startDate = new Date(timestamp.getFullYear(), 0, 1);
    const days = Math.floor((timestamp - startDate) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((timestamp.getDay() + 1 + days) / 7);
    return `${week}/${timestamp.getFullYear()}`;
}
