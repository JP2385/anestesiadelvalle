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
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';
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

            displayAvailability(availabilityCount);

            // Asegurarse de que el DOM esté listo
            countEnabledSelectsByDay();

            // Log arrays to console
            console.log('Server Availability:', availability);

            return availability; // Devolver la disponibilidad recibida del servidor
        } else {
            const errorData = await response.json();
            console.error(`Error: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Hubo un problema con la solicitud: ' + error.message);
    }
}

function displayAvailability(availabilityCount) {
    const container = document.getElementById('availability-container');
    if (!container) {
        console.error('No se encontró el contenedor de disponibilidad');
        return;
    }

    container.innerHTML = `
        <h3>Informe de asignaciones</h3>
        <table class="assigments-inform">
            <thead>
                <tr>
                    <th class="work-site"></th>
                    <th>Lunes</th>
                    <th>Martes</th>
                    <th>Miércoles</th>
                    <th>Jueves</th>
                    <th>Viernes</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="work-site"><span class="inform">Nro de lugares habilitados</span></td>
                    <td id="monday-sites"></td>
                    <td id="tuesday-sites"></td>
                    <td id="wednesday-sites"></td>
                    <td id="thursday-sites"></td>
                    <td id="friday-sites"></td>
                </tr>
                <tr>
                    <td><span class="inform">Nro. de Anestesiólogos disponibles</span></td>
                    <td><span id="monday-available">${availabilityCount.monday}</span></td>
                    <td><span id="tuesday-available">${availabilityCount.tuesday}</span></td>
                    <td><span id="wednesday-available">${availabilityCount.wednesday}</span></td>
                    <td><span id="thursday-available">${availabilityCount.thursday}</span></td>
                    <td><span id="friday-available">${availabilityCount.friday}</span></td>
                </tr>
                <tr>
                    <td><span class="inform">Nro. de Anestesiólogos asignados</span></td>
                    <td><span id="monday-assignments">0</span></td>
                    <td><span id="tuesday-assignments">0</span></td>
                    <td><span id="wednesday-assignments">0</span></td>
                    <td><span id="thursday-assignments">0</span></td>
                    <td><span id="friday-assignments">0</span></td>
                </tr>
                <tr>
                    <td><span class="inform">Anestesiólogos no asignados</span></td>
                    <td><span id="monday-compare"></span></td>
                    <td><span id= "tuesday-compare"></span></td>
                    <td><span id="wednesday-compare"></span></td>
                    <td><span id="thursday-compare"></span></td>
                    <td><span id="friday-compare"></span></td>
                </tr>
            </tbody>
        </table>
    `;
}








/* <span class="inform">Lugares de trabajo por día:</span>
<span id="monday-sites">Lunes: 0, </span>
<span id="tuesday-sites">Martes: 0, </span>
<span id="wednesday-sites">Miércoles: 0,</span>
<span id="thursday-sites">Jueves: 0, </span>
<span id="friday-sites">Viernes: 0.</span>
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
<span id="friday-assignments">Viernes: 0.</span> */