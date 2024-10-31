import { shiftAssignmentLabels } from './shiftLabels.js';
import { userRealNames } from './userLabels.js'; // Importar nombres reales

let userPhoneNumbers = {};

document.addEventListener('DOMContentLoaded', async () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const siteSelect = document.getElementById('site-select');
    const scheduleTable = document.getElementById('schedule-table');

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Fetch de usuarios para obtener números de teléfono
    try {
        const response = await fetch(`${apiUrl}/auth/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        const users = await response.json();
        users.forEach(user => {
            userPhoneNumbers[user.username] = user.phoneNumber; // Guardar los números de teléfono en el mapa
        });
        console.log("User phone numbers loaded:", userPhoneNumbers);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
    }

    // Llenar el select del año
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    // Llenar el select del mes
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        if (index === currentMonth) option.selected = true;
        monthSelect.appendChild(option);
    });

     // Agregar opciones de sitios al selector de sitios de guardia
     Object.entries(shiftAssignmentLabels).forEach(([key, value]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value;
        siteSelect.appendChild(option);
    });

    function fetchAndDisplaySchedule(year, month, site) {
        const formattedMonth = `${year}-${String(Number(month) + 1).padStart(2, '0')}`;
        console.log(`Fetching schedule for ${formattedMonth} and site ${site}`);  

        // Obtener las asignaciones de la base de datos
        fetch(`${apiUrl}/shift-schedule/${formattedMonth}`)
            .then(response => response.json())
            .then(schedule => {
                const shiftSchedule = schedule.shiftSchedule || [];
                generateCalendar(year, month, site, shiftSchedule);
            })
            .catch(error => {
                console.error('Hubo un problema al obtener el cronograma de guardias:', error);
            });
    }

    function generateCalendar(year, month, site, shiftSchedule) {
        scheduleTable.innerHTML = ''; // Limpiar tabla
        const startDate = new Date(year, month, 1);
        const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();
        const firstDayOfWeek = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;
    
        let currentRow = scheduleTable.insertRow();
        const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
        // Agregar encabezados de los días
        daysOfWeek.forEach(day => {
            const th = document.createElement('th');
            th.textContent = day;
            currentRow.appendChild(th);
        });
    
        currentRow = scheduleTable.insertRow();
    
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = currentRow.insertCell();
            const date = `${year}-${String(Number(month) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            const dateDiv = document.createElement('div');
            dateDiv.classList.add('date');
            dateDiv.textContent = `${daysOfWeek[(firstDayOfWeek + day - 1) % 7]} ${day}`;
            cell.appendChild(dateDiv);
    
            const assignmentsForDay = shiftSchedule
                .flatMap(user => 
                    user.shifts
                        .filter(shift => 
                            shift.day === date && 
                            (site === 'all' && shift.assignment !== 'V' || shift.assignment === site)
                        )
                        .map(shift => ({
                            username: user.username,
                            assignment: shiftAssignmentLabels[shift.assignment] || shift.assignment
                        }))
                );
    
            const assignmentsDiv = document.createElement('div');
            assignmentsDiv.classList.add('assignments');
            assignmentsForDay.forEach(assignment => {
                const assignmentText = document.createElement('p');
                const phoneNumber = userPhoneNumbers[assignment.username] || 'No phone'; 
    
                // Usar el nombre real del usuario o el username si no está en userRealNames
                const realName = userRealNames[assignment.username] || assignment.username;
    
                // Formato de salida con nombre real y número de teléfono
                assignmentText.textContent = site === 'all'
                    ? `${realName} Tel: ${phoneNumber} - ${assignment.assignment}`
                    : `${realName} Tel: ${phoneNumber}`;
                    
                assignmentsDiv.appendChild(assignmentText);
            });
            cell.appendChild(assignmentsDiv);
    
            if ((firstDayOfWeek + day) % 7 === 0) {
                currentRow = scheduleTable.insertRow();
            }
        }
    }

    

    // Generar calendario inicial con el año y mes actuales
    fetchAndDisplaySchedule(currentYear, currentMonth, siteSelect.value);

    // Escuchar cambios en los selects
    yearSelect.addEventListener('change', () => {
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });
    monthSelect.addEventListener('change', () => {
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });
    siteSelect.addEventListener('change', () => {
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });
});
