import { handleRandomizeButtonClick } from './randomizeButtonHandler.js';
import { handleRandomizeButtonClickForWeek } from './randomizeButtonHandlerForWeek.js';
import { fetchAvailability } from './assignUtils.js';
import { autoAssignCaroSandraGabiByDay } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitalsByDay } from './autoAssignHandlersPublicHospitals.js';
import { countAssignmentsByDay, countEnabledSelectsByDay } from './autoAssignFunctions.js';
import { compareAvailabilities } from './compareArrays.js';
import { validateAllDays } from './autoAssignValidation.js';
import { autoAssignReportBgColorsUpdate } from './autoAssignReportBgColorsUpdate.js';
import { compareAvailabilitiesForEachDay } from './compareArrays.js';
import { updateSelectColors } from './updateSelectColors.js';
import { countLongDays, selectBestConfiguration, applyBestConfiguration } from './bestConfigurationForWeek.js';

document.addEventListener('DOMContentLoaded', async function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    let availability;
    try {
        showSpinner();
        updateWeekDates();
        await populateSelectOptions();
        initializeLockButtons();
        availability = await fetchAvailability(apiUrl);
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
    

    function updateWeekDates() {
        const currentDate = new Date();
        const currentDay = currentDate.getDay();
        let nextMondayDate;

        if (currentDay === 6) { // Si hoy es sábado (6) o domingo (0)
            // Calcular el lunes de la próxima semana
            nextMondayDate = new Date(currentDate);
            nextMondayDate.setDate(currentDate.getDate() + (8 - currentDay)); 
        } else {
            // Calcular el lunes de esta semana
            nextMondayDate = new Date(currentDate);
            nextMondayDate.setDate(currentDate.getDate() - (currentDay - 1));
        }

        const dateOptions = { day: 'numeric' };

        function createRandomizeButton(dayId, dayIndex) {
            const button = document.createElement('button');
            button.innerText = '🔄';
            button.classList.add('randomize-button');
            button.addEventListener('click', async () => {
                try {
                    showSpinner();
                    (`Randomizing assignments for day index: ${dayIndex}`);
                    await handleRandomizeButtonClick(apiUrl, availability, dayIndex);
                    (`Calling autoAssignReportBgColorsUpdate for day index: ${dayIndex}`);
                    autoAssignReportBgColorsUpdate(dayIndex);
                } finally {
                    hideSpinner();
                }
            });
            return button;
        }

        function updateHeader(dayId, dayName, date, dayIndex) {
            const header = document.getElementById(dayId);
            header.innerText = `${dayName} ${date.toLocaleDateString('es-ES', dateOptions)}`;
            header.appendChild(createRandomizeButton(dayId, dayIndex));
        }

        updateHeader('monday-header', 'Lunes', nextMondayDate, 0);

        const tuesdayDate = new Date(nextMondayDate);
        tuesdayDate.setDate(nextMondayDate.getDate() + 1);
        updateHeader('tuesday-header', 'Martes', tuesdayDate, 1);

        const wednesdayDate = new Date(nextMondayDate);
        wednesdayDate.setDate(nextMondayDate.getDate() + 2);
        updateHeader('wednesday-header', 'Miércoles', wednesdayDate, 2);

        const thursdayDate = new Date(nextMondayDate);
        thursdayDate.setDate(nextMondayDate.getDate() + 3);
        updateHeader('thursday-header', 'Jueves', thursdayDate, 3);

        const fridayDate = new Date(nextMondayDate);
        fridayDate.setDate(nextMondayDate.getDate() + 4);
        updateHeader('friday-header', 'Viernes', fridayDate, 4);
    }

    async function populateSelectOptions() {
        try {
            const response = await fetch(`${apiUrl}/availability`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const availability = await response.json();
                const selects = document.querySelectorAll('select');

                selects.forEach(select => {
                    const workSite = select.closest('tr').querySelector('.work-site').innerText;
                    const dayIndex = select.closest('td').cellIndex - 1;
                    const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayIndex];
                    const dayName = dayHeaderId.split('-')[0];

                    select.innerHTML = '<option value="">Select user</option>';

                    const availableUsers = availability[dayName];

                    availableUsers.forEach(user => {
                        // Exclusión de "mgioja" en sitios que contienen "Fundación"
                        if (user.username === 'mgioja' && workSite.includes('Fundación')) {
                            return; // Excluir "mgioja" si el sitio contiene "Fundación"
                        }

                        // Restricción adicional para miércoles en "Imágenes Quirofano 1 Matutino"
                        if (dayName === 'wednesday' && workSite.includes('Imágenes Q1') && workSite.includes('Matutino')) {
                            if (!user.doesCardio) {
                                return; // Saltar usuarios que no hacen cardio
                            }
                        }

                        // Excluir si el workSite incluye '4to piso' y el username es 'lespinosa'
                        if (workSite.includes('4to piso') && user.username === 'lespinosa') return;
                    
                        if (user.worksInCmacOnly && !workSite.includes('CMAC')) return;
                    
                        if ((workSite.includes('Fundación Q2') || workSite.includes('Fundación 3') || workSite.includes('CMAC Q'))) {
                            if (!user.worksInPrivateRioNegro) return;
                        }
                    
                        if (workSite.includes('Hospital Cipolletti') || workSite.includes('Hospital Allen')) {
                            if (!user.worksInPublicRioNegro) return;
                        }
                    
                        if (workSite.includes('Hospital Heller') || workSite.includes('Hospital Plottier') || workSite.includes('Hospital Centenario') || workSite.includes('Hospital Castro Rendon')) {
                            if (!user.worksInPublicNeuquen) return;
                        }
                    
                        if ((workSite.includes('Imágenes') || workSite.includes('COI')) && !workSite.includes('4to piso')) {
                            if (!user.worksInPrivateNeuquen) return;
                        }
                    
                        if (workSite.includes('Matutino') && user.workSchedule[dayName] === 'Tarde') return;
                        if (workSite.includes('Vespertino') && user.workSchedule[dayName] === 'Mañana') return;
                        if (workSite.includes('Largo') && user.workSchedule[dayName] === 'Mañana') return;
                        if (workSite.includes('Largo') && user.workSchedule[dayName] === 'Tarde') return;
                    
                        if (workSite.includes('CMAC Endoscopia')) {
                            if (user.worksInPrivateRioNegro || user.username === 'mgioja') {
                                // Incluir este usuario
                            } else {
                                return;
                            }
                        }
                    

                        const option = document.createElement('option');
                        option.value = user._id || user.username; // Asegurarse de usar user._id si está disponible
                        option.textContent = user.username;

                        // Asignar clases CSS según el horario de trabajo
                        if (user.workSchedule[dayName] === 'Mañana') {
                            option.classList.add('option-morning');
                        } else if (user.workSchedule[dayName] === 'Tarde') {
                            option.classList.add('option-afternoon');
                        } else if (user.workSchedule[dayName] === 'Variable') {
                            option.classList.add('option-long');
                        }

                        if (workSite.includes('Fundación Q1') || workSite.includes('Fundación Hemo')) {
                            if (user.doesCardio) {
                                select.appendChild(option);
                            }
                        } else if (workSite.includes('Fundación RNM TAC') || workSite.includes('COI')) {
                            if (user.doesRNM) {
                                select.appendChild(option);
                            }
                        } else {
                            select.appendChild(option);
                        }
                    });
                });

                // Añadir eventos de cambio para los selectores
                selects.forEach(select => {
                    select.addEventListener('change', handleSelectChange);
                });

            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            alert('Hubo un problema con la solicitud: ' + error.message);
        }
    }


    function initializeLockButtons() {
        const droppableCells = document.querySelectorAll('.droppable');
        droppableCells.forEach(cell => {
            const select = cell.querySelector('select');
            const button = document.createElement('button');
            button.classList.add('lock-button');
            button.textContent = select.disabled ? '🔓' : '🔒';
    
            // Obtener el índice del día
            const dayIndex = cell.closest('td').cellIndex - 1;
            button.setAttribute('data-day-index', dayIndex); // Añadir el índice del día como un atributo de datos
    
            button.addEventListener('click', () => {
                // Cambiar el estado del select actual
                select.disabled = !select.disabled;
                button.textContent = select.disabled ? '🔓' : '🔒';
            
                if (select.disabled) {
                    // Cambiar el select a su valor por defecto (primera opción)
                    select.selectedIndex = 0;
                    
                    // Eliminar las clases previas y agregar la clase default
                    select.classList = ' ';
                    select.classList.add('default'); // Añadir la clase default
                } else {
                    // Si el select se desbloquea, eliminar la clase default
                    select.classList.remove('default');
                }
            
                // Obtener el id del select actual
                const selectId = select.id;
            
                // Determinar si es 'short' o 'long'
                const isShort = selectId.includes('short');
                const baseId = selectId.replace('-short', '').replace('-long', '');
            
                // Desactivar los selects relacionados
                const relatedIds = isShort 
                    ? document.querySelectorAll(`select[id^="${baseId}"][id$="long"]`)
                    : document.querySelectorAll(`select[id^="${baseId}"][id$="short"]`);
            
                relatedIds.forEach(relatedSelect => {
                    relatedSelect.disabled = true;
                    relatedSelect.selectedIndex = 0; // También cambiar el select relacionado a su valor por defecto
            
                    // Eliminar clases previas y añadir la clase default
                    relatedSelect.classList = ' ';
                    relatedSelect.classList.add('default');
            
                    const relatedButton = relatedSelect.closest('td').querySelector('.lock-button');
                    if (relatedButton) {
                        relatedButton.textContent = '🔓';
                    }
                });
    
                countEnabledSelectsByDay();
    
                // Recuperar el índice del día desde el atributo de datos
                const dayIndex = button.getAttribute('data-day-index');
                autoAssignReportBgColorsUpdate(dayIndex);
            });
            cell.appendChild(button);
        });
    }
    
    

    async function handleSelectChange(event) {
        const select = event.target;
        const selectedUserId = select.value;
        const originalValue = select.getAttribute('data-original-value');
        const dayIndex = select.closest('td').cellIndex - 1;
        const selects = document.querySelectorAll(`td:nth-child(${dayIndex + 2}) select`);

        let userAlreadyAssigned = false;

        if (selectedUserId !== '') { // Solo verificar si no es la opción por defecto
            selects.forEach(otherSelect => {
                if (otherSelect !== select && otherSelect.value === selectedUserId) {
                    userAlreadyAssigned = true;
                }
            });

            if (userAlreadyAssigned) {
                alert('El usuario que se intenta asignar ya tiene otro lugar asignado en este día.');
                select.value = originalValue; // Restaurar el valor original
                return; // Salir de la función
            }
        }

        // Actualizar el valor original del select
        select.setAttribute('data-original-value', selectedUserId);

        // Eliminar las clases CSS previas
        select.classList=' ';

        if (select.value === '') {
            select.classList.add('default');
        } else {
            select.classList.add('assigned');

            // Obtener el horario de trabajo del usuario seleccionado
            const dayName = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][dayIndex];
            const user = availability[dayName].find(user => user._id === selectedUserId || user.username === selectedUserId);

            // Asignar la clase CSS correspondiente al horario de trabajo
            if (user) {
                if (user.workSchedule[dayName] === 'Mañana') {
                    select.classList.add('option-morning');
                } else if (user.workSchedule[dayName] === 'Tarde') {
                    select.classList.add('option-afternoon');
                } else if (user.workSchedule[dayName] === 'Variable') {
                    select.classList.add('option-long');
                }
            }
        }

        await compareAvailabilitiesForEachDay(dayIndex);
        autoAssignReportBgColorsUpdate(dayIndex);
    }

    document.querySelectorAll('select').forEach(select => {
        select.classList.add('default');
        select.setAttribute('data-original-value', select.value); // Inicializar el valor original
        select.addEventListener('change', handleSelectChange);
    });
});