import { fetchAvailability } from './assignUtils.js';
import { autoAssignCaroSandraGabiByDay } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitalsByDay } from './autoAssignHandlersPublicHospitals.js';
import { countAssignmentsByDay } from './autoAssignFunctions.js';
import { compareAvailabilities } from './compareArrays.js';
import { autoAssignReportBgColorsUpdate } from './autoAssignReportBgColorsUpdate.js';
import { updateSelectColors } from './updateSelectColors.js';
import { updateWeekDates, populateSelectOptions, initializeLockButtons, handleSelectChange, handleAutoAssignForWeek } from './weekly-schedule-utils.js';
import { initializeFloatingTable } from './floatingTable.js';

document.addEventListener('DOMContentLoaded', async function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    let availability;
    try {
        showSpinner();
        availability = await fetchAvailability(apiUrl);
        await updateWeekDates(apiUrl, availability);
        await populateSelectOptions(availability);
        initializeLockButtons();  
    } finally {
        hideSpinner();
    }

    const dayIndices = [0, 1, 2, 3, 4]; // Índices para lunes a viernes
    for (const dayIndex of dayIndices) {
        try {
            showSpinner();
            await autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability);
            await autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability);
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
