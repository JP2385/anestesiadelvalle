// randomizeButtonHandlerForWeek.js

import { unassignUsersByDay } from './autoAssignDayFunctions.js';
import { autoAssignCaroSandraGabiByDay } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitalsByDay } from './autoAssignHandlersPublicHospitals.js';
import { autoAssignMorningsByDay } from './autoAssignHandlersMornings.js';
import { autoAssignAfternoonsByDay } from './autoAssignHandlersAfternoons.js';
import { autoAssignLongDaysByDay } from './autoAssignHandlersLongDays.js';
import { autoAssignRemainingsByDay } from './autoAssignHandlersRemainings.js';
import { countAssignmentsByDay } from './autoAssignFunctions.js';
import { countEnabledSelectsByDay } from './autoAssignFunctions.js';

export async function handleRandomizeButtonClickForWeek(apiUrl, dayIndex, availability) {
    const assignments = [];
    const enabledSelectsCount = countEnabledSelectsByDay();
    const maxAssignments = enabledSelectsCount.counts[dayIndex];

    // Capturamos el DOM una vez
    const scheduleBody = document.getElementById('schedule-body');
    const allRows = Array.from(scheduleBody.getElementsByTagName('tr'));

    let reachedMaxIterations = false;

    for (let i = 1; i <= 100; i++) {
        unassignUsersByDay(dayIndex);
        const assignedUsers = new Set();

        await autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability, assignedUsers);
        await autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability, assignedUsers);
        await autoAssignMorningsByDay(apiUrl, dayIndex, availability, assignedUsers);
        await autoAssignAfternoonsByDay(apiUrl, dayIndex, availability, assignedUsers);
        await autoAssignLongDaysByDay(apiUrl, dayIndex, availability, assignedUsers);
        await autoAssignRemainingsByDay(apiUrl, dayIndex, availability, assignedUsers);

        const { counts } = await countAssignmentsByDay();
        const assignmentCount = Object.values(counts)[dayIndex];

        assignments.push({
            iteration: i + 1,
            data: collectAssignmentsData(allRows, dayIndex),
            assignmentCount
        });

        if (assignmentCount >= maxAssignments) break;
        if (i === 100) reachedMaxIterations = true;
    }

    const bestAssignment = assignments.reduce((max, assignment) =>
        assignment.assignmentCount > max.assignmentCount ? assignment : max,
        { assignmentCount: -1 }
    );

    return bestAssignment;
}


function collectAssignmentsData(rows, dayIndex) {
    return rows.map(row => {
        const workSiteElement = row.querySelector('.work-site');
        if (!workSiteElement) return null;

        const workSite = workSiteElement.textContent.trim();
        const select = row.querySelectorAll('select')[dayIndex];
        const selectedUser = select?.options[select.selectedIndex]?.text;

        return selectedUser ? { workSite, user: selectedUser } : null;
    }).filter(Boolean);
}

