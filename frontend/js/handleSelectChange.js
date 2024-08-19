import { compareAvailabilitiesForEachDay } from './compareArrays.js';
import { autoAssignReportBgColorsUpdate } from './autoAssignReportBgColorsUpdate.js';


export async function handleSelectChange(event) {
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
        select.classList.remove('option-morning', 'option-afternoon', 'option-long', 'default', 'assigned');

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