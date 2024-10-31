import { countWeekdayShifts, countWeekendShifts, countSaturdayShifts } from './shiftAssignmentsUtils.js';

document.getElementById('print-shifts').addEventListener('click', async () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    // Obtener año y mes seleccionados desde el DOM
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const year = yearSelect.value;
    const month = (parseInt(monthSelect.value) + 1).toString().padStart(2, '0'); // Convertir a formato 'MM'

    const monthYear = `${year}-${month}`; // Formato final 'YYYY-MM'

    // Función para obtener el usuario actual
    async function getCurrentUser() {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const response = await fetch(`${apiUrl}/auth/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            const data = await response.json();
            if (data.message) {
                alert(`Error: ${data.message}`);
                window.location.href = 'login.html';
                return null;
            } else {
                return data.username;
            }
        } catch (error) {
            alert('Hubo un problema al obtener el perfil: ' + error.message);
            window.location.href = 'login.html';
            return null;
        }
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) return;

    const shiftSchedule = captureShiftSchedule();
    const shiftCounts = transformShiftCounts();

    // Capturar y almacenar todos los atributos del select
    const selectConfig = Array.from(document.querySelectorAll('#shift-schedule select'))
        .map(select => ({
            day: select.getAttribute('data-day'),
            username: select.getAttribute('data-username'),
            assignment: select.value,
            isDisabled: select.disabled,
        }))
        .filter(config => config.assignment && config.assignment.trim() !== "");

    try {
        // Guardar el horario mensual con mes y año incluidos
        await fetch(`${apiUrl}/shift-schedule/save-shift-schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                month: monthYear, // Envía el valor de 'YYYY-MM' al backend
                shiftSchedule,
                shiftCounts,
                selectConfig,
                printedBy: currentUser
            })
        });

        console.log('Shift schedule saved successfully.');

        // Transformar `shiftCounts` en un array para enviarlo al backend
        const shiftCountsArray = shiftCounts.map(count => ({
            username: count.username,
            weekdayShifts: count.weekdayShifts,
            weekendShifts: count.weekendShifts,
            saturdayShifts: count.saturdayShifts
        }));

    } catch (error) {
        console.error('Error al guardar el turno o actualizar el acumulado en la base de datos:', error);
    }
});


// Función para capturar el horario de turnos y almacenar los atributos de cada select
function captureShiftSchedule() {
    const rows = document.querySelectorAll('#users-body tr');
    const shiftSchedule = [];

    rows.forEach(row => {
        const username = row.cells[0].textContent.trim();
        const userShifts = Array.from(row.querySelectorAll('select'))
            .map(select => ({
                day: select.getAttribute('data-day'),
                assignment: select.value || null,
                isDisabled: select.disabled,
                dayOfWeek: select.getAttribute('data-dayofweek'),
                dayNumber: select.getAttribute('data-daynumber'),
                cardio: select.getAttribute('data-cardio')
            }))
            .filter(shift => shift.assignment);

        shiftSchedule.push({ username, shifts: userShifts });
    });

    return shiftSchedule;
}

// Transformar los conteos de turnos para estructurarlos antes de guardarlos
function transformShiftCounts() {
    const weekCounts = countWeekdayShifts();
    console.log("Weekday Shifts Count:", weekCounts);

    const weekendCounts = countWeekendShifts();
    console.log("Weekend Shifts Count:", weekendCounts);

    const saturdayCounts = countSaturdayShifts();
    console.log("Saturday Shifts Count:", saturdayCounts);

    const shiftCounts = Object.keys(weekCounts).map(username => ({
        username,
        weekdayShifts: weekCounts[username] || 0,
        weekendShifts: weekendCounts[username] || 0,
        saturdayShifts: saturdayCounts[username] || 0
    }));

    console.log("Final Shift Counts Array:", shiftCounts);
    return shiftCounts;
}