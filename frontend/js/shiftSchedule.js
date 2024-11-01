import { processAndGenerateTable, fetchUsers, assignMonthlyShiftsWithCardio } from './shiftScheduleUtils.js';
import { countWeekdayShifts, countWeekendShifts, countSaturdayShifts } from './shiftAssignmentsUtils.js';
import { updateShiftCountsTableWithAccumulated } from './shiftCountTable.js';


document.addEventListener('DOMContentLoaded', async function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

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

    async function loadSchedule(year, month) {
        const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
        const endpointUrl = `${apiUrl}/shift-schedule/${yearMonth}`;
        
        try {
            const response = await fetch(endpointUrl);
            if (response.ok) {
                const scheduleData = await response.json();
                return scheduleData;
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error loading schedule:", error);
            return null;
        }
    }

    async function initializeSchedule() {
        const selectedYear = parseInt(yearSelect.value);
        const selectedMonth = parseInt(monthSelect.value) + 1;
    
        const existingSchedule = await loadSchedule(selectedYear, selectedMonth);
    
        fetchUsers(apiUrl, (users) => {
            processAndGenerateTable(users, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader, existingSchedule);
            
            // Definir los conteos antes de actualizar la tabla de conteo de guardias
            const weekCounts = countWeekdayShifts();
            const weekendCounts = countWeekendShifts();
            const saturdayCounts = countSaturdayShifts();
            updateShiftCountsTableWithAccumulated(weekCounts, weekendCounts, saturdayCounts);

        });
    }

    assignButton.addEventListener('click', async () => {
        const yearSelect = document.getElementById('year-select');
        const monthSelect = document.getElementById('month-select');
        const selectedYear = parseInt(yearSelect.value);
        const selectedMonth = parseInt(monthSelect.value);
    
        fetchUsers(apiUrl, async (users) => {
            // Llamar a assignMonthlyShiftsWithCardio con selectedYear y selectedMonth
            await assignMonthlyShiftsWithCardio(users, selectedYear, selectedMonth);
    
            // Ahora contamos las asignaciones realizadas en el DOM
            const weekCounts = countWeekdayShifts();
            const weekendCounts = countWeekendShifts();
            const saturdayCounts = countSaturdayShifts();
    
            // Llamamos a la función para actualizar la tabla con los acumulados
            await updateShiftCountsTableWithAccumulated(weekCounts, weekendCounts, saturdayCounts);

            // Mostrar alerta al finalizar
            alert('Guardias asignadas exitosamente.');
        });
    });
    
    

    for (let year = 2020; year <= 2030; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    monthSelect.value = currentMonth - 1;

    yearSelect.addEventListener('change', initializeSchedule);
    monthSelect.addEventListener('change', initializeSchedule);

    initializeSchedule();
});
