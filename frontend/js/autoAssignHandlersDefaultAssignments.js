import { getWeekNumber } from './assignUtils.js';
import { updateSelectBackgroundColors } from './assignUtils.js';

/**
 * Auto-asigna usuarios según sus asignaciones por defecto configuradas
 * Esta función se ejecuta ANTES de las demás auto-asignaciones
 * @param {number} dayIndex - Índice del día (0=lunes, 1=martes, etc.)
 * @param {Object} availability - Objeto con disponibilidad por día
 * @param {Set} assignedUsers - Set de usuarios ya asignados
 */
export async function autoAssignDefaultAssignmentsByDay(dayIndex, availability, assignedUsers) {
    try {
        const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const dayKey = dayKeys[dayIndex];

        if (!availability[dayKey]) {
            console.warn(`No availability data for ${dayKey}`);
            return;
        }

        const workSiteElements = document.querySelectorAll('.work-site');
        const currentWeekNumber = getWeekNumber(new Date());
        const isOddWeek = currentWeekNumber % 2 !== 0;

        // Obtener usuarios con asignaciones por defecto
        const usersWithDefaults = availability[dayKey].filter(user => {
            return user.defaultAssignments &&
                   user.defaultAssignments.oddWeeks &&
                   user.defaultAssignments.evenWeeks;
        });

        if (usersWithDefaults.length === 0) {
            console.log('No users with default assignments found');
            return;
        }

        console.log(`Processing ${usersWithDefaults.length} users with default assignments for ${dayKey}`);

        // Procesar cada usuario con asignaciones por defecto
        for (const user of usersWithDefaults) {
            // Si el usuario ya fue asignado, saltar
            if (assignedUsers.has(user._id) || assignedUsers.has(user.username)) {
                console.log(`User ${user.username} already assigned, skipping default assignments`);
                continue;
            }

            // Determinar qué semana usar (siempre alternamos entre pares/impares)
            const weekData = isOddWeek ? user.defaultAssignments.oddWeeks : user.defaultAssignments.evenWeeks;

            // Obtener asignaciones para este día
            const dayAssignments = weekData[dayKey];

            if (!dayAssignments || dayAssignments.length === 0) {
                continue;
            }

            // Intentar asignar cada lugar configurado
            for (const assignment of dayAssignments) {
                const success = assignUserToWorkSite(
                    user,
                    assignment.workSiteId,
                    assignment.regime,
                    dayIndex,
                    workSiteElements
                );

                if (success) {
                    console.log(`✓ Assigned ${user.username} to default worksite for ${dayKey}`);
                    // Marcar usuario como asignado
                    assignedUsers.add(user._id);
                    assignedUsers.add(user.username);
                    // Solo una asignación por usuario por día
                    break;
                }
            }
        }

    } catch (error) {
        console.error('Error in autoAssignDefaultAssignmentsByDay:', error);
    }
}

/**
 * Asigna un usuario específico a un sitio de trabajo
 * @param {Object} user - Usuario a asignar
 * @param {string} workSiteId - ID del sitio de trabajo
 * @param {string} regime - Régimen (matutino/vespertino/largo)
 * @param {number} dayIndex - Índice del día
 * @param {NodeList} workSiteElements - Elementos de sitios de trabajo
 * @returns {boolean} true si se asignó exitosamente
 */
function assignUserToWorkSite(user, workSiteId, regime, dayIndex, workSiteElements) {
    try {
        const dayColumnIndex = dayIndex + 2; // +2 porque la primera columna es el nombre del sitio

        // Buscar el elemento del sitio de trabajo por su ID
        for (const workSiteEl of workSiteElements) {
            const tr = workSiteEl.closest('tr');
            if (!tr) continue;

            const selectCell = tr.querySelector(`td:nth-child(${dayColumnIndex})`);
            if (!selectCell) continue;

            const select = selectCell.querySelector('select');
            if (!select || select.disabled || select.value) {
                // Select deshabilitado o ya tiene valor
                continue;
            }

            // Verificar que este select corresponda al workSiteId y régimen correcto
            const selectWorkSiteId = select.getAttribute('data-worksite-id');
            const selectRegime = select.getAttribute('data-regime');

            if (selectWorkSiteId !== workSiteId._id && selectWorkSiteId !== workSiteId) {
                continue;
            }

            if (selectRegime !== regime) {
                continue;
            }

            // Buscar la opción del usuario en el select
            const userOption = Array.from(select.options).find(option => {
                return option.value === user._id || option.getAttribute('data-username') === user.username;
            });

            if (userOption) {
                // Asignar usuario
                select.value = userOption.value;
                select.classList.add('assigned');
                select.classList.remove('default');

                // Actualizar colores
                updateSelectBackgroundColors(select, dayIndex);

                // Disparar evento change para actualizar contadores
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);

                return true;
            }
        }

        return false;

    } catch (error) {
        console.error('Error in assignUserToWorkSite:', error);
        return false;
    }
}
