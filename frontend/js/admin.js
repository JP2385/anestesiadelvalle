document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    const userSelect = document.getElementById('user-select');
    const adminForm = document.getElementById('admin-form');
    const vacationList = document.getElementById('vacation-list');
    const addVacationButton = document.getElementById('add-vacation');
    const beginningDateElement = document.getElementById('beginningDate');
    
    // Inicializar Flatpickr y almacenar la instancia
    const vacationRangeInput = document.getElementById('vacation-range');
    const flatpickrInstance = flatpickr(vacationRangeInput, {
        locale: "es", // Cambiar a español
        mode: "range", // Modo de rango de fechas
        dateFormat: "d-m-y", // Formato visible de la fecha
        minDate: "today", // No permitir fechas pasadas
        onChange: function(selectedDates) {
            // Extraer las fechas de inicio y fin
            const [startDate, endDate] = selectedDates;

            // Asignar las fechas a los campos ocultos
            document.getElementById('vacation-start').value = startDate ? startDate.toISOString().split('T')[0] : '';
            document.getElementById('vacation-end').value = endDate ? endDate.toISOString().split('T')[0] : '';
        }
    });

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
        users.sort((a, b) => a.username.localeCompare(b.username));

        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user._id;
            option.textContent = `${user.username} (${user.email})`;
            userSelect.appendChild(option);
        });

        if (users.length > 0) {
            userSelect.value = users[0]._id;
            loadUserData(users[0]._id);
        }
    })
    .catch(error => {
        alert('Hubo un problema al obtener la lista de usuarios: ' + error.message);
    });

    userSelect.addEventListener('change', () => {
        const userId = userSelect.value;
        if (userId) {
            loadUserData(userId);
        }
    });

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
        const startDate = document.getElementById('vacation-start').value;
        const endDate = document.getElementById('vacation-end').value;

        if (!startDate || !endDate) {
            alert('Por favor, selecciona un rango de fechas válido.');
            return;
        }

        // Crear un nuevo elemento de la lista de vacaciones con inputs tipo "date"
        const vacationItem = document.createElement('li');
        vacationItem.innerHTML = `
            Del <input type="date" class="vacation-start" value="${startDate}"> 
            al <input type="date" class="vacation-end" value="${endDate}">
            <button class="delete-vacation">❌</button>
        `;

        // Añadir la funcionalidad para eliminar el elemento
        vacationItem.querySelector('.delete-vacation').addEventListener('click', () => vacationItem.remove());

         // Agregar el nuevo elemento al principio de la lista de vacaciones
         if (vacationList.firstChild) {
            vacationList.insertBefore(vacationItem, vacationList.firstChild);
        } else {
            vacationList.appendChild(vacationItem);  // Si la lista está vacía
        }        

        // Limpiar el input de rango visible y los campos ocultos
        document.getElementById('vacation-range').value = '';
        document.getElementById('vacation-start').value = '';
        document.getElementById('vacation-end').value = '';
        flatpickrInstance.clear(); // Restablecer el calendario de Flatpickr
        });

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
                    document.getElementById('doesCardio').checked = user.doesCardio;
                    document.getElementById('doesPediatrics').checked = user.doesPediatrics;
                    document.getElementById('doesRNM').checked = user.doesRNM;
                    document.getElementById('worksInPublicNeuquen').checked = user.worksInPublicNeuquen;
                    document.getElementById('worksInPrivateNeuquen').checked = user.worksInPrivateNeuquen;
                    document.getElementById('worksInPublicRioNegro').checked = user.worksInPublicRioNegro;
                    document.getElementById('worksInPrivateRioNegro').checked = user.worksInPrivateRioNegro;
                    document.getElementById('worksInCmacOnly').checked = user.worksInCmacOnly;
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
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message}`);
                }
            } catch (error) {
                alert('Hubo un problema con la solicitud: ' + error.message);
            }
        }        
});
