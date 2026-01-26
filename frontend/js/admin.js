import { validateStartDate, validateEndDate } from './vacationSwapUtils.js'; // Asegúrate de importar las funciones correctamente

document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adelvalle-88dd0d34d7bd.herokuapp.com/';

    const userSelect = document.getElementById('user-select');
    const adminForm = document.getElementById('admin-form');
    const vacationList = document.getElementById('vacation-list');
    const addVacationButton = document.getElementById('add-vacation');
    const beginningDateElement = document.getElementById('beginningDate');
    const otherLeavesList = document.getElementById('other-leaves-list');
    const addOtherLeaveButton = document.getElementById('add-other-leave');
    const otherLeaveStartInput = document.getElementById('other-leave-start');
    const otherLeaveEndInput = document.getElementById('other-leave-end');
    const otherLeaveTypeSelect = document.getElementById('other-leave-type');
    const otherLeaveCustomTypeGroup = document.getElementById('other-leave-custom-type-group');

    // Nuevo campo para el número de teléfono
    const phoneNumberInput = document.createElement('phoneNumber');
    // Añadirlo al contenedor del formulario en el DOM
    beginningDateElement.parentNode.appendChild(phoneNumberInput)
    const submitButton = adminForm.querySelector('button[type="submit"]'); // Botón de envío

    // Obtener la lista de usuarios
    fetch(`${apiUrl}/auth/users`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
        .then(response => response.json())
        .then(users => {
            // Ordenar usuarios alfabéticamente por nombre de usuario
            users.sort((a, b) => a.username.localeCompare(b.username));

            // Crear las opciones para el select
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user._id;
                option.textContent = `${user.username} (${user.email})`;
                userSelect.appendChild(option);
            });

            // Seleccionar el primer usuario en la lista y cargar sus datos
            if (users.length > 0) {
                userSelect.value = users[0]._id;
                loadUserData(users[0]._id);
            }
        })
        .catch(error => {
            alert('Hubo un problema al obtener la lista de usuarios: ' + error.message);
        });

    // Manejar la selección de usuario
    userSelect.addEventListener('change', () => {
        const userId = userSelect.value;
        if (userId) {
            loadUserData(userId);
        }
    });

    // Adjuntar eventos de cambio a los inputs de fecha para validar al seleccionar fechas
    const startDateInput = document.getElementById('vacation-start');
    const endDateInput = document.getElementById('vacation-end');

    startDateInput.addEventListener('change', () => {
        // Validar la fecha de inicio
        validateStartDate(startDateInput, endDateInput, submitButton, handleDateChange);
        endDateInput.min = startDateInput.value;
        endDateInput.focus();
    });

    endDateInput.addEventListener('change', () => {
        validateEndDate(startDateInput, endDateInput, submitButton, handleDateChange);
    });

    // Manejar el formulario de administración
    adminForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userId = userSelect.value;
        const updates = {
            doesCardio: document.getElementById('doesCardio').checked,
            doesPediatrics: document.getElementById('doesPediatrics').checked,
            doesRNM: document.getElementById('doesRNM').checked,
            worksInPublicNeuquen: document.getElementById('worksInPublicNeuquen').checked,
            worksInPrivateNeuquen: document.getElementById('worksInPrivateNeuquen').checked,
            worksInPublicRioNegro: document.getElementById('worksInPublicRioNegro').checked,
            worksInPrivateRioNegro: document.getElementById('worksInPrivateRioNegro').checked,
            worksInCmacOnly: document.getElementById('worksInCmacOnly').checked,
            doesShifts: document.getElementById('doesShifts').checked,
            phoneNumber: document.getElementById('phoneNumber').value, // Nuevo campo agregado
            workSchedule: {
                monday: document.getElementById('workSchedule-monday').value,
                tuesday: document.getElementById('workSchedule-tuesday').value,
                wednesday: document.getElementById('workSchedule-wednesday').value,
                thursday: document.getElementById('workSchedule-thursday').value,
                friday: document.getElementById('workSchedule-friday').value
            },
            vacations: Array.from(vacationList.children).map(item => ({
                startDate: item.querySelector('.vacation-start').value,
                endDate: item.querySelector('.vacation-end').value
            })),
            otherLeaves: Array.from(otherLeavesList.children).map(item => ({
                type: item.querySelector('.leave-type')?.value || '',
                startDate: item.querySelector('.leave-start').value,
                endDate: item.querySelector('.leave-end').value
            }))
        };

        try {
            const response = await fetch(`${apiUrl}/auth/user/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                alert('Usuario actualizado exitosamente.');
                window.location.reload();
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            alert('Hubo un problema con la solicitud: ' + error.message);
        }
    });

    // Manejar la adición de vacaciones
    addVacationButton.addEventListener('click', () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        // Validar la fecha de inicio y fin antes de añadir vacaciones
        validateStartDate(startDateInput, endDateInput, submitButton, handleDateChange);
        validateEndDate(startDateInput, endDateInput, submitButton, handleDateChange);

        if (!startDate || !endDate) {
            alert('Por favor, ingresa ambas fechas de inicio y fin.');
            return;
        }

        // Crear un nuevo elemento de la lista de vacaciones con inputs tipo "date"
        const vacationItem = document.createElement('li');
        vacationItem.innerHTML = `
            Del <input type="date" class="vacation-start" value="${startDate}"> 
            al <input type="date" class="vacation-end" value="${endDate}">
            <button class="delete-vacation">❌</button>
        `;

        vacationItem.querySelector('.delete-vacation').addEventListener('click', () => vacationItem.remove());

        // Insertar el nuevo elemento al principio de la lista
        vacationList.insertBefore(vacationItem, vacationList.firstChild);

        // Limpiar los campos de fecha
        startDateInput.value = '';
        endDateInput.value = '';
    });

    addOtherLeaveButton.addEventListener('click', () => {
        const startDate = otherLeaveStartInput.value;
        const endDate = otherLeaveEndInput.value;
        const selectedType = otherLeaveTypeSelect.value;
        const customType = document.getElementById('other-leave-custom-type').value;
        const leaveType = selectedType === 'Otro' ? customType : selectedType;

        if (!startDate || !endDate || !leaveType) {
            alert('Por favor, complete las fechas y seleccione un concepto.');
            return;
        }

        const leaveItem = document.createElement('li');
        leaveItem.innerHTML = `
            <strong>${leaveType}:</strong>
            Del <input type="date" class="leave-start" value="${startDate}">
            al <input type="date" class="leave-end" value="${endDate}">
            <input type="hidden" class="leave-type" value="${leaveType}">
            <button class="delete-leave">❌</button>
        `;

        leaveItem.querySelector('.delete-leave').addEventListener('click', () => leaveItem.remove());

        otherLeavesList.insertBefore(leaveItem, otherLeavesList.firstChild);

        // Limpiar inputs
        otherLeaveStartInput.value = '';
        otherLeaveEndInput.value = '';
        otherLeaveTypeSelect.value = '';
        document.getElementById('other-leave-custom-type').value = '';
        otherLeaveCustomTypeGroup.style.display = 'none';
    });

    
    otherLeaveTypeSelect.addEventListener('change', () => {
        if (otherLeaveTypeSelect.value === 'Otro') {
            otherLeaveCustomTypeGroup.style.display = 'block';
        } else {
            otherLeaveCustomTypeGroup.style.display = 'none';
            document.getElementById('other-leave-custom-type').value = '';
        }
    });

    // Función para manejar el cambio de fechas y realizar otras acciones si es necesario
    function handleDateChange() {
        // Aquí puedes agregar lógica adicional después de cambiar las fechas
        console.log('Las fechas han cambiado.');
    }

    // Función para cargar los datos del usuario seleccionado
    async function loadUserData(userId) {
        try {
            const response = await fetch(`${apiUrl}/auth/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const user = await response.json();
                // Cargar el número de teléfono si está disponible
                document.getElementById('phoneNumber').value = user.phoneNumber || '';

                // Cargar el rol del usuario
                document.getElementById('userRole').value = user.role || 'user';

                document.getElementById('doesCardio').checked = user.doesCardio;
                document.getElementById('doesPediatrics').checked = user.doesPediatrics;
                document.getElementById('doesRNM').checked = user.doesRNM;
                document.getElementById('worksInPublicNeuquen').checked = user.worksInPublicNeuquen;
                document.getElementById('worksInPrivateNeuquen').checked = user.worksInPrivateNeuquen;
                document.getElementById('worksInPublicRioNegro').checked = user.worksInPublicRioNegro;
                document.getElementById('worksInPrivateRioNegro').checked = user.worksInPrivateRioNegro;
                document.getElementById('worksInCmacOnly').checked = user.worksInCmacOnly;
                document.getElementById('doesShifts').checked = user.doesShifts;
                document.getElementById('workSchedule-monday').value = user.workSchedule.monday || 'No trabaja';
                document.getElementById('workSchedule-tuesday').value = user.workSchedule.tuesday || 'No trabaja';
                document.getElementById('workSchedule-wednesday').value = user.workSchedule.wednesday || 'No trabaja';
                document.getElementById('workSchedule-thursday').value = user.workSchedule.thursday || 'No trabaja';
                document.getElementById('workSchedule-friday').value = user.workSchedule.friday || 'No trabaja';

                if (user.beginningDate) {
                    const correctedDate = new Date(new Date(user.beginningDate).getTime() + 3 * 60 * 60 * 1000);
                    const formattedDate = correctedDate.toLocaleDateString('es-ES');
                    beginningDateElement.textContent = formattedDate;
                } else {
                    beginningDateElement.textContent = 'No disponible';
                }

                // Limpiar la lista actual de vacaciones
                vacationList.innerHTML = '';

                // Ordenar vacaciones de más reciente a más antiguo según la fecha de inicio
                user.vacations.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

                // Mostrar las vacaciones en la lista, de más nuevo a más antiguo
                user.vacations.forEach(vacation => {
                    const vacationItem = document.createElement('li');
                    vacationItem.innerHTML = `
                        Del <input type="date" class="vacation-start" value="${new Date(vacation.startDate).toISOString().split('T')[0]}"> 
                        al <input type="date" class="vacation-end" value="${new Date(vacation.endDate).toISOString().split('T')[0]}">
                        <button class="delete-vacation">❌</button>
                    `;

                    vacationItem.querySelector('.delete-vacation').addEventListener('click', () => vacationItem.remove());

                    vacationList.appendChild(vacationItem);
                });

                otherLeavesList.innerHTML = '';

                    (user.otherLeaves || []).sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).forEach(leave => {
                        const leaveItem = document.createElement('li');
                    leaveItem.innerHTML = `
                        <strong>${leave.type || 'Licencia'}:</strong>
                        Del <input type="date" class="leave-start" value="${new Date(leave.startDate).toISOString().split('T')[0]}">
                        al <input type="date" class="leave-end" value="${new Date(leave.endDate).toISOString().split('T')[0]}">
                        <input type="hidden" class="leave-type" value="${leave.type || ''}">
                        <button class="delete-leave">❌</button>
                    `;

                        leaveItem.querySelector('.delete-leave').addEventListener('click', () => leaveItem.remove());

                        otherLeavesList.appendChild(leaveItem);
                    });

            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            alert('Hubo un problema con la solicitud: ' + error.message);
        }
    }

    // Botón para actualizar rol
    document.getElementById('update-role-btn').addEventListener('click', async () => {
        const userId = userSelect.value;
        const newRole = document.getElementById('userRole').value;

        if (!userId) {
            alert('Por favor selecciona un usuario');
            return;
        }

        if (confirm(`¿Estás seguro de cambiar el rol de este usuario a "${newRole === 'admin' ? 'Administrador' : 'Usuario'}"?`)) {
            try {
                const response = await fetch(`${apiUrl}/users/${userId}/role`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify({ newRole: newRole })
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Rol actualizado correctamente');
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message}`);
                }
            } catch (error) {
                alert('Hubo un problema al actualizar el rol: ' + error.message);
            }
        }
    });
});
