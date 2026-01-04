/**
 * Función compartida para cargar el cronograma guardado más reciente
 * Retorna true si se cargó un cronograma, false si no existe
 */

export async function loadSavedSchedule(apiUrl, availability) {
    try {
        const response = await fetch(`${apiUrl}/schedule/last-schedule`);

        if (!response.ok) {
            console.log('No hay cronograma guardado');
            return false;
        }

        const schedule = await response.json();

        if (!schedule || !schedule.assignments) {
            console.log('Cronograma vacío');
            return false;
        }

        const { assignments, selectConfig, longDaysInform, availabilityInform, mortalCombat } = schedule;

        // IMPORTANTE: Restaurar estado de Mortal Kombat ANTES de poblar selects
        if (mortalCombat) {
            await restoreMortalCombatState(mortalCombat, availability);
        }

        const scheduleBody = document.getElementById('schedule-body');
        const rows = scheduleBody.getElementsByTagName('tr');

        // Actualizar longDaysInform
        const longDaysSpan = document.getElementById('long-days-inform');
        if (longDaysSpan && longDaysInform) {
            const items = longDaysInform.split('-').map(item => item.trim()).filter(item => item.length > 0);
            const ul = document.createElement('ul');

            items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `- ${item.trim()}`;
                ul.appendChild(li);
            });

            longDaysSpan.innerHTML = '';
            longDaysSpan.appendChild(ul);
        }

        // Actualizar availabilityInform
        if (availabilityInform) {
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                const sitesElement = document.getElementById(`${day}-sites`);
                const availableElement = document.getElementById(`${day}-available`);
                const assignmentsElement = document.getElementById(`${day}-assignments`);
                const compareElement = document.getElementById(`${day}-compare`);

                if (sitesElement && availableElement && assignmentsElement && compareElement) {
                    const sitesTd = sitesElement.closest('td');
                    const availableTd = availableElement.closest('td');
                    const assignmentsTd = assignmentsElement.closest('td');
                    const compareTd = compareElement.closest('td');

                    // Actualizar valores de texto
                    sitesElement.textContent = availabilityInform[day].sitesEnabled.value || 0;
                    availableElement.textContent = availabilityInform[day].available.value || 0;
                    assignmentsElement.textContent = availabilityInform[day].assigned.value || 0;
                    compareElement.innerHTML = availabilityInform[day].unassigned.value || '';

                    // Actualizar backgroundColor y tooltips
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

                        // Aplicar colores basados en el usuario asignado y availability
                        const user = availability[day]?.find(u => u._id === assignment.userId || u.username === assignment.user);
                        if (user) {
                            select.classList.add('assigned');
                            // Aplicar clase de color basada en el horario de trabajo del usuario
                            if (user.workSchedule[day] === 'Mañana') {
                                select.classList.add('option-morning');
                            } else if (user.workSchedule[day] === 'Tarde') {
                                select.classList.add('option-afternoon');
                            } else if (user.workSchedule[day] === 'Variable') {
                                select.classList.add('option-long');
                            }
                        }
                    } else {
                        // Si no hay usuario asignado, aplicar clase default
                        select.classList.add('default');
                    }

                    if (config) {
                        select.disabled = config.disabled;
                    }
                });
            }
        }

        console.log('✓ Cronograma cargado exitosamente');
        return true;

    } catch (error) {
        console.error('Error cargando cronograma guardado:', error);
        return false;
    }
}

// Función para restaurar el estado de Mortal Kombat
async function restoreMortalCombatState(mortalCombatData, availability) {
    if (!mortalCombatData) return;

    const { globalMode, dailyModes } = mortalCombatData;

    // Importar las funciones necesarias de weekly-schedule-utils
    const { setMortalCombatMode, setDailyMortalCombatMode, populateSelectOptions } = await import('./weekly-schedule-utils.js');

    // Restaurar modo global
    if (globalMode) {
        setMortalCombatMode(true);
        updateMortalCombatButtonUI(true);
        console.log('✓ Modo Mortal Kombat global restaurado');
    }

    // Restaurar modos diarios
    if (dailyModes) {
        Object.keys(dailyModes).forEach(day => {
            if (dailyModes[day]) {
                setDailyMortalCombatMode(day, true);
                console.log(`✓ Modo Mortal Kombat restaurado para ${day}`);
            }
        });
    }

    // Re-popular las opciones con el estado de Mortal Kombat correcto
    await populateSelectOptions(availability);
}

// Función para actualizar la UI del botón de Mortal Kombat
function updateMortalCombatButtonUI(isActive) {
    const button = document.getElementById('mortal-combat-button');
    const legend = document.getElementById('mortal-combat-legend');

    if (button && legend) {
        const img = button.querySelector('img');

        if (isActive) {
            img.style.filter = 'brightness(1.5) saturate(1.5)';
            img.style.transform = 'scale(1.1)';
            legend.style.display = 'block';
            button.title = 'Desactivar Modo Mortal Kombat';
        } else {
            img.style.filter = 'brightness(1.5) saturate(1.5)';
            img.style.transform = '';
            legend.style.display = 'none';
            button.title = 'Activar Modo Mortal Kombat';
        }
    }
}
