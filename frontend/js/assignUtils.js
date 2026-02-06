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
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com';
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

            // Crear availabilityCount a partir de la data recibida
            const availabilityCount = {
                monday: availability.monday.length,
                tuesday: availability.tuesday.length,
                wednesday: availability.wednesday.length,
                thursday: availability.thursday.length,
                friday: availability.friday.length
            };
            ('Calculated availability count:', availabilityCount);

            updateAvailability(availabilityCount);

            // Asegurarse de que el DOM esté listo
            countEnabledSelectsByDay();

            return availability; // Devolver la disponibilidad recibida del servidor
        } else {
            const errorData = await response.json();
            console.error(`Error: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Hubo un problema con la solicitud: ' + error.message);
    }
}

function updateAvailability(availabilityCount) {
    const container = document.getElementById('availability-container');
    if (!container) {
        console.error('No se encontró el contenedor de disponibilidad');
        return;
    }

    ('Updating availability in DOM with:', availabilityCount);

    const mondayAvailable = document.getElementById('monday-available');
    const tuesdayAvailable = document.getElementById('tuesday-available');
    const wednesdayAvailable = document.getElementById('wednesday-available');
    const thursdayAvailable = document.getElementById('thursday-available');
    const fridayAvailable = document.getElementById('friday-available');

    if (mondayAvailable) {
        mondayAvailable.innerText = availabilityCount.monday;
    } else {
        console.error('No se encontró el elemento monday-available');
    }

    if (tuesdayAvailable) {
        tuesdayAvailable.innerText = availabilityCount.tuesday;
    } else {
        console.error('No se encontró el elemento tuesday-available');
    }

    if (wednesdayAvailable) {
        wednesdayAvailable.innerText = availabilityCount.wednesday;
    } else {
        console.error('No se encontró el elemento wednesday-available');
    }

    if (thursdayAvailable) {
        thursdayAvailable.innerText = availabilityCount.thursday;
    } else {
        console.error('No se encontró el elemento thursday-available');
    }

    if (fridayAvailable) {
        fridayAvailable.innerText = availabilityCount.friday;
    } else {
        console.error('No se encontró el elemento friday-available');
    }
}
