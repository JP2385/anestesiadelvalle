import { fetchAvailability } from './assignUtils.js';
import { autoAssignDefaultAssignmentsByDay } from './autoAssignHandlersDefaultAssignments.js';
import { autoAssignCaroSandraGabiByDay } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitalsByDay } from './autoAssignHandlersPublicHospitals.js';
import { countAssignmentsByDay } from './autoAssignFunctions.js';
import { compareAvailabilities } from './compareArrays.js';
import { autoAssignReportBgColorsUpdate } from './autoAssignReportBgColorsUpdate.js';
import { updateSelectColors } from './updateSelectColors.js';
import { updateWeekDates, populateSelectOptions, initializeLockButtons, handleSelectChange, handleAutoAssignForWeek, initializeMortalCombatButton } from './weekly-schedule-utils.js';
import { initializeFloatingTable } from './floatingTable.js';
import { initializeScheduleTable } from './loadWorkSites.js';
import { loadSavedSchedule } from './loadSavedSchedule.js';
import { fetchHolidays, isHoliday } from './fetchHolidays.js';

document.addEventListener('DOMContentLoaded', async function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;

    let availability;
    try {
        showSpinner();

        // PRIMERO: Cargar la tabla de sitios de trabajo desde la BD
        await initializeScheduleTable();

        // SEGUNDO: Cargar feriados y deshabilitar selects en días feriados
        await fetchHolidays(apiUrl);
        disableHolidaySelects();

        // LUEGO: Continuar con la inicialización normal
        availability = await fetchAvailability(apiUrl);
        await updateWeekDates(apiUrl, availability);
        await populateSelectOptions(availability);
        initializeLockButtons();
        initializeMortalCombatButton(availability);
    } finally {
        hideSpinner();
    }

    /**
     * Deshabilita todos los selects de días que son feriados
     */
    function disableHolidaySelects() {
        // Calcular las fechas de lunes a viernes de la semana actual
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
        
        // Calcular el lunes de la semana actual
        let daysToMonday;
        if (dayOfWeek === 0) { // Domingo
            daysToMonday = -6;
        } else if (dayOfWeek === 6) { // Sábado
            daysToMonday = 2;
        } else { // Lunes a viernes
            daysToMonday = 1 - dayOfWeek;
        }
        
        const monday = new Date(now);
        monday.setDate(now.getDate() + daysToMonday);
        monday.setHours(0, 0, 0, 0);

        // Array de nombres de días para debug
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

        // Para cada día de lunes a viernes
        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + dayIndex);
            const dateString = currentDate.toISOString().slice(0, 10);

            // Verificar si es feriado
            if (isHoliday(dateString)) {
                console.log(`🎉 ${dayNames[dayIndex]} ${dateString} es feriado, deshabilitando selects`);

                // Deshabilitar todos los selects de ese día (columna dayIndex + 1)
                const scheduleBody = document.getElementById('schedule-body');
                const rows = scheduleBody?.getElementsByTagName('tr');

                if (rows) {
                    for (let row of rows) {
                        // Saltar filas separadoras
                        if (row.querySelector('.separator-thin, .separator-thick, .separator-institution')) {
                            continue;
                        }

                        const cells = row.querySelectorAll('td');
                        // La primera columna (index 0) es el nombre del worksite
                        // Las columnas 1-5 son lunes-viernes
                        const dayCell = cells[dayIndex + 1];
                        
                        if (dayCell) {
                            const select = dayCell.querySelector('select');
                            if (select) {
                                select.disabled = true;
                                select.classList.add('disabled-worksite');
                            }
                        }
                    }
                }
            }
        }
    }

    const dayIndices = [0, 1, 2, 3, 4]; // Índices para lunes a viernes

    // Configurar event listeners
    const autoAssignButton = document.getElementById('autoAssign-button');
    autoAssignButton.addEventListener('click', async () => {
        await handleAutoAssignForWeek(apiUrl, dayIndices, availability);
    });

    document.querySelectorAll('select').forEach(select => {
        select.classList.add('default');
        select.setAttribute('data-original-value', select.value);
        select.addEventListener('change', (event) => handleSelectChange(event, availability));
    });

    // INTENTAR CARGAR CRONOGRAMA GUARDADO
    const scheduleLoaded = await loadSavedSchedule(apiUrl, availability);

    // SOLO SI NO HAY CRONOGRAMA GUARDADO, ejecutar auto-asignación
    if (!scheduleLoaded) {
        console.log('No hay cronograma guardado, ejecutando auto-asignación inicial...');

        for (const dayIndex of dayIndices) {
            try {
                showSpinner();
                const assignedUsers = new Set();
                // 1. PRIMERO: Asignar usuarios con asignaciones por defecto (máxima prioridad)
                await autoAssignDefaultAssignmentsByDay(dayIndex, availability, assignedUsers);
                // 2. LUEGO: Asignaciones hardcodeadas (mantenidas temporalmente)
                await autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability, assignedUsers);
                // 3. FINALMENTE: Auto-asignación de hospitales públicos
                await autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability, assignedUsers);
                await countAssignmentsByDay(dayIndex);
                autoAssignReportBgColorsUpdate(dayIndex);
                updateSelectColors(dayIndex, availability);
            } finally {
                hideSpinner();
            }
        }

        await compareAvailabilities();
    } else {
        console.log('✓ Cronograma cargado desde base de datos');
    }

    initializeFloatingTable();
});
