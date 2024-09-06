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
    console.log('weekly-schedule.js: DOMContentLoaded - Inicio');

    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    let availability;
    try {
        showSpinner();
        console.log('weekly-schedule.js: Fetching availability...');
        availability = await fetchAvailability(apiUrl);
        console.log('weekly-schedule.js: Availability fetched:', availability);

        console.log('weekly-schedule.js: Updating week dates...');
        await updateWeekDates(apiUrl, availability);
        console.log('weekly-schedule.js: Week dates updated.');

        console.log('weekly-schedule.js: Populating select options...');
        await populateSelectOptions(availability);
        console.log('weekly-schedule.js: Select options populated.');

        console.log('weekly-schedule.js: Initializing lock buttons...');
        initializeLockButtons();
        console.log('weekly-schedule.js: Lock buttons initialized.');
        
    } finally {
        hideSpinner();
    }

    const dayIndices = [0, 1, 2, 3, 4]; // Índices para lunes a viernes
    for (const dayIndex of dayIndices) {
        try {
            showSpinner();
            console.log(`weekly-schedule.js: Auto-assigning CaroSandraGabi for dayIndex ${dayIndex}...`);
            await autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability);
            console.log(`weekly-schedule.js: Auto-assigned CaroSandraGabi for dayIndex ${dayIndex}.`);

            console.log(`weekly-schedule.js: Auto-assigning public hospitals for dayIndex ${dayIndex}...`);
            await autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability);
            console.log(`weekly-schedule.js: Auto-assigned public hospitals for dayIndex ${dayIndex}.`);

            console.log(`weekly-schedule.js: Counting assignments for dayIndex ${dayIndex}...`);
            await countAssignmentsByDay(dayIndex);
            console.log(`weekly-schedule.js: Assignments counted for dayIndex ${dayIndex}.`);

            console.log(`weekly-schedule.js: Updating background colors for dayIndex ${dayIndex}...`);
            autoAssignReportBgColorsUpdate(dayIndex);
            console.log(`weekly-schedule.js: Background colors updated for dayIndex ${dayIndex}.`);

            console.log(`weekly-schedule.js: Updating select colors for dayIndex ${dayIndex}...`);
            updateSelectColors(dayIndex, availability);
            console.log(`weekly-schedule.js: Select colors updated for dayIndex ${dayIndex}.`);

        } finally {
            hideSpinner();
        }
    }

    console.log('weekly-schedule.js: Comparing availabilities...');
    await compareAvailabilities();
    console.log('weekly-schedule.js: Availabilities compared.');

    const autoAssignButton = document.getElementById('autoAssign-button');

    autoAssignButton.addEventListener('click', async () => {
        showSpinner();
        try {
            console.log('weekly-schedule.js: Validating all days...');
            const isValid = await validateAllDays();
            if (!isValid) {
                console.log('weekly-schedule.js: Validation failed.');
                hideSpinner();
                return;
            }
            console.log('weekly-schedule.js: Validation successful.');

            const allLongDaysCounts = [];

            console.log('weekly-schedule.js: Running randomization iterations...');
            for (let i = 0; i < 200; i++) {
                const promises = dayIndices.map(dayIndex =>
                    handleRandomizeButtonClickForWeek(apiUrl, dayIndex, availability)
                );
                await Promise.all(promises);
                const longDaysCount = countLongDays();
                allLongDaysCounts.push(longDaysCount);
                console.log(`weekly-schedule.js: Iteration ${i + 1} completed, longDaysCount:`, longDaysCount);
            }

            console.log('weekly-schedule.js: Selecting best configuration...');
            const bestConfiguration = selectBestConfiguration(allLongDaysCounts);
            console.log('weekly-schedule.js: Best configuration selected:', bestConfiguration);

            console.log('weekly-schedule.js: Applying best configuration...');
            applyBestConfiguration(bestConfiguration);
            console.log('weekly-schedule.js: Best configuration applied.');

            dayIndices.forEach(dayIndex => {
                console.log(`weekly-schedule.js: Updating report background colors and comparing availabilities for dayIndex ${dayIndex}...`);
                autoAssignReportBgColorsUpdate(dayIndex);
                compareAvailabilitiesForEachDay(dayIndex);
                updateSelectColors(dayIndex, availability);
                console.log(`weekly-schedule.js: Updates completed for dayIndex ${dayIndex}.`);
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

    console.log('weekly-schedule.js: Dispatching weeklyScheduleCompleted event...');
    const weeklyScheduleCompletedEvent = new CustomEvent('weeklyScheduleCompleted');
    document.dispatchEvent(weeklyScheduleCompletedEvent);
    console.log('weekly-schedule.js: weeklyScheduleCompleted event dispatched.');
});
