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
    console.log(`Handling randomize button click for day index: ${dayIndex}`);
    console.log('Availability:', availability);

    const assignments = [];
    const enabledSelectsCount = countEnabledSelectsByDay();
    const maxAssignments = enabledSelectsCount.counts[dayIndex];
    console.log(`Max assignments for day index ${dayIndex}: ${maxAssignments}`);

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
        assignments.push({ iteration: i + 1, data: collectAssignmentsData(dayIndex), assignmentCount });

        if (assignmentCount >= maxAssignments) {
            console.log(`All available work sites filled for day index ${dayIndex} after ${i} iterations.`);
            break;
        }
        if (i === 100) {
            reachedMaxIterations = true;
        }
    }

    if (reachedMaxIterations) {
        console.log(`Reached the maximum number of iterations (100) for day index ${dayIndex}.`);
    }

    return assignments;
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
