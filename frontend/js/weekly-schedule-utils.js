import toast from './toast.js';
import { handleRandomizeButtonClick } from './randomizeButtonHandler.js';
import { countEnabledSelectsByDay } from './autoAssignFunctions.js';
import { autoAssignReportBgColorsUpdate } from './autoAssignReportBgColorsUpdate.js';
import { compareAvailabilitiesForEachDay } from './compareArrays.js';
import { validateAllDays } from './autoAssignValidation.js';
import { handleRandomizeButtonClickForWeek } from './randomizeButtonHandlerForWeek.js';
import { updateSelectColors } from './updateSelectColors.js';
import { countLongDays, selectBestConfiguration, applyBestConfiguration, collectAssignments } from './bestConfigurationForWeek.js';
import { showProgressBar, updateProgressBar, hideProgressBar, updateProgressMessage} from './progressBar.js'

// Variable global para controlar el modo Mortal Combat
let mortalCombatMode = false;
// Variables para controlar el modo Mortal Combat por día
let dailyMortalCombatMode = {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false
};

// Función para obtener el estado del modo Mortal Combat
export function getMortalCombatMode() {
    return mortalCombatMode;
}

// Función para obtener el estado del modo Mortal Combat diario
export function getDailyMortalCombatMode(dayName) {
    return dailyMortalCombatMode[dayName] || false;
}

// Función para setear el estado del modo Mortal Combat
export function setMortalCombatMode(value) {
    mortalCombatMode = value;
}

// Función para setear el estado del modo Mortal Combat diario
export function setDailyMortalCombatMode(dayName, value) {
    if (dailyMortalCombatMode.hasOwnProperty(dayName)) {
        dailyMortalCombatMode[dayName] = value;
    }
}

// Función para obtener todos los modos diarios
export function getAllDailyMortalCombatModes() {
    return { ...dailyMortalCombatMode };
}

// Usuarios que mantienen sus restricciones de horario incluso en modo Mortal Combat
const SPECIAL_USERS = ['ecesar', 'jbo', 'montes_esposito'];

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

    function createDailyMortalCombatButton(dayId, dayIndex) {
        const button = document.createElement('button');
        button.classList.add('daily-mortal-combat-button');
        button.style.cssText = `
            width: 20px; 
            height: 20px; 
            border-radius: 50%; 
            background: red; 
            border: 2px solid #333; 
            cursor: pointer; 
            margin: 0; 
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: bold; 
            font-size: 9px; 
            color: black; 
            font-family: Arial, sans-serif;
            vertical-align: middle;
        `;
        button.textContent = 'MK';
        button.title = '⚔️ Modo Mortal Combat Diario: Quita restricciones de horario en este día';
        
        const dayName = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][dayIndex];
        
        button.addEventListener('click', () => {
            toggleDailyMortalCombatMode(dayName, dayIndex, availability);
        });
        
        return button;
    }

    function createRandomizeButton(dayId, dayIndex) {
        const button = document.createElement('button');
        button.innerText = '🔄';
        button.classList.add('randomize-button');
        button.style.cssText = 'margin: 0;'; // Quitar margin lateral
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
        
        // Limpiar el contenido existente
        header.innerHTML = '';
        
        // Crear contenedor flex para mantener todo en línea
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 2px;';
        
        // Crear el texto del día
        const dayText = document.createElement('span');
        dayText.textContent = `${dayName} ${date.toLocaleDateString('es-ES', dateOptions)}`;
        dayText.style.cssText = 'white-space: nowrap;';
        
        // Crear contenedor para los botones en el lado derecho
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = 'display: flex; align-items: center; gap: 2px;';
        buttonsContainer.appendChild(createDailyMortalCombatButton(dayId, dayIndex));
        buttonsContainer.appendChild(createRandomizeButton(dayId, dayIndex));
        
        // Agregar elementos al contenedor principal
        container.appendChild(dayText);
        container.appendChild(buttonsContainer);
        
        // Agregar el contenedor al header
        header.appendChild(container);
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

                // Excluir usuarios que no hacen pediatría en sitios que contienen "COI"
                if (workSite.includes('COI') && !user.doesPediatrics) {
                    return; // Excluir usuario si no hace pediatría y el sitio contiene "COI"
                }

                // Exclusión de "mgioja" en sitios que contienen "Fundación"
                if (user.username === 'mgioja' && workSite.includes('Fundación')) {
                    return; // Excluir "mgioja" si el sitio contiene "Fundación"
                }

                // Exclusión de "rconsigli" en workSite que incluye "CMAC"
                if (user.username === 'rconsigli' && workSite.includes('CMAC') && dayName !== 'thursday') {
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

                if ((workSite.includes('Fundación') || workSite.includes('CMAC'))) {
                    if (!user.worksInPrivateRioNegro) return;   
                }

                //RESTRICCIÓN FLEXIBLE PARA CRUCE DE NEQUINOS A RIO NEGRO
                // if ((workSite.includes('Fundación Q1') || workSite.includes('Fundación Q2') 
                //     || workSite.includes('Fundación Q3') || workSite.includes('CMAC Q'))) {
                //     if (!user.worksInPrivateRioNegro) return;
                // }

                if (workSite.includes('Hospital Cipolletti') || workSite.includes('Hospital Allen')) {
                    if (!user.worksInPublicRioNegro) return;
                }

                if (workSite.includes('Hospital Heller') || workSite.includes('Hospital Plottier') || workSite.includes('Hospital Centenario') || workSite.includes('Hospital Castro Rendon')) {
                    if (!user.worksInPublicNeuquen) return;
                }

                if ((workSite.includes('Imágenes') || workSite.includes('COI'))) {
                    if (!user.worksInPrivateNeuquen) return;
                }

                //RESTRICCIÓN FLEXIBLE PARA CRUCE DE NEQUINOS A RIO NEGRO
                // if ((workSite.includes('Imágenes') || workSite.includes('COI')) && !workSite.includes('4to piso')) {
                //     if (!user.worksInPrivateNeuquen) return;
                // }

                // En modo Mortal Combat (global o diario), ignorar las restricciones de horario excepto para usuarios especiales
                const isSpecialUser = SPECIAL_USERS.includes(user.username);
                const isDailyMortalCombat = dailyMortalCombatMode[dayName];
                const isAnyMortalCombat = mortalCombatMode || isDailyMortalCombat;
                
                if (!isAnyMortalCombat || isSpecialUser) {
                    // Para usuarios duplicados, usar el shift para determinar restricciones
                    const scheduleForDay = user.shift ? user.shift : user.workSchedule[dayName];
                    
                    if (workSite.includes('Matutino') && scheduleForDay === 'Tarde') return;
                    if (workSite.includes('Vespertino') && scheduleForDay === 'Mañana') return;
                    if (workSite.includes('Largo') && scheduleForDay === 'Mañana') return;
                    if (workSite.includes('Largo') && scheduleForDay === 'Tarde') return;
                }

                if (workSite.includes('CMAC Endoscopia')) {
                    if (user.worksInPrivateRioNegro || user.username === 'mgioja') {
                        // Incluir este usuario
                    } else {
                        return;
                    }
                }

                // Exclusiones para la usuaria lharriague
                if (user.username === 'lharriague') {
                    const exclusionesGenerales = ['Hemo', 'RNM', 'Q3', 'COI'];
                    const exclusionDiaEspecifico = dayName === 'wednesday' && workSite.includes('4to piso');

                    const tieneExclusionGeneral = exclusionesGenerales.some(palabra => workSite.includes(palabra));

                    if (tieneExclusionGeneral || exclusionDiaEspecifico) {
                        return; // Excluir lharriague en estos casos
                    }
                }

                const option = document.createElement('option');
                option.value = user._id || user.username; // Asegurarse de usar user._id si está disponible
                
                // Mostrar solo el username, sin el turno
                option.textContent = user.username;

                // Asignar clases CSS según el horario de trabajo
                if (isAnyMortalCombat && !isSpecialUser) {
                    // En modo Mortal Combat (global o diario), todos los usuarios normales usan el estilo de variable
                    option.classList.add('option-long');
                } else {
                    // Usuarios especiales o modo normal mantienen sus estilos originales
                    // Para usuarios duplicados, usar el shift para determinar el estilo
                    const scheduleForDay = user.shift ? user.shift : user.workSchedule[dayName];
                    
                    if (scheduleForDay === 'Mañana') {
                        option.classList.add('option-morning');
                    } else if (scheduleForDay === 'Tarde') {
                        option.classList.add('option-afternoon');
                    } else if (scheduleForDay === 'Variable') {
                        option.classList.add('option-long');
                    }
                }

                if (workSite.includes('Cardio')) {
                    if (user.doesCardio) {
                        select.appendChild(option);
                    }
                } else if (workSite.includes('Fundación RNM TAC') || workSite.includes('COI')|| workSite.includes('Imágenes RNM')) {
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
        toast.error('Hubo un problema con la solicitud: ' + error.message);
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

                // Guardar la clase original antes de cambiarla
                select.dataset.originalClass = select.className;

                // Eliminar las clases previas y agregar la clase default
                select.classList = ' ';
                select.classList.add('default'); // Añadir la clase default

                // Llamar a handleSelectChange para reflejar el cambio
                handleSelectChange({ target: select });
            } else {
                // Si el select se desbloquea, restaurar la clase original
                if (select.dataset.originalClass) {
                    select.className = select.dataset.originalClass;
                    delete select.dataset.originalClass;
                } else {
                    // Fallback: derivar la clase del ID si no hay clase original guardada
                    const selectId = select.id;
                    if (selectId.includes('short')) {
                        select.className = 'short';
                    } else if (selectId.includes('long')) {
                        select.className = 'long';
                    } else if (selectId.includes('afternoon')) {
                        select.className = 'afternoon';
                    } else {
                        select.classList.remove('default');
                    }
                }
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
        // Obtener el usuario seleccionado para conocer su username base y shift
        const dayName = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][dayIndex];
        const selectedUser = availability[dayName].find(user => user._id === selectedUserId || user.username === selectedUserId);
        const baseUsername = selectedUser ? selectedUser.username : null;
        const selectedShift = selectedUser ? selectedUser.shift : null;

        selects.forEach(otherSelect => {
            if (otherSelect !== select && otherSelect.value !== '') {
                // Comparar por userId primero
                if (otherSelect.value === selectedUserId) {
                    userAlreadyAssigned = true;
                } else if (baseUsername && selectedShift) {
                    // Para usuarios duplicados (mañana/tarde), solo bloquear si es el mismo turno
                    const otherUser = availability[dayName].find(user => user._id === otherSelect.value || user.username === otherSelect.value);
                    if (otherUser && otherUser.username === baseUsername && otherUser.shift === selectedShift) {
                        userAlreadyAssigned = true;
                    }
                }
            }
        });

        if (userAlreadyAssigned) {
            console.log('⚠️ Usuario ya asignado detectado:', selectedUserId, 'en día:', dayIndex);
            // Restaurar inmediatamente antes de mostrar toast
            select.value = originalValue;
            // Mostrar toast con duración extendida para asegurar visibilidad
            setTimeout(() => {
                toast.warning('El usuario que se intenta asignar ya tiene otro lugar asignado en este día.', 5000);
            }, 10);
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
            const isSpecialUser = SPECIAL_USERS.includes(user.username);
            const isDailyMortalCombat = dailyMortalCombatMode[dayName];
            const isAnyMortalCombat = mortalCombatMode || isDailyMortalCombat;
            
            if (isAnyMortalCombat && !isSpecialUser) {
                // En modo Mortal Combat (global o diario), usuarios normales usan el estilo de variable
                select.classList.add('option-long');
            } else {
                // Usuarios especiales o modo normal mantienen sus estilos originales
                // Para usuarios duplicados, usar el shift para determinar el estilo
                const scheduleForDay = user.shift ? user.shift : user.workSchedule[dayName];
                
                if (scheduleForDay === 'Mañana') {
                    select.classList.add('option-morning');
                } else if (scheduleForDay === 'Tarde') {
                    select.classList.add('option-afternoon');
                } else if (scheduleForDay === 'Variable') {
                    select.classList.add('option-long');
                }
            }
        }
    }

    await compareAvailabilitiesForEachDay(dayIndex);
    autoAssignReportBgColorsUpdate(dayIndex);
}

export async function handleAutoAssignForWeek(apiUrl, dayIndices, availability) {
    showProgressBar();

    try {
        const isValid = await validateAllDays();
        if (!isValid) {
            hideProgressBar();
            return;
        }

        const allLongDaysCounts = [];
        const allAssignments = [];

        // Capturar el DOM una sola vez para reutilizar
        const scheduleBody = document.getElementById('schedule-body');
        const preCapturedRows = Array.from(scheduleBody.getElementsByTagName('tr'));

        for (let i = 0; i < 200; i++) {
            const promises = dayIndices.map(dayIndex =>
                handleRandomizeButtonClickForWeek(apiUrl, dayIndex, availability)
            );
            await Promise.all(promises);

            allLongDaysCounts.push(countLongDays());
            allAssignments.push(collectAssignments(preCapturedRows));

            // ✅ Actualizar UI en cada iteración
            updateProgressBar(Math.round(((i + 1) / 200) * 100));
            updateProgressMessage(`Esquema semanal ${i + 1} de 200 completado.`);

            // ✅ Permitir repintado de la interfaz sin demorar perceptiblemente
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const bestConfigurationIndex = selectBestConfiguration(allLongDaysCounts, allAssignments);
        const bestAssignments = allAssignments[bestConfigurationIndex];

        console.log("Mejor configuración seleccionada: ", bestAssignments);
        applyBestConfiguration(bestAssignments);

        dayIndices.forEach(dayIndex => {
            autoAssignReportBgColorsUpdate(dayIndex);
            compareAvailabilitiesForEachDay(dayIndex);
            updateSelectColors(dayIndex, availability);
        });

    } finally {
        hideProgressBar();
    }
}

// Función para guardar las asignaciones actuales de todos los selects
function saveCurrentAssignments() {
    const assignments = {};
    const selects = document.querySelectorAll('select');
    
    selects.forEach(select => {
        if (select.value !== '') {
            assignments[select.id] = select.value;
        }
    });
    
    return assignments;
}

// Función para restaurar las asignaciones guardadas
function restoreAssignments(assignments, availability) {
    Object.entries(assignments).forEach(([selectId, value]) => {
        const select = document.getElementById(selectId);
        if (select && select.querySelector(`option[value="${value}"]`)) {
            select.value = value;
            // Simular el evento change para aplicar los estilos correctos
            const event = { target: select };
            handleSelectChange(event, availability);
        }
    });
}

// Función para activar/desactivar el modo Mortal Combat
export async function toggleMortalCombatMode(availability) {
    // Guardar las asignaciones actuales antes de cambiar el modo
    const currentAssignments = saveCurrentAssignments();
    
    mortalCombatMode = !mortalCombatMode;
    const button = document.getElementById('mortal-combat-button');
    const img = button.querySelector('img');
    
    const legend = document.getElementById('mortal-combat-legend');
    
    if (mortalCombatMode) {
        // Estado activo - efectos visuales
        img.style.filter = 'brightness(1.5) saturate(1.5)';
        img.style.transform = 'scale(1.1)';
        button.title = 'Desactivar Mortal Combat';
        legend.style.display = 'block';
        console.log('Modo Mortal Combat ACTIVADO - Sin restricciones de horario');
    } else {
        // Estado inactivo - brightness y saturate solamente
        img.style.filter = 'brightness(1.5) saturate(1.5)';
        img.style.transform = '';
        button.title = 'Activar Modo Mortal Combat';
        legend.style.display = 'none';
        console.log('Modo Mortal Combat DESACTIVADO - Restricciones de horario restauradas');
    }
    
    // Repoblar todos los selects con las nuevas reglas
    populateSelectOptions(availability);
    
    // Restaurar las asignaciones previas
    restoreAssignments(currentAssignments, availability);
    
    // Re-aplicar asignaciones automáticas de usuarios especiales
    const assignedUsers = new Set();
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    
    // Asignar para cada día de la semana
    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
        const dayAssignedUsers = new Set();
        try {
            const { autoAssignCaroSandraGabiByDay } = await import('./autoAssignHandlersCaroSandraGabi.js');
            const { autoAssignPublicHospitalsByDay } = await import('./autoAssignHandlersPublicHospitals.js');
            
            await autoAssignCaroSandraGabiByDay(apiUrl, dayIndex, availability, dayAssignedUsers);
            await autoAssignPublicHospitalsByDay(apiUrl, dayIndex, availability, dayAssignedUsers);
        } catch (error) {
            console.error('Error re-aplicando asignaciones automáticas:', error);
        }
    }
}

// Función para activar/desactivar el modo Mortal Combat diario
function toggleDailyMortalCombatMode(dayName, dayIndex, availability) {
    // Guardar las asignaciones actuales del día antes de cambiar el modo
    const dayColumnIndex = dayIndex + 1; // +1 porque la primera columna es work-site
    const daySelects = document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`);
    const currentDayAssignments = {};
    
    daySelects.forEach(select => {
        if (select.value !== '') {
            currentDayAssignments[select.id] = select.value;
        }
    });
    
    // Cambiar el estado del día
    dailyMortalCombatMode[dayName] = !dailyMortalCombatMode[dayName];
    
    // Actualizar el botón visual
    const dayButtons = document.querySelectorAll('.daily-mortal-combat-button');
    const button = dayButtons[dayIndex];
    
    if (dailyMortalCombatMode[dayName]) {
        // Estado activo - fondo más oscuro y efectos
        button.style.background = '#cc0000';
        button.style.border = '2px solid #000';
        button.style.boxShadow = '0 0 6px rgba(255, 0, 0, 0.8)';
        button.style.transform = 'scale(1.1)';
        button.title = '⚔️ ACTIVO - Clic para desactivar Modo Mortal Combat de este día';
        console.log(`Modo Mortal Combat ACTIVADO para ${dayName}`);
    } else {
        // Estado inactivo - fondo rojo normal
        button.style.background = 'red';
        button.style.border = '2px solid #333';
        button.style.boxShadow = 'none';
        button.style.transform = '';
        button.title = '⚔️ Modo Mortal Combat Diario: Quita restricciones de horario para usuarios normales en este día';
        console.log(`Modo Mortal Combat DESACTIVADO para ${dayName}`);
    }
    
    // Repoblar solo los selects de este día
    repopulateDaySelects(dayName, dayIndex, availability);
    
    // Restaurar las asignaciones previas para este día
    Object.entries(currentDayAssignments).forEach(([selectId, value]) => {
        const select = document.getElementById(selectId);
        if (select && select.querySelector(`option[value="${value}"]`)) {
            select.value = value;
            // Simular el evento change para aplicar los estilos correctos
            const event = { target: select };
            handleSelectChange(event, availability);
        }
    });
}

// Función para repoblar los selects de un día específico
function repopulateDaySelects(dayName, dayIndex, availability) {
    // Simplemente llamar a populateSelectOptions que ya maneja el modo diario
    populateSelectOptions(availability);
}

// Función para inicializar el listener del botón Mortal Combat
export function initializeMortalCombatButton(availability) {
    const button = document.getElementById('mortal-combat-button');
    if (button) {
        button.addEventListener('click', async () => {
            await toggleMortalCombatMode(availability);
        });
    }
}
