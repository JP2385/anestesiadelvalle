/**
 * Función para cargar el cronograma guardado de la semana actual
 * Compatible con la NUEVA estructura optimizada de Schedule
 * Retorna true si se cargó un cronograma, false si no existe
 */

export async function loadSavedSchedule(apiUrl, availability) {
    try {
        const response = await fetch(`${apiUrl}/schedule/last-schedule`);

        if (!response.ok) {
            return false;
        }

        const result = await response.json();

        if (!result.success || !result.schedule) {
            return false;
        }

        const schedule = result.schedule;

        if (!schedule.assignments) {
            return false;
        }

        // IMPORTANTE: Restaurar estado de Mortal Kombat ANTES de poblar selects
        if (schedule.mortalCombat) {
            await restoreMortalCombatState(schedule.mortalCombat, availability);
        }

        // Restaurar longDaysInform
        if (schedule.longDaysInform) {
            restoreLongDaysInform(schedule.longDaysInform);
        }

        // Restaurar las asignaciones en los selects
        await restoreAssignments(schedule.assignments, availability);

        // Actualizar el informe de asignaciones por día y no asignados
        await updateAssignmentCounts(availability);

        return true;

    } catch (error) {
        console.error('Error cargando cronograma:', error);
        return false;
    }
}

/**
 * Restaura las asignaciones en los selects del DOM
 * Convierte del formato optimizado {workSiteId, userId, regime} al DOM
 * IMPORTANTE: Deshabilita los selects que NO están en el cronograma guardado
 */
async function restoreAssignments(assignments, availability) {
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    // Crear un mapa de assignments por workSiteId y día
    const assignmentMap = createAssignmentMap(assignments);

    // Paso 1: Deshabilitar TODOS los selects primero
    for (let row of rows) {
        if (row.querySelector('.separator-thin, .separator-thick, .separator-institution')) {
            continue;
        }

        const selects = row.querySelectorAll('select');
        selects.forEach(select => {
            select.disabled = true;
            select.classList.add('disabled-worksite');
        });
    }

    // Paso 2: Restaurar y habilitar solo los selects que están en el cronograma guardado
    for (let row of rows) {
        // Saltar separadores
        if (row.querySelector('.separator-thin, .separator-thick, .separator-institution')) {
            continue;
        }

        const workSiteElement = row.querySelector('.work-site');
        if (!workSiteElement) continue;

        const selects = row.querySelectorAll('select');

        selects.forEach((select, index) => {
            const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index];

            // Buscar el workSiteId y regime correspondientes a este select
            const workSiteId = select.getAttribute('data-worksite-id');
            const regime = select.getAttribute('data-regime');

            if (!workSiteId || !regime) {
                return;
            }

            // Buscar la asignación para este workSite, día Y régimen
            const assignment = assignmentMap.get(`${workSiteId}_${day}_${regime}`);

            if (assignment) {
                // Habilitar este select porque está en el cronograma guardado
                select.disabled = false;
                select.classList.remove('disabled-worksite');

                // Si userId es null, significa que el select estaba enabled pero vacío
                if (!assignment.userId) {
                    return;
                }

                // Buscar el usuario en availability para obtener sus datos
                const user = availability[day]?.find(u => u._id === assignment.userId._id);

                if (user) {
                    // Crear y agregar la opción al select
                    const option = document.createElement('option');
                    option.value = user._id;
                    option.textContent = user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.username;
                    option.setAttribute('data-username', user.username);
                    option.selected = true;

                    select.appendChild(option);
                    select.classList.remove('default');
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
            }
        });
    }
}

/**
 * Crea un mapa de assignments para búsqueda rápida
 * Key: "workSiteId_day_regime", Value: assignment object
 */
function createAssignmentMap(assignments) {
    const map = new Map();

    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
        if (assignments[day]) {
            assignments[day].forEach(assignment => {
                const key = `${assignment.workSiteId._id}_${day}_${assignment.regime}`;
                map.set(key, assignment);
            });
        }
    });

    return map;
}

/**
 * Función para restaurar el estado de Mortal Kombat
 */
async function restoreMortalCombatState(mortalCombatData, availability) {
    if (!mortalCombatData) return;

    const { globalMode, dailyModes } = mortalCombatData;

    // Importar las funciones necesarias de weekly-schedule-utils
    const { setMortalCombatMode, setDailyMortalCombatMode, populateSelectOptions } = await import('./weekly-schedule-utils.js');

    // Restaurar modo global
    if (globalMode) {
        setMortalCombatMode(true);
        updateMortalCombatButtonUI(true);
    }

    // Restaurar modos diarios
    if (dailyModes) {
        Object.keys(dailyModes).forEach(day => {
            if (dailyModes[day]) {
                setDailyMortalCombatMode(day, true);
            }
        });
    }

    // Re-popular las opciones con el estado de Mortal Kombat correcto
    await populateSelectOptions(availability);
}

/**
 * Función para actualizar la UI del botón de Mortal Kombat
 */
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

/**
 * Restaura el contenido de longDaysInform en el DOM
 */
function restoreLongDaysInform(longDaysInform) {
    const longDaysSpan = document.getElementById('long-days-inform');
    if (!longDaysSpan) return;

    // Dividir la cadena longDaysInform en base al "-" para separar las líneas
    const items = longDaysInform.split('-').map(item => item.trim()).filter(item => item.length > 0);

    // Crear un nuevo elemento <ul>
    const ul = document.createElement('ul');

    // Recorrer los elementos separados por "-"
    items.forEach(item => {
        // Crear un nuevo <li> para cada elemento
        const li = document.createElement('li');
        li.textContent = `- ${item.trim()}`;
        ul.appendChild(li);
    });

    // Limpiar el contenido anterior y añadir la nueva lista <ul> al elemento longDaysSpan
    longDaysSpan.innerHTML = '';
    longDaysSpan.appendChild(ul);
}

/**
 * Actualiza los contadores de asignaciones por día y lista de no asignados
 * Llama a countAssignmentsByDay y displayUnassignedUsers desde autoAssignFunctions
 * También actualiza los estilos de las celdas cuando lugares > anestesiólogos
 */
async function updateAssignmentCounts(availability) {
    try {
        // Importar dinámicamente las funciones de conteo
        const { countAssignmentsByDay, displayUnassignedUsers } = await import('./autoAssignFunctions.js');
        const { autoAssignReportBgColorsUpdate } = await import('./autoAssignReportBgColorsUpdate.js');

        // Ejecutar el conteo que actualiza los spans en el DOM
        await countAssignmentsByDay();

        // Mostrar lista de no asignados si tenemos availability
        if (availability) {
            await displayUnassignedUsers(availability);
        }

        // Actualizar estilos dinámicos de las celdas para cada día
        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
            autoAssignReportBgColorsUpdate(dayIndex);
        }
    } catch (error) {
        console.error('Error actualizando contadores:', error);
    }
}
