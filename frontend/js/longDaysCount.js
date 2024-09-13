import { generateTableHeaders, generateTableRows,  } from './longDaysCountUtils.js';

// DOMContentLoaded event to fetch data and generate the table
document.addEventListener('DOMContentLoaded', async () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    console.log('Fetching users...');
    const users = await fetchUsers(apiUrl);
    console.log('Users fetched:', users);

    console.log('Fetching last schedule of each week...');
    const schedules = await fetchLastScheduleOfEachWeek(apiUrl);
    console.log('Last schedules fetched:', schedules);

    console.log('Generating table headers...');
    generateTableHeaders(schedules);

    console.log('Generating table rows...');
    generateTableRows(schedules, users);
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

// Fetch last schedule of each week data from backend
async function fetchLastScheduleOfEachWeek(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/schedule/last-schedule-of-each-week`, {
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
            console.error(`Error fetching last schedule of each week: ${errorData.message}`);
            return [];
        }
    } catch (error) {
        console.error('Error fetching last schedule of each week:', error);
        return [];
    }
}

