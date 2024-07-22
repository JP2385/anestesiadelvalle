import {countEnabledSelectsByDay} from './autoAssignFunctions.js';

export function getWeekNumber(currentDate) {
    const dayOfWeek = currentDate.getDay(); // 0 (Sunday) to 6 (Saturday)
    
    let referenceDate;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Saturday (6) or Sunday (0)
        const daysUntilNextMonday = (8 - dayOfWeek) % 7;
        referenceDate = new Date(currentDate);
        referenceDate.setDate(currentDate.getDate() + daysUntilNextMonday);
    } else if (dayOfWeek === 1) {
        // Monday (1)
        referenceDate = new Date(currentDate);
    } else {
        // Tuesday (2) to Friday (5)
        const daysSinceLastMonday = (dayOfWeek - 1);
        referenceDate = new Date(currentDate);
        referenceDate.setDate(currentDate.getDate() - daysSinceLastMonday);
    }

    // Get the ISO week number for the reference date
    const yearStart = new Date(Date.UTC(referenceDate.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((referenceDate - yearStart) / 86400000) + yearStart.getUTCDay() + 1) / 7);

    return weekNumber;
}

export function updateSelectBackgroundColors() {
    document.querySelectorAll('select').forEach(select => {
        if (select.value === '') {
            select.classList.add('default');
            select.classList.remove('assigned');
        } else {
            select.classList.add('assigned');
            select.classList.remove('default');
        }
    });
}

export async function fetchAvailability() {
    // const apiUrl = 'http://localhost:3000';
    const apiUrl = 'https://adv-37d5b772f5fd.herokuapp.com';
    try {
        const response = await fetch(`${apiUrl}/auth/availability`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const availability = await response.json();
            displayAvailability(availability);
            countEnabledSelectsByDay();
        } else {
            const errorData = await response.json();
            console.error(`Error: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Hubo un problema con la solicitud: ' + error.message);
    }
}

function displayAvailability(availability) {
    const container = document.getElementById('availability-container');
    container.innerHTML = `
        <h2>Informe de asignaciones:</h2>
        <h3>Anestesiólogos disponibles por día:</h3>
        <p>Lunes: ${availability.monday},
        Martes: ${availability.tuesday},
        Miércoles: ${availability.wednesday},
        Jueves: ${availability.thursday},
        Viernes: ${availability.friday}.</p>
        <h3>Anestesiólogos asignados por día:</h3>
        <span id="monday-assignments">Lunes: 0, </span>
        <span id="tuesday-assignments">Martes: 0, </span>
        <span id="wednesday-assignments">Miércoles: 0,</span>
        <span id="thursday-assignments">Jueves: 0, </span>
        <span id="friday-assignments">Viernes: 0.</span>
        <h3>Lugares de trabajo por día:</h3>
        <span id="monday-sites">Lunes: 0, </span>
        <span id="tuesday-sites">Martes: 0, </span>
        <span id="wednesday-sites">Miércoles: 0,</span>
        <span id="thursday-sites">Jueves: 0, </span>
        <span id="friday-sites">Viernes: 0.</span>
    `;
}