// randomizeButtonHandlerForWeek.js

import { autoAssignCaroSandraGabiByDay } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitalsByDay } from './autoAssignHandlersPublicHospitals.js';
import { autoAssignMorningsByDay } from './autoAssignHandlersMornings.js';
import { autoAssignAfternoonsByDay } from './autoAssignHandlersAfternoons.js';
import { autoAssignLongDaysByDay } from './autoAssignHandlersLongDays.js';
import { autoAssignRemainingsByDay } from './autoAssignHandlersRemainings.js';
import { countEnabledSelectsByDay } from './autoAssignFunctions.js';

export async function handleRandomizeButtonClickForWeek(apiUrl, dayIndex, availability) {
    const enabledSelectsCount = countEnabledSelectsByDay();
    const maxAssignments = enabledSelectsCount.counts[dayIndex];

    // Capturar los selects del día una sola vez
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

    return { virtualState: bestVirtualState, daySelects, assignmentCount: bestCount };
}

function countVirtualAssignments(virtualState, daySelects) {
    let count = 0;
    for (const select of daySelects) {
        if (virtualState.get(select)) count++;
    }
    return count;
}
