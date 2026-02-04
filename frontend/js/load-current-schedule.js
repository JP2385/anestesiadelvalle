import { fetchAvailability } from './assignUtils.js';
import { updateWeekDates, populateSelectOptions, initializeLockButtons, handleSelectChange, handleAutoAssignForWeek, initializeMortalCombatButton } from './weekly-schedule-utils.js';
import { initializeFloatingTable } from './floatingTable.js';

document.addEventListener('DOMContentLoaded', async function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adelvalle-88dd0d34d7bd.herokuapp.com';

    let availability;
    try {
        showSpinner();
        availability = await fetchAvailability(apiUrl);
        await updateWeekDates(apiUrl, availability);
        await populateSelectOptions(availability);
        initializeLockButtons();
        initializeMortalCombatButton(availability);  // Inicializar botón de Mortal Combat
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
        .then(async schedule => {
            const assignments = schedule.assignments;
            const selectConfig = schedule.selectConfig;
            const longDaysInform = schedule.longDaysInform;
            const availabilityInform = schedule.availabilityInform;
            const mortalCombat = schedule.mortalCombat;

            // IMPORTANTE: Restaurar estado de Mortal Kombat ANTES de popular selects
            if (mortalCombat) {
                await restoreMortalCombatState(mortalCombat, availability);
            }

            const scheduleBody = document.getElementById('schedule-body');
            const rows = scheduleBody.getElementsByTagName('tr');

            // Actualizar longDaysInform
            // Actualizar longDaysInform
            const longDaysSpan = document.getElementById('long-days-inform');
            if (longDaysSpan && longDaysInform) {
                // Dividir la cadena longDaysInform en base al "-" para separar las líneas
                const items = longDaysInform.split('-').map(item => item.trim()).filter(item => item.length > 0);
                
                // Crear un nuevo elemento <ul>
                const ul = document.createElement('ul');
                
                // Recorrer los elementos separados por "-"
                items.forEach(item => {
                    // Crear un nuevo <li> para cada elemento
                    const li = document.createElement('li');
                    
                    // Añadir el "-" al inicio del texto
                    li.textContent = `- ${item.trim()}`;
                    
                    // Añadir el <li> al <ul>
                    ul.appendChild(li);
                });

                // Limpiar el contenido anterior y añadir la nueva lista <ul> al elemento longDaysSpan
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
            
                        // Para el campo compare, usamos innerHTML para que los <br> se interpreten correctamente
                        compareElement.innerHTML = availabilityInform[day].unassigned.value || '';
            
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
                            // Buscar el usuario en availability
                            // Primero intentar por _id directo, luego por originalId para usuarios duplicados
                            let user = availability[day]?.find(u => u._id === assignment.userId || u.username === assignment.user);
                            
                            if (!user) {
                                // Si no se encuentra, buscar por originalId (para usuarios duplicados)
                                user = availability[day]?.find(u => u.originalId === assignment.userId);
                                
                                // Si hay múltiples coincidencias (mañana y tarde), elegir la correcta según el worksite
                                if (user) {
                                    const allMatches = availability[day]?.filter(u => u.originalId === assignment.userId);
                                    if (allMatches && allMatches.length > 1) {
                                        // Elegir según el worksite
                                        if (workSite.includes('Matutino')) {
                                            user = allMatches.find(u => u.shift === 'Mañana') || user;
                                        } else if (workSite.includes('Vespertino') || workSite.includes('Largo')) {
                                            user = allMatches.find(u => u.shift === 'Tarde') || user;
                                        }
                                    }
                                }
                            }
                            
                            if (user) {
                                const option = document.createElement('option');
                                option.value = user._id;
                                
                                // Usar displayName si existe (para usuarios duplicados), sino usar el nombre original
                                option.textContent = user.displayName || assignment.user;
                                
                                option.setAttribute('data-username', assignment.username);
                                option.selected = true;
                                select.appendChild(option);
                            
                                select.classList.add('assigned');
                                
                                // Determinar el schedule basándose en el shift del usuario encontrado
                                let scheduleForDay = user.shift ? user.shift : user.workSchedule[day];
                                
                                // Aplicar clase de color basada en el horario de trabajo del usuario
                                if (scheduleForDay === 'Mañana') {
                                    select.classList.add('option-morning');
                                } else if (scheduleForDay === 'Tarde') {
                                    select.classList.add('option-afternoon');
                                } else if (scheduleForDay === 'Variable') {
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
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
        });

    // Función para restaurar el estado de Mortal Kombat
    async function restoreMortalCombatState(mortalCombatData, availability) {
        if (!mortalCombatData) return;

        const { globalMode, dailyModes } = mortalCombatData;

        // Importar las funciones necesarias de weekly-schedule-utils
        const { setMortalCombatMode, setDailyMortalCombatMode } = await import('./weekly-schedule-utils.js');

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

    initializeFloatingTable();

});
