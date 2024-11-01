import { shiftAssignmentLabels } from './shiftLabels.js';

document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';
    const shiftsAssignmentsContainer = document.getElementById('shifts-assignments');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const currentYearMonth = new Date().toISOString().slice(0, 7); // Obtener año-mes actual en formato "YYYY-MM"

    if (!shiftsAssignmentsContainer) {
        console.error("No se encontró el contenedor 'shifts-assignments'. Verifique el HTML.");
        return;
    }

    // Obtener el perfil del usuario actual
    fetch(`${apiUrl}/auth/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(`Error: ${data.message}`);
            window.location.href = 'login.html';
        } else {
            const currentUser = data.username;

            // Obtener el cronograma de guardias del mes para el usuario actual
            fetch(`${apiUrl}/shift-schedule/${currentYearMonth}`)
                .then(response => response.json())
                .then(schedule => {
                    const shiftSchedule = schedule.shiftSchedule || [];
                    const printedBy = schedule.printedBy || 'Desconocido';
                    const createdAt = schedule.createdAt || new Date().toISOString();

                    // Encontrar las asignaciones de guardia del usuario actual
                    const userShiftsData = shiftSchedule.find(user => user.username === currentUser);
                
                    if (userShiftsData && Array.isArray(userShiftsData.shifts) && userShiftsData.shifts.length > 0) {
                        const sortedAssignments = userShiftsData.shifts
                            .filter(shift => !shift.isDisabled) // Excluir asignaciones deshabilitadas
                            .sort((a, b) => new Date(a.day) - new Date(b.day)); // Ordenar por fecha


                        // Generar y añadir la lista de asignaciones
                        const shiftsAssignmentList = generateShiftList(sortedAssignments);
                        shiftsAssignmentsContainer.innerHTML = '';  // Limpiar contenedor antes de añadir la lista
                        shiftsAssignmentsContainer.appendChild(shiftsAssignmentList);

                        // Crear el mensaje de generación
                        const generationMessage = createGenerationMessage(createdAt, printedBy);
                        shiftsAssignmentsContainer.appendChild(generationMessage);

                        
                    } else if (shiftsAssignmentsContainer) {
                        shiftsAssignmentsContainer.innerHTML = '';  // Limpiar contenedor
                        shiftsAssignmentsContainer.textContent = 'No tienes asignaciones de guardia para este mes.';
                    }
                })
                .catch(error => {
                    alert('Hubo un problema al obtener el último schedule: ' + error.message);
                });
        }
    })
    .catch(error => {
        alert('Hubo un problema con la solicitud: ' + error.message);
        window.location.href = 'login.html';
    });
});

// Crear mensaje de generación
function createGenerationMessage(createdAt, printedBy) {
    const messageDiv = document.createElement('div');
    const formattedTimestamp = formatTimestamp(createdAt);
    messageDiv.textContent = `Programación generada el ${formattedTimestamp} por ${printedBy}`;
    messageDiv.className = 'timestamp';
    return messageDiv;
}

// Generar lista de asignaciones de guardia
function generateShiftList(userShifts) {
    const list = document.createElement('ul');

    if (!Array.isArray(userShifts) || userShifts.length === 0) {
        const listItem = document.createElement('li');
        listItem.textContent = 'No tienes asignaciones de guardia disponibles.';
        list.appendChild(listItem);
        return list;
    }

    userShifts.forEach(shift => {
        const listItem = document.createElement('li');
        
        // Formatear solo el día y la fecha corregida
        const formattedDate = formatDate(shift.day);
        
        // Obtener la descripción completa de la asignación
        const assignmentLabel = shiftAssignmentLabels[shift.assignment] || shift.assignment;

        listItem.textContent = `${formattedDate}: ${assignmentLabel}`;
        list.appendChild(listItem);
    });

    return list;
}

// Formatear fecha para la lista de guardias
function formatDate(dateString) {
    const date = new Date(dateString);

    date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); // Compensar zona horaria

    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    let formattedDate = date.toLocaleDateString('es-ES', options);

    formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    // Quitar la coma y asegurar el espacio después del día de la semana
    return formattedDate.replace(',', '').replace(/(\w+)(\s)(\d)/, '$1 $3').replace(' de ', ' de ');
}


// Formatear el timestamp para el mensaje de generación
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let formattedDate = date.toLocaleDateString('es-ES', options);

    formattedDate = formattedDate.replace(/,\s/, ' ');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${formattedDate} a las ${hours}:${minutes} hs.`;
}
