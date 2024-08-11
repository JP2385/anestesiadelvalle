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
import { updateSelectColors } from './updateSelectColors.js';
import { countEnabledSelectsByDay } from './autoAssignFunctions.js'

export async function handleRandomizeButtonClick(apiUrl, availability, dayIndex) {

    // Validar antes de iterar
    const isValid = await validateAssignmentForDay(dayIndex);
    if (!isValid) {
        console.log(`Validation failed for day index: ${dayIndex}`);
        return;
    }

    const assignments = [];
    const { counts: enabledSelectsCount } = countEnabledSelectsByDay();
    const maxAssignments = enabledSelectsCount[dayIndex];

    let reachedMaxIterations = false;

    for (let i = 1; i <= 100; i++) {
        unassignUsersByDay(dayIndex);
        await autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability);
        await autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability);
        await autoAssignMorningsByDay(apiUrl, dayIndex, availability);
        await autoAssignAfternoonsByDay(apiUrl, dayIndex, availability);
        await autoAssignLongDaysByDay(apiUrl, dayIndex, availability);
        await autoAssignRemainingsByDay(apiUrl, dayIndex, availability);

        const { counts } = await countAssignmentsByDay();
        const assignmentCount = Object.values(counts)[dayIndex];
        assignments.push({ iteration: i, data: collectAssignmentsData(dayIndex), assignmentCount });

        if (assignmentCount >= maxAssignments) {
            break;
        }
        if (i === 100) {
            reachedMaxIterations = true;
        }
    }

    if (reachedMaxIterations) {
        console.log(`Reached max iterations for day index ${dayIndex}.`);
    }

    const bestAssignment = assignments.reduce((max, assignment) => 
        assignment.assignmentCount > max.assignmentCount ? assignment : max, 
        { assignmentCount: -1 }
    );

    const { bestAssignments } = findBestIterationFromMemory(assignments);
    await applyBestAssignmentsToDOM(dayIndex, bestAssignments);

    compareAvailabilitiesForEachDay(dayIndex);
    clearLocalStorageForDay(dayIndex); // Limpia el localStorage al final de la ejecución

    // Actualizar los colores de los select
    updateSelectColors(dayIndex, availability);

    return bestAssignment;
}

function collectAssignmentsData(dayIndex) {
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

    return assignments;
}

function findBestIterationFromMemory(assignments) {
    let maxAssignments = 0;
    let bestAssignments = [];

    assignments.forEach(({ data, assignmentCount }) => {
        if (assignmentCount >= maxAssignments) {
            maxAssignments = assignmentCount;
            bestAssignments = data;
        }
    });

    return { bestAssignments };
}

function applyBestAssignmentsToDOM(dayIndex, bestAssignments) {
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
    for (let i = 1; i <= 100; i++) {
        const storageKey = `assignments_${dayName}_iteration_${i}`;
        localStorage.removeItem(storageKey);
    }
}
