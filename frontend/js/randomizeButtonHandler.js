import { autoAssignCaroSandraGabiByDay } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitalsByDay } from './autoAssignHandlersPublicHospitals.js';
import { autoAssignMorningsByDay } from './autoAssignHandlersMornings.js';
import { autoAssignAfternoonsByDay } from './autoAssignHandlersAfternoons.js';
import { autoAssignLongDaysByDay } from './autoAssignHandlersLongDays.js';
import { autoAssignRemainingsByDay } from './autoAssignHandlersRemainings.js';
import { countAssignmentsByDay, displayUnassignedUsers } from './autoAssignFunctions.js';
import { compareAvailabilitiesForEachDay } from './compareArrays.js';
import { validateAssignmentForDay } from './autoAssignValidation.js';
import { updateSelectColors } from './updateSelectColors.js';
import { countEnabledSelectsByDay } from './autoAssignFunctions.js';

export async function handleRandomizeButtonClick(apiUrl, availability, dayIndex) {

    // Validar antes de iterar
    const isValid = await validateAssignmentForDay(dayIndex);
    if (!isValid) {
        console.log(`Validation failed for day index: ${dayIndex}`);
        return;
    }

    const { counts: enabledSelectsCount } = countEnabledSelectsByDay();
    const maxAssignments = enabledSelectsCount[dayIndex];

    // Obtener los selects del día una sola vez
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'];
    const dayHeader = document.getElementById(dayHeaders[dayIndex]);
    const dayColumnIndex = Array.from(dayHeader.parentElement.children).indexOf(dayHeader);
    const daySelects = Array.from(document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`));

    let bestVirtualState = null;
    let bestCount = -1;

    for (let i = 1; i <= 100; i++) {
        const virtualState = new Map();

        const assignedUsers = new Set();
        await autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability, assignedUsers, virtualState);
        await autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability, assignedUsers, virtualState);
        await autoAssignMorningsByDay(apiUrl, dayIndex, availability, assignedUsers, virtualState);
        await autoAssignAfternoonsByDay(apiUrl, dayIndex, availability, assignedUsers, virtualState);
        await autoAssignLongDaysByDay(apiUrl, dayIndex, availability, assignedUsers, virtualState);
        await autoAssignRemainingsByDay(apiUrl, dayIndex, availability, assignedUsers, virtualState);

        const assignmentCount = countVirtualAssignments(virtualState, daySelects);

        if (assignmentCount > bestCount) {
            bestCount = assignmentCount;
            bestVirtualState = new Map(virtualState);
        }

        if (bestCount >= maxAssignments) break;
    }

    // Aplicar la mejor configuración al DOM una sola vez
    applyVirtualStateToDom(bestVirtualState, daySelects);

    await countAssignmentsByDay();
    await displayUnassignedUsers(availability);
    await compareAvailabilitiesForEachDay(dayIndex);
    updateSelectColors(dayIndex, availability);
}

function countVirtualAssignments(virtualState, daySelects) {
    let count = 0;
    for (const select of daySelects) {
        if (virtualState.get(select)) count++;
    }
    return count;
}

function applyVirtualStateToDom(virtualState, daySelects) {
    for (const select of daySelects) {
        const value = virtualState ? (virtualState.get(select) ?? '') : '';
        if (select.value !== value) select.value = value;
    }
}
