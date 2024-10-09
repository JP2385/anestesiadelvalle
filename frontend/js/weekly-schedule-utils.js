import { handleRandomizeButtonClick } from './randomizeButtonHandler.js';
import { countEnabledSelectsByDay } from './autoAssignFunctions.js';
import { autoAssignReportBgColorsUpdate } from './autoAssignReportBgColorsUpdate.js';
import { compareAvailabilitiesForEachDay } from './compareArrays.js';
import { validateAllDays } from './autoAssignValidation.js';
import { handleRandomizeButtonClickForWeek } from './randomizeButtonHandlerForWeek.js';
import { updateSelectColors } from './updateSelectColors.js';
import { countLongDays, selectBestConfiguration, applyBestConfiguration, collectAssignments } from './bestConfigurationForWeek.js';
import { showProgressBar, updateProgressBar, hideProgressBar, updateProgressMessage} from './progressBar.js'

export function updateWeekDates(apiUrl, availability) {
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


export async function populateSelectOptions(availability) {
    try {
        const selects = document.querySelectorAll('select');

        // Obtener la lista de usuarios disponibles el sábado
        const saturdayAvailability = availability.saturday.map(user => user.username);

        selects.forEach(select => {
            const workSite = select.closest('tr').querySelector('.work-site').innerText;
            const dayIndex = select.closest('td').cellIndex - 1;
            const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayIndex];
            const dayName = dayHeaderId.split('-')[0];

            select.innerHTML = '<option value="">Select user</option>';

            const availableUsers = availability[dayName];

            availableUsers.forEach(user => {


                console.log(`User: ${user.username}, doesPediatrics: ${user.doesPediatrics}`);

                // Excluir usuarios que no hacen pediatría en sitios que contienen "COI"
                if (workSite.includes('COI') && !user.doesPediatrics) {
                    console.log(`Excluyendo a ${user.username} porque no hace pediatría y el sitio incluye COI.`);
                    return; // Excluir usuario si no hace pediatría y el sitio contiene "COI"
                }

                // Exclusión de "mgioja" en sitios que contienen "Fundación"
                if (user.username === 'mgioja' && workSite.includes('Fundación')) {
                    return; // Excluir "mgioja" si el sitio contiene "Fundación"
                }

                // Exclusión de "rconsigli" en workSite que incluye "CMAC"
                if (user.username === 'rconsigli' && workSite.includes('CMAC')) {
                    return; // Excluir "rconsigli" de "CMAC"
                }

                // Nueva condición: Exclusión de "lharriague" en worksites vespertinos los martes
                if (user.username === 'lharriague' && dayName === 'tuesday' && workSite.includes('Vespertino')) {
                    return; // Excluir "lharriague" en vespertino los martes
                }

                // Nueva condición: Exclusión de "mquiroga" en worksites vespertinos los jueves
                if (user.username === 'mquiroga' && dayName === 'thursday' && workSite.includes('Vespertino')) {
                    return; // Excluir "mquiroga" en vespertino los jueves
                }
                // Restricción adicional para miércoles en "Imágenes Quirofano 1 Matutino"
                if (dayName === 'wednesday' && workSite.includes('Imágenes Q1') && workSite.includes('Matutino')) {
                    if (!user.doesCardio) {
                        return; // Saltar usuarios que no hacen cardio
                    }
                }

                // Exclusión de usuarios con régimen variable el viernes si salen de vacaciones el sábado
                if (dayName === 'friday' && user.workSchedule[dayName] === 'Variable' && !saturdayAvailability.includes(user.username)) {
                    if (workSite.includes('Vespertino') || workSite.includes('Largo')) {
                        console.log(`Excluyendo a ${user.username} del turno largo o vespertino por régimen variable y vacaciones el sábado.`);
                        return; // Excluir solo de los turnos vespertinos o largos
                    }
                    if (workSite.includes('Matutino')) {
                        console.log(`Incluyendo a ${user.username} en el turno matutino porque tiene régimen variable y empieza vacaciones el sábado.`);
                        user.workSchedule[dayName] = 'Mañana'; // Cambiar a turno matutino
                    }
                }

                // Exclusión de usuarios con turno vespertino el viernes si salen de vacaciones el sábado
                if (dayName === 'friday' && user.workSchedule[dayName] === 'Tarde' && !saturdayAvailability.includes(user.username)) {
                    if (workSite.includes('Vespertino')) {
                        console.log(`Excluyendo a ${user.username} del turno vespertino porque empieza vacaciones el sábado.`);
                        return; // Excluir solo de los turnos vespertinos
                    }
                    if (workSite.includes('Matutino')) {
                        console.log(`Incluyendo a ${user.username} en el turno matutino porque empieza vacaciones el sábado.`);
                        user.workSchedule[dayName] = 'Mañana'; // Cambiar a turno matutino
                    }
                }

                // Excluir si el workSite incluye '4to piso' y el username es 'lespinosa'
                if (workSite.includes('4to piso') && user.username === 'lespinosa') return;

                if (user.worksInCmacOnly && !workSite.includes('CMAC')) return;

                if ((workSite.includes('Fundación Q1') || workSite.includes('Fundación Q2') || workSite.includes('Fundación 3') || workSite.includes('CMAC Q'))) {
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

                if (workSite.includes('Fundación Q1 Cardio') || workSite.includes('Fundación Hemo')) {
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
            select.addEventListener('change', (event) => handleSelectChange(event, availability));
        });
    } catch (error) {
        alert('Hubo un problema con la solicitud: ' + error.message);
    }
}


export function initializeLockButtons() {
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

                // Llamar a handleSelectChange para reflejar el cambio
                handleSelectChange({ target: select });
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

                // Llamar a handleSelectChange para reflejar el cambio en los selects relacionados
                handleSelectChange({ target: relatedSelect });
        
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


export async function handleSelectChange(event, availability) {
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

export async function handleAutoAssignForWeek(apiUrl, dayIndices, availability) {
    showProgressBar(); // Mostrar la barra de progreso al inicio

    try {
        const isValid = await validateAllDays();
        if (!isValid) {
            hideProgressBar();
            return;
        }

        const allLongDaysCounts = [];
        const allAssignments = []; // Para almacenar las asignaciones de cada configuración

        for (let i = 0; i < 200; i++) { // Cambiar a 100 iteraciones
            const promises = dayIndices.map(dayIndex =>
                handleRandomizeButtonClickForWeek(apiUrl, dayIndex, availability)
            );
            await Promise.all(promises);

            // Obtener el conteo de días largos para esta configuración
            const longDaysCount = countLongDays();
            allLongDaysCounts.push(longDaysCount);

            // Guardar las asignaciones de esta iteración
            const currentAssignments = collectAssignments();
            allAssignments.push(currentAssignments);

            // Actualizar la barra de progreso
            const progress = Math.round(((i + 1) / 200) * 100);
            updateProgressBar(progress);

            // Actualizar el mensaje de progreso
            updateProgressMessage(`Esquema semanal ${i + 1} de 200 completado.`);

            // Esperar un pequeño retraso para permitir que la UI se repinte
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Seleccionar la mejor configuración usando allLongDaysCounts y allAssignments
        const bestConfigurationIndex = selectBestConfiguration(allLongDaysCounts, allAssignments);

        // Aplicar la mejor configuración
        const bestAssignments = allAssignments[bestConfigurationIndex]; // Ahora deberías obtener las asignaciones correctas
        console.log("Mejor configuración seleccionada: ", bestAssignments);
        applyBestConfiguration(bestAssignments);

        // Actualizar colores y reportes para cada día
        dayIndices.forEach(dayIndex => {
            autoAssignReportBgColorsUpdate(dayIndex);
            compareAvailabilitiesForEachDay(dayIndex);
            updateSelectColors(dayIndex, availability);
        });

    } finally {
        hideProgressBar(); // Ocultar la barra de progreso al finalizar
    }
}

export function initializeFloatingTable() {
    const toggleSwitch = document.getElementById('toggle-table');
    const floatingTable = document.getElementById('floating-table');
    const closeButton = document.getElementById('close-table');

    // Mostrar la tabla flotante cuando el switch está activado
    toggleSwitch.addEventListener('change', () => {
        if (toggleSwitch.checked) {
            floatingTable.style.display = 'block';
        } else {
            floatingTable.style.display = 'none';
        }
    });

    // Cerrar la tabla y desactivar el switch al hacer clic en la cruz
    closeButton.addEventListener('click', () => {
        floatingTable.style.display = 'none';
        toggleSwitch.checked = false; // Desactiva el switch
    });
}
