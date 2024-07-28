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

    // Obtener la disponibilidad una sola vez
    let availability;
    try {
        const response = await fetch(`${apiUrl}/availability`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            availability = await response.json();
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
            return;
        }
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
        return;
    }

    // Validar antes de iterar
    const isValid = await validateAssignmentForDay(dayIndex);
    if (!isValid) {
        return;
    }

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
        collectAssignmentsForDay(dayIndex, i + 1, assignmentCount);
    }

    await applyBestAssignments(dayIndex);

    // Verificar el conteo de asignaciones después de aplicar las mejores asignaciones
    const { counts: finalCounts } = await countAssignmentsByDay();
    const finalAssignmentCount = Object.values(finalCounts)[dayIndex];
    console.log(`Final assignment count for day index ${dayIndex}: ${finalAssignmentCount}`);

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

    for (let i = 1; i <= 100; i++) {
        const storageKey = `assignments_${dayName}_iteration_${i}`;
        const storedData = JSON.parse(localStorage.getItem(storageKey));

        if (storedData && storedData.assignmentCount >= maxAssignments) {
            maxAssignments = storedData.assignmentCount;
            bestIteration = i;
            bestAssignments = storedData.assignments;
        }
    }

    return { bestIteration, bestAssignments };
}

async function applyBestAssignments(dayIndex) {
    const {bestAssignments } = findBestIteration(dayIndex);
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
