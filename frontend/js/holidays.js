document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    const holidayList = document.getElementById('holiday-list');
    const addHolidayButton = document.getElementById('add-holiday');
    const holidayNameInput = document.getElementById('holiday-name');
    const startDateInput = document.getElementById('holiday-start');
    const endDateInput = document.getElementById('holiday-end');
    const userSelect = document.getElementById('holiday-users');

    // Obtener la lista de feriados
    fetch(`${apiUrl}/holidays`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(response => response.json())
    .then(holidays => {
        holidays.forEach(holiday => displayHoliday(holiday));
    })
    .catch(error => {
        alert('Hubo un problema al obtener la lista de feriados: ' + error.message);
    });

    // Obtener y poblar el select de usuarios
    fetchUsers(apiUrl, populateUserSelect);

    function populateUserSelect(users) {
        if (!userSelect) return;
        userSelect.innerHTML = '';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user._id;
            option.textContent = user.username;
            userSelect.appendChild(option);
        });
    }

    // Agregar un nuevo feriado
    addHolidayButton.addEventListener('click', () => {
        const holidayName = holidayNameInput.value;
        const startDateUTC = new Date(startDateInput.value).toISOString();
        const endDateUTC = new Date(endDateInput.value).toISOString();

        if (!holidayName || !startDateUTC || !endDateUTC) {
            alert('Por favor completa todos los campos.');
            return;
        }

        const newHoliday = { name: holidayName, startDate: startDateUTC, endDate: endDateUTC, users: [] };

        fetch(`${apiUrl}/holidays`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(newHoliday)
        })
        .then(response => response.json())
        .then(createdHoliday => {
            displayHoliday(createdHoliday);
            holidayNameInput.value = '';
            startDateInput.value = '';
            endDateInput.value = '';
        })
        .catch(error => {
            alert('Hubo un problema al agregar el feriado: ' + error.message);
        });
    });

    // Función para mostrar un feriado en la lista con opciones de actualización y usuarios
    function displayHoliday(holiday) {
        const holidayItem = document.createElement('li');
        
        // Contenedor para usuarios asignados
        const userContainer = document.createElement('div');
        userContainer.innerHTML = `<strong>Usuarios asignados:</strong>`;
        const userList = document.createElement('ul');
        userContainer.appendChild(userList);

            // Botón para eliminar el feriado
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '❌';
        deleteButton.title = 'Eliminar Feriado';
        deleteButton.classList.add('delete-holiday');

        deleteButton.addEventListener('click', (event) => {
            event.preventDefault(); // Evita que el formulario se envíe y recargue la página
            deleteHoliday(holiday._id, holidayItem);
        });
        

        // Botón para actualizar el feriado
        const updateButton = document.createElement('button');
        updateButton.innerHTML = '🔄';
        updateButton.title = 'Actualizar Feriado';
        updateButton.classList.add('update-holiday');

        updateButton.addEventListener('click', (event) => {
            event.preventDefault(); // ✅ Evita que el formulario se envíe y la página se recargue
            updateHoliday(holiday, holidayItem);
        });


        // Contenedor para seleccionar y agregar usuarios
        const userSelectionDiv = document.createElement('div');
        const userSelection = document.createElement('select');
        userSelection.innerHTML = userSelect.innerHTML; // Copia las opciones de usuario
        const addUserButton = document.createElement('button');
        addUserButton.textContent = '➕';

        addUserButton.addEventListener('click', (event) => {
            event.preventDefault(); // Evita que el formulario se envíe y recargue la página
        
            const selectedUserId = userSelection.value;
            if (!selectedUserId) return;
        
            // Verificar si el usuario ya está agregado
            if (Array.from(userList.children).some(li => li.dataset.userId === selectedUserId)) return;
        
            const selectedOption = userSelection.options[userSelection.selectedIndex];
            const userItem = document.createElement('li');
            userItem.dataset.userId = selectedUserId;
            userItem.textContent = selectedOption.text;
        
            // Botón de eliminación para usuarios agregados
            const removeUserButton = document.createElement('button');
            removeUserButton.textContent = '❌';
            removeUserButton.addEventListener('click', () => {
                userList.removeChild(userItem);
            });
        
            userItem.appendChild(removeUserButton);
            userList.appendChild(userItem);
        });
        

        userSelectionDiv.appendChild(userSelection);
        userSelectionDiv.appendChild(addUserButton);

        holidayItem.innerHTML = `
            <div>
                <strong>${holiday.name}:</strong>
                del <input type="date" class="holiday-start" value="${new Date(holiday.startDate).toISOString().split('T')[0]}"> 
                al <input type="date" class="holiday-end" value="${new Date(holiday.endDate).toISOString().split('T')[0]}">
            </div>
        `;

        holiday.users.forEach(user => {
            const userItem = document.createElement('li');
            userItem.dataset.userId = user._id;
            userItem.textContent = user.username;

            const removeUserButton = document.createElement('button');
            removeUserButton.textContent = '❌';
            removeUserButton.addEventListener('click', () => {
                userList.removeChild(userItem);
            });

            userItem.appendChild(removeUserButton);
            userList.appendChild(userItem);
        });
        holidayItem.appendChild(userSelectionDiv);
        holidayItem.appendChild(userContainer);
        holidayItem.appendChild(deleteButton);
        holidayItem.appendChild(updateButton);
        holidayList.appendChild(holidayItem);
    }

    function updateHoliday(holiday, holidayItem) {
        const updatedName = holidayItem.querySelector('strong').textContent;
        const updatedStartDate = new Date(holidayItem.querySelector('.holiday-start').value).toISOString();
        const updatedEndDate = new Date(holidayItem.querySelector('.holiday-end').value).toISOString();
        const updatedUsers = Array.from(holidayItem.querySelectorAll('ul li')).map(li => li.dataset.userId);
    
        const updatedHoliday = {
            name: updatedName,
            startDate: updatedStartDate,
            endDate: updatedEndDate,
            users: updatedUsers
        };
    
        fetch(`${apiUrl}/holidays/${holiday._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(updatedHoliday)
        })
        .then(response => {
            console.log('Respuesta de actualización:', response); // ✅ Verificar si la respuesta es válida
    
            if (!response.ok) {
                throw new Error(`Error al actualizar el feriado: ${response.status}`);
            }
    
            // ⚠️ Si el backend responde con 204 No Content, evitar llamar a .json()
            return response.status === 204 ? {} : response.json();
        })
        .then(data => {
            console.log('Feriado actualizado correctamente:', data); // ✅ Verificar datos en consola
            alert('Feriado actualizado correctamente.');
        })
        .catch(error => {
            console.error('Hubo un problema al actualizar el feriado:', error);
            alert('Hubo un problema al actualizar el feriado: ' + error.message);
        });
    }
    
    
    function deleteHoliday(holidayId, holidayItem) {
        fetch(`${apiUrl}/holidays/${holidayId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        })
        .then(response => {
            console.log('Respuesta de eliminación:', response); // ✅ Verifica respuesta en consola
            if (!response.ok) {
                throw new Error(`Error al eliminar el feriado: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Feriado eliminado correctamente:', data); // ✅ Verifica si se eliminó correctamente
            holidayItem.remove(); // ✅ Eliminar el elemento del DOM antes del alert
            alert('Feriado eliminado correctamente.');
        })
        .catch(error => {
            console.error('Hubo un problema al eliminar el feriado:', error);
            alert('Hubo un problema al eliminar el feriado: ' + error.message);
        });
    }
       
     
});

// Función fetchUsers
function fetchUsers(apiUrl, callback) {
    fetch(`${apiUrl}/auth/users`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(response => response.json())
    .then(users => {
        if (Array.isArray(users)) {
            callback(users);
        } else {
            throw new Error('La API no devolvió una lista de usuarios válida.');
        }
    })
    .catch(error => {
        console.error('Hubo un problema al obtener la lista de usuarios:', error.message);
    });
}
