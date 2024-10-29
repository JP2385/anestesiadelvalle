import { generateTable, fetchUsers, assignMonthlyShiftsWithCardio } from './shiftScheduleUtils.js';
import { countWeekdayShifts, countWeekendShifts, countSaturdayShifts } from './shiftAssignmentsUtils.js';
import { updateShiftCountsTable } from './shiftCountTable.js';

document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const daysHeader = document.getElementById('days-header');
    const usersBody = document.getElementById('users-body');

    const dayAbbreviations = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

    const guardSites = {
        publicNeuquen: ['HH', 'Ce', 'CM'],
        privateNeuquen: ['Im'],
        privateRioNegro: ['Fn'],
        publicRioNegro: ['Cp', 'Al', 'Jb'],
        saturday: ['P1']
    };

    const assignButton = document.getElementById('assign-shifts');

    function processAndGenerateTable(users) {
        const filteredUsers = users.filter(user => user.username !== 'montes_esposito');
        filteredUsers.sort((a, b) => a.username.localeCompare(b.username));

        generateTable(filteredUsers, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader);

        const weekCounts = countWeekdayShifts();
        const weekendCounts = countWeekendShifts();
        const saturdayCounts = countSaturdayShifts();
        updateShiftCountsTable(weekCounts, weekendCounts, saturdayCounts);
    }

    assignButton.addEventListener('click', () => {
        console.log('Botón de asignar presionado');
        fetchUsers(apiUrl, (users) => {
            assignMonthlyShiftsWithCardio(users);

            const weekCounts = countWeekdayShifts();
            const weekendCounts = countWeekendShifts();
            const saturdayCounts = countSaturdayShifts();
            updateShiftCountsTable(weekCounts, weekendCounts, saturdayCounts);
        });
    });

    for (let year = 2020; year <= 2030; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    monthSelect.value = currentMonth;

    yearSelect.addEventListener('change', () => fetchUsers(apiUrl, processAndGenerateTable));
    monthSelect.addEventListener('change', () => fetchUsers(apiUrl, processAndGenerateTable));

    fetchUsers(apiUrl, processAndGenerateTable);
});
