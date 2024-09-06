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
        await handleAutoAssignForWeek(apiUrl, dayIndices, availability);
    });

    document.querySelectorAll('select').forEach(select => {
        select.classList.add('default');
        select.setAttribute('data-original-value', select.value);
        select.addEventListener('change', (event) => handleSelectChange(event, availability));
    });

    // Recuperar el último horario guardado
    fetch(`${apiUrl}/schedule/last-schedule`)
        .then(response => response.json())
        .then(schedule => {
            const assignments = schedule.assignments;
            const selectConfig = schedule.selectConfig;
            const longDaysInform = schedule.longDaysInform;
            const availabilityInform = schedule.availabilityInform;

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
            // Actualizar availabilityInform
            if (availabilityInform) {
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                    const sitesElement = document.getElementById(`${day}-sites`);
                    const availableElement = document.getElementById(`${day}-available`);
                    const assignmentsElement = document.getElementById(`${day}-assignments`);
                    const compareElement = document.getElementById(`${day}-compare`);

                    // Solo actualizamos si los elementos existen
                    if (sitesElement && availableElement && assignmentsElement && compareElement) {
                        const sitesTd = sitesElement.closest('td');
                        const availableTd = availableElement.closest('td');
                        const assignmentsTd = assignmentsElement.closest('td');
                        const compareTd = compareElement.closest('td');

                        // Actualizar valores de texto
                        sitesElement.textContent = availabilityInform[day].sitesEnabled.value || 0;
                        availableElement.textContent = availabilityInform[day].available.value || 0;
                        assignmentsElement.textContent = availabilityInform[day].assigned.value || 0;
                        compareElement.textContent = availabilityInform[day].unassigned.value || 0;

                        // Actualizar backgroundColor y tooltips (con verificación de existencia y vacío)
                        if (sitesTd) {
                            sitesTd.style.backgroundColor = availabilityInform[day].sitesEnabled.backgroundColor || 'transparent';
                            const sitesTooltip = availabilityInform[day].sitesEnabled.tooltip || '';
                            if (sitesTooltip) {
                                sitesTd.querySelector('.tooltip-wrapper').setAttribute('data-tooltip', sitesTooltip);
                            } else {
                                sitesTd.querySelector('.tooltip-wrapper').removeAttribute('data-tooltip');
                            }
                        }
                        if (availableTd) {
                            availableTd.style.backgroundColor = availabilityInform[day].available.backgroundColor || 'transparent';
                            const availableTooltip = availabilityInform[day].available.tooltip || '';
                            if (availableTooltip) {
                                availableTd.querySelector('.tooltip-wrapper').setAttribute('data-tooltip', availableTooltip);
                            } else {
                                availableTd.querySelector('.tooltip-wrapper').removeAttribute('data-tooltip');
                            }
                        }
                        if (assignmentsTd) {
                            assignmentsTd.style.backgroundColor = availabilityInform[day].assigned.backgroundColor || 'transparent';
                            const assignmentsTooltip = availabilityInform[day].assigned.tooltip || '';
                            if (assignmentsTooltip) {
                                assignmentsTd.querySelector('.tooltip-wrapper').setAttribute('data-tooltip', assignmentsTooltip);
                            } else {
                                assignmentsTd.querySelector('.tooltip-wrapper').removeAttribute('data-tooltip');
                            }
                        }
                        if (compareTd) {
                            compareTd.style.backgroundColor = availabilityInform[day].unassigned.backgroundColor || 'transparent';
                            const compareTooltip = availabilityInform[day].unassigned.tooltip || '';
                            if (compareTooltip) {
                                compareTd.querySelector('.tooltip-wrapper').setAttribute('data-tooltip', compareTooltip);
                            } else {
                                compareTd.querySelector('.tooltip-wrapper').removeAttribute('data-tooltip');
                            }
                        }
                    }
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
                            select.className = config.className;
                        }
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
        });
});
