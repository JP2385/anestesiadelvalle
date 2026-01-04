import { fetchAvailability } from './assignUtils.js';
import { autoAssignCaroSandraGabiByDay } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitalsByDay } from './autoAssignHandlersPublicHospitals.js';
import { countAssignmentsByDay } from './autoAssignFunctions.js';
import { compareAvailabilities } from './compareArrays.js';
import { autoAssignReportBgColorsUpdate } from './autoAssignReportBgColorsUpdate.js';
import { updateSelectColors } from './updateSelectColors.js';
import { updateWeekDates, populateSelectOptions, initializeLockButtons, handleSelectChange, handleAutoAssignForWeek, initializeMortalCombatButton } from './weekly-schedule-utils.js';
import { initializeFloatingTable } from './floatingTable.js';
import { initializeScheduleTable } from './loadWorkSites.js';

document.addEventListener('DOMContentLoaded', async function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com';

    let availability;
    try {
        showSpinner();

        // PRIMERO: Cargar la tabla de sitios de trabajo desde la BD
        await initializeScheduleTable();

        // LUEGO: Continuar con la inicialización normal
        availability = await fetchAvailability(apiUrl);
        await updateWeekDates(apiUrl, availability);
        await populateSelectOptions(availability);
        initializeLockButtons();
        initializeMortalCombatButton(availability);
    } finally {
        hideSpinner();
    }

    const dayIndices = [0, 1, 2, 3, 4]; // Índices para lunes a viernes
    for (const dayIndex of dayIndices) {
        try {
            showSpinner();
            const assignedUsers = new Set();
            await autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability, assignedUsers);
            await autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability,assignedUsers);
            await countAssignmentsByDay(dayIndex);
            autoAssignReportBgColorsUpdate(dayIndex);
            updateSelectColors(dayIndex, availability);
        } finally {
            hideSpinner();
        }
    }

    await compareAvailabilities();
    

    const autoAssignButton = document.getElementById('autoAssign-button');
    autoAssignButton.addEventListener('click', async () => {
        await handleAutoAssignForWeek(apiUrl, dayIndices, availability); // Usar la función independiente
    });

    document.querySelectorAll('select').forEach(select => {
        select.classList.add('default');
        select.setAttribute('data-original-value', select.value);
        select.addEventListener('change', (event) => handleSelectChange(event, availability));
    });

    initializeFloatingTable();
});
