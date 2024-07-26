import { handleRandomizeButtonClick } from './randomizeButtonHandler.js';
import { fetchAvailability } from './assignUtils.js';
import { autoAssignCaroSandraGabiByDay } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitalsByDay } from './autoAssignHandlersPublicHospitals.js';
import { countAssignmentsByDay, countEnabledSelectsByDay } from './autoAssignFunctions.js';
import { compareAvailabilities } from './compareArrays.js';
import { validateAllDays } from './autoAssignValidation.js';

document.addEventListener('DOMContentLoaded', async function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    updateWeekDates();
    await populateSelectOptions();
    initializeLockButtons();
    await fetchAvailability();

    // Llamar a autoAssignCaroSandraGabiByDay para cada día de la semana
    const dayIndices = [0, 1, 2, 3, 4]; // Índices para lunes a viernes
    for (const dayIndex of dayIndices) {
        await autoAssignCaroSandraGabiByDay(apiUrl, dayIndex);
        await autoAssignPublicHospitalsByDay(apiUrl, dayIndex);
        await countAssignmentsByDay(dayIndex);
    }

    await compareAvailabilities();

    const autoAssignButton = document.getElementById('autoAssign-button');

    autoAssignButton.addEventListener('click', async () => {
        const isValid = await validateAllDays();
        if (!isValid) return;
        
        const dayIndices = [0, 1, 2, 3, 4]; // Índices para lunes a viernes
        for (const dayIndex of dayIndices) {
            await handleRandomizeButtonClick(apiUrl, dayIndex);
        }
        console.log('Asignaciones completadas para todos los días de la semana');
    });

    function updateWeekDates() {
        const currentDate = new Date();
        const currentDay = currentDate.getDay();
        let nextMondayDate;
    
        if (currentDay === 6) { // Si hoy es sábado
            // Calcular el próximo lunes
            nextMondayDate = new Date(currentDate);
            nextMondayDate.setDate(currentDate.getDate() + (8 - currentDay));
        } else {
            // Calcular el lunes de esta semana
            nextMondayDate = new Date(currentDate);
            nextMondayDate.setDate(currentDate.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
        }
    
        const dateOptions = { day: 'numeric' };
    
        function createRandomizeButton(dayId, dayIndex) {
            const button = document.createElement('button');
            button.innerText = '🔄';
            button.classList.add('randomize-button');
            button.addEventListener('click', async () => {
                await handleRandomizeButtonClick(apiUrl, dayIndex);
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
            const response = await fetch(`${apiUrl}/auth/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const users = await response.json();
                const selects = document.querySelectorAll('select');

                selects.forEach(select => {
                    const workSite = select.closest('tr').querySelector('.work-site').innerText;
                    const dayIndex = select.closest('td').cellIndex - 1;
                    const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayIndex];
                    const dayHeaderText = document.getElementById(dayHeaderId).innerText;
                    const dayDateParts = dayHeaderText.match(/\d+/g);

                    if (dayDateParts && dayDateParts.length === 1) {
                        const dayOfMonth = dayDateParts[0];
                        const month = new Date().getMonth() + 1;
                        const year = new Date().getFullYear();
                        const dayDate = new Date(`${year}-${month}-${dayOfMonth}`);

                        select.innerHTML = '<option value="">Select user</option>';

                        users.forEach(user => {
                            const onVacation = user.vacations.some(vacation => {
                                const start = new Date(vacation.startDate);
                                const end = new Date(vacation.endDate);
                                return dayDate >= start && dayDate <= end;
                            });

                            if (onVacation) return;

                            const dayName = dayHeaderId.split('-')[0];
                            if (user.workSchedule[dayName] === 'No trabaja') return;
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

                            if (workSite.includes('Fundación Q1') || workSite.includes('Fundación Hemo')) {
                                if (user.doesCardio) {
                                    const option = document.createElement('option');
                                    option.value = user._id;
                                    option.textContent = user.username;
                                    select.appendChild(option);
                                }
                            } else if (workSite.includes('Fundación RNM TAC') || workSite.includes('COI')) {
                                if (user.doesRNM) {
                                    const option = document.createElement('option');
                                    option.value = user._id;
                                    option.textContent = user.username;
                                    select.appendChild(option);
                                }
                            } else {
                                const option = document.createElement('option');
                                option.value = user._id;
                                option.textContent = user.username;
                                select.appendChild(option);
                            }
                        });
                    }
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
            button.addEventListener('click', () => {
                select.disabled = !select.disabled;
                button.textContent = select.disabled ? '🔓' : '🔒';
                countEnabledSelectsByDay();
            });
            cell.appendChild(button);
        });
    }

    function handleSelectChange(event) {
        const select = event.target;
        const selectedUserId = select.value;
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
                select.value = '';
            }
        }
    
        if (select.value === '') {
            select.classList.add('default');
            select.classList.remove('assigned');
        } else {
            select.classList.add('assigned');
            select.classList.remove('default');
        }
    }        

    document.querySelectorAll('select').forEach(select => {
        select.classList.add('default');
        select.addEventListener('change', handleSelectChange);
    });
});
