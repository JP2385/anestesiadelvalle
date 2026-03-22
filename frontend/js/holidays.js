import { fetchVacations } from './fetchVacations.js'; // ✅ Importa la función para obtener vacaciones
import toast from './toast.js';

document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;

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
            'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
        }
    })
    .then(response => response.json())
    .then(holidays => {
        holidays.forEach(holiday => displayHoliday(holiday));
    })
    .catch(error => {
        toast.error('Hubo un problema al obtener la lista de feriados: ' + error.message);
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
            toast.warning('Por favor completa todos los campos.');
            return;
        }

        const newHoliday = { name: holidayName, startDate: startDateUTC, endDate: endDateUTC, users: [] };

        fetch(`${apiUrl}/holidays`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
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
            toast.error('Hubo un problema al agregar el feriado: ' + error.message);
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
        holidayItem.appendChild(deleteButton);
        holidayItem.appendChild(updateButton);
        holidayList.appendChild(holidayItem);
    }

    async function updateHoliday(holiday, holidayItem) {
        const updatedName = holidayItem.querySelector('strong').textContent;
        const updatedStartDate = new Date(holidayItem.querySelector('.holiday-start').value).toISOString();
        const updatedEndDate = new Date(holidayItem.querySelector('.holiday-end').value).toISOString();
        const updatedUsers = Array.from(holidayItem.querySelectorAll('ul li')).map(li => li.dataset.userId);
    
        try {
            // ✅ Obtener todas las vacaciones
            const vacations = await fetchVacations(); // Asegúrate de que fetchVacations ya está disponible
            const usersResponse = await fetch(`${apiUrl}/auth/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
                }
            });
    
            if (!usersResponse.ok) {
                throw new Error('Error al obtener los usuarios.');
            }
    
            const users = await usersResponse.json(); // ✅ Obtiene la lista de usuarios con sus usernames
    
            // ✅ Verificar si algún usuario tiene vacaciones en el rango del feriado
            const usersOnVacation = updatedUsers.filter(userId => {
                const userVacation = vacations.find(vac => vac._id === userId);
                if (!userVacation) return false;
    
                return userVacation.vacations.some(vacation => 
                    (new Date(updatedStartDate) <= new Date(vacation.endDate) && new Date(updatedEndDate) >= new Date(vacation.startDate))
                );
            });
    
            if (usersOnVacation.length > 0) {
                // ✅ Convertir IDs en usernames para el mensaje de error
                const usernamesOnVacation = users
                    .filter(user => usersOnVacation.includes(user._id)) // Filtrar solo los usuarios en vacaciones
                    .map(user => user.username) // Obtener sus usernames
    
                toast.warning(`No puedes asignar este feriado a los siguientes usuarios porque están de vacaciones: ${usernamesOnVacation.join(', ')}`);
                return;
            }
    
            // ✅ Proceder con la actualización
            const response = await fetch(`${apiUrl}/holidays/${holiday._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
                },
                body: JSON.stringify({
                    name: updatedName,
                    startDate: updatedStartDate,
                    endDate: updatedEndDate,
                    users: updatedUsers
                })
            });
    
            console.log('Respuesta de actualización:', response);
    
            if (!response.ok) {
                throw new Error(`Error al actualizar el feriado: ${response.status}`);
            }
    
            const data = response.status === 204 ? {} : await response.json();
            console.log('Feriado actualizado correctamente:', data);
            toast.success('Feriado actualizado correctamente.');
        } catch (error) {
            console.error('Hubo un problema al actualizar el feriado:', error);
            toast.error('Hubo un problema al actualizar el feriado: ' + error.message);
        }
    }
    
    function deleteHoliday(holidayId, holidayItem) {
        fetch(`${apiUrl}/holidays/${holidayId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
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
            holidayItem.remove(); // ✅ Eliminar el elemento del DOM antes del toast
            toast.success('Feriado eliminado correctamente.');
        })
        .catch(error => {
            console.error('Hubo un problema al eliminar el feriado:', error);
            toast.error('Hubo un problema al eliminar el feriado: ' + error.message);
        });
    }
       
     
});

// Función fetchUsers
function fetchUsers(apiUrl, callback) {
    fetch(`${apiUrl}/auth/users`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
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
