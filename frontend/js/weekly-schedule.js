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
        updateWeekDates(apiUrl, availability);
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
        showSpinner();
        try {
            const isValid = await validateAllDays();
            if (!isValid) {
                hideSpinner();
                return;
            }
    
            const allLongDaysCounts = [];
    
            // Iterar 200 veces
            for (let i = 0; i < 200; i++) {
                // Crear una array de promesas para ejecutar handleRandomizeButtonClick simultáneamente para todos los días
                const promises = dayIndices.map(dayIndex =>
                    handleRandomizeButtonClickForWeek(apiUrl, dayIndex, availability)
                );
                // Esperar a que todas las promesas se resuelvan
                await Promise.all(promises);
    
                // Contar los días largos después de cada iteración
                const longDaysCount = countLongDays();
                // console.log(`Resultado de la iteración ${i + 1}:`, longDaysCount);
                allLongDaysCounts.push(longDaysCount);
            }
    
            // Seleccionar la configuración con menor número de usuarios con dos días largos
            const bestConfiguration = selectBestConfiguration(allLongDaysCounts);
            // console.log('Best configuration selected:', bestConfiguration);
    
            // Aplicar la mejor configuración
            applyBestConfiguration(bestConfiguration);
    
            // Actualizar los colores de fondo y comparar disponibilidades una vez
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
        select.setAttribute('data-original-value', select.value); // Inicializar el valor original
        select.addEventListener('change', (event) => handleSelectChange(event, availability)); // Pasar event y availability
    });
});
