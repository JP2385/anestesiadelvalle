document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    const userSelect = document.getElementById('user-select');
    const adminForm = document.getElementById('admin-form');
    const vacationList = document.getElementById('vacation-list');
    const addVacationButton = document.getElementById('add-vacation');
    const beginningDateElement= document.getElementById('beginningDate');

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
            alert('Por favor, ingresa ambas fechas de inicio y fin.');
            return;
        }
    
        const vacationItem = document.createElement('li');
        vacationItem.innerHTML = `
            Del <input type="date" class="vacation-start" value="${startDate}"> 
            al <input type="date" class="vacation-end" value="${endDate}">
            <button class="delete-vacation">❌</button>
        `;
    
        vacationItem.querySelector('.delete-vacation').addEventListener('click', () => vacationItem.remove());
    
        // Insertar el nuevo elemento al principio de la lista
        vacationList.insertBefore(vacationItem, vacationList.firstChild);
    
        // Limitar la visibilidad a 6 elementos
        const vacationItems = Array.from(vacationList.children);
        if (vacationItems.length > 6) {
            vacationItems.slice(6).forEach(item => {
                item.style.display = 'none'; // Ocultar los elementos adicionales
            });
        }
    
        // Clear input fields
        document.getElementById('vacation-start').value = '';
        document.getElementById('vacation-end').value = '';
    });
    

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
