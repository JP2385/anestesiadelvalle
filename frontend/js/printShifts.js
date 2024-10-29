import { countWeekdayShifts, countWeekendShifts, countSaturdayShifts } from './shiftAssignmentsUtils.js';

document.getElementById('print-shifts').addEventListener('click', async () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

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
                return null; // Detener la ejecución si hay un error
            } else {
                return data.username; // Devolver el nombre de usuario
            }
        } catch (error) {
            alert('Hubo un problema al obtener el perfil: ' + error.message);
            window.location.href = 'login.html';
            return null;
        }
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) return; // Detener si no se obtuvo el usuario

    // Resto de la lógica para capturar y enviar datos
    const shiftSchedule = captureShiftSchedule();
    const shiftCounts = captureShiftCounts();
    const timestamp = new Date().toISOString(); // Timestamp para identificar la acción de impresión

    // Configuración de selects
    const selectConfig = Array.from(document.querySelectorAll('#shift-schedule select'))
        .map(select => ({
            day: select.getAttribute('data-day'),
            username: select.getAttribute('data-username'),
            assignment: select.value,
            isDisabled: select.disabled
        }))
        .filter(config => config.assignment && config.assignment.trim() !== ""); // Filtrar aquellos con assignment vacío

    try {
        // Enviar los datos al backend
        const response = await fetch(`${apiUrl}/shift-schedule/save-shift-schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                timestamp,
                shiftSchedule,
                shiftCounts,
                selectConfig,
                printedBy: currentUser // Usuario que realiza la acción de impresión
            })
        });

        if (response.ok) {
            // Redirigir a printShift.html para visualizar la configuración guardada
            // window.location.href = 'printShift.html';
        } else {
            console.error('Error al guardar los datos en la base de datos');
        }
    } catch (error) {
        console.error('Error al enviar los datos al servidor:', error);
    }
});

function captureShiftSchedule() {
    const rows = document.querySelectorAll('#users-body tr');
    const shiftSchedule = [];

    rows.forEach(row => {
        const username = row.cells[0].textContent.trim();
        const userShifts = Array.from(row.querySelectorAll('select'))
            .map(select => ({
                day: select.getAttribute('data-day'),
                assignment: select.value || null,
                isDisabled: select.disabled
            }))
            .filter(shift => shift.assignment);

        shiftSchedule.push({ username, shifts: userShifts });
    });

    return shiftSchedule;
}

function captureShiftCounts() {
    const weekCounts = countWeekdayShifts();
    const weekendCounts = countWeekendShifts();
    const saturdayCounts = countSaturdayShifts();

    const shiftCounts = Object.keys(weekCounts).map(username => ({
        username,
        weekCount: weekCounts[username] || 0,
        weekendCount: weekendCounts[username] || 0,
        saturdayCount: saturdayCounts[username] || 0
    }));

    return shiftCounts;
}
