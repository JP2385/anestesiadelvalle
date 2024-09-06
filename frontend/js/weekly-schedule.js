import { handleRandomizeButtonClickForWeek } from './randomizeButtonHandlerForWeek.js';
import { fetchAvailability } from './assignUtils.js';
import { autoAssignCaroSandraGabiByDay } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitalsByDay } from './autoAssignHandlersPublicHospitals.js';
import { countAssignmentsByDay } from './autoAssignFunctions.js';
import { compareAvailabilities } from './compareArrays.js';
import { validateAllDays } from './autoAssignValidation.js';
import { autoAssignReportBgColorsUpdate } from './autoAssignReportBgColorsUpdate.js';
import { compareAvailabilitiesForEachDay } from './compareArrays.js';
import { updateSelectColors } from './updateSelectColors.js';
import { countLongDays, selectBestConfiguration, applyBestConfiguration } from './bestConfigurationForWeek.js';
import { updateWeekDates, populateSelectOptions, initializeLockButtons, handleSelectChange } from './weekly-schedule-utils.js';

document.addEventListener('DOMContentLoaded', async function() {

    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    let availability;
    try {
        showSpinner();
        availability = await fetchAvailability(apiUrl);
        await updateWeekDates(apiUrl, availability);
        await populateSelectOptions(availability);
        await initializeLockButtons();
        
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
            await autoAssignReportBgColorsUpdate(dayIndex);
            await updateSelectColors(dayIndex, availability);

        } finally {
            hideSpinner();
        }
    }

    await compareAvailabilities();

    const autoAssignButton = document.getElementById('autoAssign-button');

    autoAssignButton.addEventListener('click', async () => {
        showSpinner();
        try {
            const isValid = await validateAllDays();
            if (!isValid) {
                hideSpinner();
                return;
            }

            const allLongDaysCounts = [];

            for (let i = 0; i < 200; i++) {
                const promises = dayIndices.map(dayIndex =>
                    handleRandomizeButtonClickForWeek(apiUrl, dayIndex, availability)
                );
                await Promise.all(promises);
                const longDaysCount = countLongDays();
                allLongDaysCounts.push(longDaysCount);
                console.log(`weekly-schedule.js: Iteration ${i + 1} completed, longDaysCount:`, longDaysCount);
            }

           
            const bestConfiguration = selectBestConfiguration(allLongDaysCounts);
            applyBestConfiguration(bestConfiguration);

            dayIndices.forEach(dayIndex => {
                autoAssignReportBgColorsUpdate(dayIndex);
                compareAvailabilitiesForEachDay(dayIndex);
                updateSelectColors(dayIndex, availability);
            });
    
        } finally {
            hideSpinner();
        }
    });

    document.querySelectorAll('select').forEach(select => {
        select.classList.add('default');
        select.setAttribute('data-original-value', select.value);
        select.addEventListener('change', (event) => handleSelectChange(event, availability));
    });

    const weeklyScheduleCompletedEvent = new CustomEvent('weeklyScheduleCompleted');
    console.log('Evento weeklyScheduleCompleted disparado'); // Este console.log se ejecuta antes de disparar el evento
    document.dispatchEvent(weeklyScheduleCompletedEvent);
    
});
