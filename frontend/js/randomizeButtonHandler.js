// randomizeButtonHandler.js

import { unassignUsersByDay } from './autoAssignDayFunctions.js';
import { autoAssignCaroSandraGabiByDay } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitalsByDay } from './autoAssignHandlersPublicHospitals.js';
import { autoAssignMorningsByDay } from './autoAssignHandlersMornings.js';
import { autoAssignAfternoonsByDay } from './autoAssignHandlersAfternoons.js';
import { autoAssignLongDaysByDay } from './autoAssignHandlersLongDays.js';
import { autoAssignRemainingsByDay } from './autoAssignHandlersRemainings.js';
import { countAssignmentsByDay } from './autoAssignFunctions.js';
import { compareAvailabilitiesForEachDay } from './compareArrays.js';
import { validateAssignmentForDay } from './autoAssignValidation.js';

export async function handleRandomizeButtonClick(apiUrl, dayIndex) {
        // Validar antes de iterar
        const isValid = await validateAssignmentForDay(dayIndex);
        if (!isValid) return;

    for (let i = 0; i < 7; i++) {
        unassignUsersByDay(dayIndex);
        await autoAssignCaroSandraGabiByDay(apiUrl, dayIndex);
        await autoAssignPublicHospitalsByDay(apiUrl, dayIndex);
        await autoAssignMorningsByDay(apiUrl, dayIndex);
        await autoAssignAfternoonsByDay(apiUrl, dayIndex);
        await autoAssignLongDaysByDay(apiUrl, dayIndex);
        await autoAssignRemainingsByDay(apiUrl, dayIndex);
        const { counts } = await countAssignmentsByDay();
        const assignmentCount = Object.values(counts)[dayIndex];
        collectAssignmentsForDay(dayIndex, i + 1, assignmentCount);
    }

    applyBestAssignments(dayIndex);
    compareAvailabilitiesForEachDay(dayIndex);
    clearLocalStorageForDay(dayIndex); // Limpia el localStorage al final de la ejecución
}

function collectAssignmentsForDay(dayIndex, iteration, assignmentCount) {
    const assignments = [];
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (workSiteElement) {
            const workSite = workSiteElement.textContent.trim();
            const select = row.querySelectorAll('select')[dayIndex];
            const selectedUser = select.options[select.selectedIndex].text;

            if (selectedUser !== "") {
                assignments.push({
                    workSite: workSite,
                    user: selectedUser
                });
            }
        }
    }

    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const storageKey = `assignments_${dayNames[dayIndex]}_iteration_${iteration}`;
    const dataToStore = {
        assignments: assignments,
        assignmentCount: assignmentCount
    };

    localStorage.setItem(storageKey, JSON.stringify(dataToStore));
}

function findBestIteration(dayIndex) {
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayName = dayNames[dayIndex];
    let maxAssignments = 0;
    let bestIteration = 0;
    let bestAssignments = [];

    for (let i = 1; i <= 7; i++) {
        const storageKey = `assignments_${dayName}_iteration_${i}`;
        const storedData = JSON.parse(localStorage.getItem(storageKey));

        if (storedData && storedData.assignmentCount >= maxAssignments) {
            maxAssignments = storedData.assignmentCount;
            bestIteration = i;
            bestAssignments = storedData.assignments;
        }
    }

    return { bestIteration, bestAssignments };
    autoAssignReportBgColorsUpdate(dayIndex);
}

function applyBestAssignments(dayIndex) {
    const { bestIteration, bestAssignments } = findBestIteration(dayIndex);
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    bestAssignments.forEach(assignment => {
        for (let row of rows) {
            const workSiteElement = row.querySelector('.work-site');
            if (workSiteElement && workSiteElement.textContent.trim() === assignment.workSite) {
                const select = row.querySelectorAll('select')[dayIndex];
                for (let option of select.options) {
                    if (option.text === assignment.user) {
                        select.value = option.value;
                        break;
                    }
                }
            }
        }
    });
}

function clearLocalStorageForDay(dayIndex) {
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayName = dayNames[dayIndex];
    for (let i = 1; i <= 7; i++) {
        const storageKey = `assignments_${dayName}_iteration_${i}`;
        localStorage.removeItem(storageKey);
    }
}
