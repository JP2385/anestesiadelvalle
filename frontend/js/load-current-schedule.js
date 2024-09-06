import { fetchAvailability } from './assignUtils.js';
import { updateWeekDates, populateSelectOptions, initializeLockButtons, handleSelectChange, handleAutoAssignForWeek } from './weekly-schedule-utils.js';

document.addEventListener('DOMContentLoaded', async function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    let availability;
    try {
        showSpinner();
        availability = await fetchAvailability(apiUrl);
        await updateWeekDates(apiUrl, availability);
        await populateSelectOptions(availability);
        initializeLockButtons();  
    } finally {
        hideSpinner();
    }

    const dayIndices = [0, 1, 2, 3, 4]; // Índices para lunes a viernes
    const autoAssignButton = document.getElementById('autoAssign-button');
    autoAssignButton.addEventListener('click', async () => {
        await handleAutoAssignForWeek(apiUrl, dayIndices, availability); // Usar la función independiente
    });

    document.querySelectorAll('select').forEach(select => {
        select.classList.add('default');
        select.setAttribute('data-original-value', select.value);
        select.addEventListener('change', (event) => handleSelectChange(event, availability));
    });

    fetch(`${apiUrl}/schedule/last-schedule`)
        .then(response => {
            return response.json();
        })
        .then(schedule => {
            const assignments = schedule.assignments;
            const selectConfig = schedule.selectConfig;
            const longDaysInform = schedule.longDaysInform;
            const availabilityInform = schedule.availabilityInform; // Obtener availabilityInform

            const scheduleBody = document.getElementById('schedule-body');
            const rows = scheduleBody.getElementsByTagName('tr');

            // Actualizar longDaysInform
            const longDaysSpan = document.getElementById('long-days-inform');
            if (longDaysSpan && longDaysInform) {
                const items = longDaysInform.split('.').map(item => item.trim()).filter(item => item.length > 0);
                const ul = document.createElement('ul');
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item.trim();
                    ul.appendChild(li);
                });
                longDaysSpan.innerHTML = '';
                longDaysSpan.appendChild(ul);
            }

            // Actualizar availabilityInform
            if (availabilityInform) {
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                    document.getElementById(`${day}-sites`).textContent = availabilityInform[day].sitesEnabled || 0;
                    document.getElementById(`${day}-available`).textContent = availabilityInform[day].available || 0;
                    document.getElementById(`${day}-assignments`).textContent = availabilityInform[day].assigned || 0;
                    document.getElementById(`${day}-compare`).textContent = availabilityInform[day].unassigned || 0;
                });
            }

            // Procesar las filas de trabajo y los selects
            for (let row of rows) {
                const workSiteElement = row.querySelector('.work-site');
                if (workSiteElement) {
                    const workSite = workSiteElement.textContent.trim();
                    
                    const selects = row.querySelectorAll('select');
                    selects.forEach((select, index) => {
                        const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index];
                        const assignment = assignments[day]?.find(a => a.workSite === workSite);
                        const config = selectConfig[day]?.find(c => c.workSite === workSite);

                        if (assignment && assignment.user !== 'Select user') {
                            const option = document.createElement('option');
                            option.value = assignment.userId;
                            option.textContent = assignment.user;
                            option.setAttribute('data-username', assignment.username);
                            option.selected = true;
                            select.appendChild(option);
                        }

                        if (config) {
                            select.disabled = config.disabled;

                            // Aplicar la clase almacenada en selectConfig           
                            select.className = config.className; // Asigna la clase almacenada al select
                        }
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
        });
 });