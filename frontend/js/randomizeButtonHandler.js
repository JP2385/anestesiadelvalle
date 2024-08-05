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
import { updateSelectColors } from './updateSelectColors.js';

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

    const assignments = [];

    for (let i = 1; i <= 20; i++) {
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
    }

    const { bestAssignments } = findBestIterationFromMemory(assignments);
    await applyBestAssignmentsToDOM(dayIndex, bestAssignments);

    // Verificar el conteo de asignaciones después de aplicar las mejores asignaciones
    const { counts: finalCounts } = await countAssignmentsByDay();
    const finalAssignmentCount = Object.values(finalCounts)[dayIndex];
    console.log(`Final assignment count for day index ${dayIndex}: ${finalAssignmentCount}`);

    compareAvailabilitiesForEachDay(dayIndex);
    clearLocalStorageForDay(dayIndex); // Limpia el localStorage al final de la ejecución

    // Actualizar los colores de los select
    updateSelectColors(dayIndex, availability);
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
    for (let i = 1; i <= 20; i++) {
        const storageKey = `assignments_${dayName}_iteration_${i}`;
        localStorage.removeItem(storageKey);
    }
}