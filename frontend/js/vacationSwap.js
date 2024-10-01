    import { fetchVacations } from './fetchVacations.js';  // Asegúrate de que la ruta sea correcta

    document.addEventListener('DOMContentLoaded', async () => {
        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const periodsToGiveSelect = document.getElementById('periodsToGive');
        const userList = document.getElementById('user-list');
        const form = document.getElementById('swap-request-form');
        const messageInput = document.getElementById('message');
        const submitButton = form.querySelector('button[type="submit"]');  // Botón de envío
        
        let users = [];
        let currentUser = null;  // Declara currentUser en el ámbito superior

        try {
            // Obtener todas las vacaciones disponibles
            users = await fetchVacations();
        } catch (error) {
            console.error('Error fetching vacation data:', error);
        }

        // Escuchar cambios en las fechas solicitadas
        startDateInput.addEventListener('change', validateDates);
        endDateInput.addEventListener('change', validateDates);

        // Validar que la fecha de fin no sea anterior a la fecha de inicio
        function validateDates() {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);

            if (endDate < startDate) {
                alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
                endDateInput.value = '';  // Vaciar el campo de fecha de fin o establecerlo a un valor por defecto
                submitButton.disabled = true;  // Desactivar el botón de envío
            } else {
                submitButton.disabled = false;  // Activar el botón de envío
                handleDateChange();  // Llamar a la función de cambio de fecha si las fechas son válidas
            }
        }

        // Manejar la selección de fechas
        async function handleDateChange() {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;

            // Asegurarse de que currentUser esté inicializado
            if (!currentUser) {
                const currentUserResponse = await fetch(`${apiUrl}/auth/profile`, {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
                });
                currentUser = await currentUserResponse.json();
            }

            if (startDate && endDate) {
                // Filtrar los usuarios cuyas vacaciones cubren todo el rango solicitado
                const filteredUsers = filterUsersByDate(users, startDate, endDate);

                if (filteredUsers.length > 0) {
                    // Actualizar la lista de usuarios solo si hay usuarios relevantes
                    populateUserList(filteredUsers);
                    // Obtener y mostrar los períodos del usuario actual que puede ceder
                    await populatePeriodsToGive();
                }
            }
        }

        // Función para filtrar usuarios cuyas vacaciones cubren el rango solicitado
        function filterUsersByDate(users, startDate, endDate) {
            // Verificar si el currentUser ya posee este período
            const userHasPeriod = currentUser.vacations.some(vacation => {
                const vacationStart = new Date(vacation.startDate);
                const vacationEnd = new Date(vacation.endDate);
                return vacationStart <= new Date(startDate) && vacationEnd >= new Date(endDate);
            });

            if (userHasPeriod) {
                alert('Ya posees este período de vacaciones. No puedes solicitarlo.');
                resetDateInputs();
                return [];  // Retornar un array vacío para evitar mostrar usuarios
            }

            // Filtrar los usuarios que cubren el rango solicitado
            return users.filter(user => {
                return user.vacations.some(vacation => {
                    const vacationStart = new Date(vacation.startDate);
                    const vacationEnd = new Date(vacation.endDate);
                    return vacationStart <= new Date(startDate) && vacationEnd >= new Date(endDate);
                });
            });
        }

        // Función para restablecer los inputs de fecha
        function resetDateInputs() {
            startDateInput.value = '';  // Restablecer el campo de fecha de inicio
            endDateInput.value = '';  // Restablecer el campo de fecha de fin
            submitButton.disabled = true;  // Desactivar el botón de envío hasta que se seleccionen nuevas fechas
        }

        // Función para mostrar los usuarios en la lista
        function populateUserList(filteredUsers) {
            userList.innerHTML = ''; // Limpiar la lista de usuarios
            filteredUsers.forEach(user => {
                const li = document.createElement('li');
                li.textContent = user.username;
                userList.appendChild(li);
            });
        }

        // Función para dividir el período en semanas de sábado a domingo, con superposición
        function divideIntoWeeks(startDate, endDate, vacationId) {
            const weeks = [];
            let currentStart = new Date(startDate);
            const vacationEnd = new Date(endDate);
        
            // Comprobar si el período es exactamente el mismo que el solicitado
            if (startDate === endDate) {
                weeks.push({
                    weekId: vacationId,  // Usar el ID original si no hay fraccionamiento
                    startDate: currentStart,
                    endDate: vacationEnd
                });
                return weeks;  // Devolver el período sin dividirlo
            }
        
            // Si no es exactamente el mismo, dividir en semanas con superposición
            while (currentStart <= vacationEnd) {
                let currentEnd = new Date(currentStart);
                currentEnd.setDate(currentStart.getDate() + 8);  // Ajustar para el domingo de la semana
                
                // Ajustar si la semana final excede el final del período de vacaciones
                if (currentEnd > vacationEnd) {
                    currentEnd = vacationEnd;
                }
        
                // Solo agregar semanas de 2 días o más
                const daysInWeek = (currentEnd - currentStart) / (1000 * 60 * 60 * 24) + 1;  // Calcula la duración en días
                if (daysInWeek >= 3) {
                    weeks.push({
                        weekId: `${vacationId}-${weeks.length + 1}`,
                        startDate: new Date(currentStart),
                        endDate: new Date(currentEnd)
                    });
                }
        
                // Mover al siguiente sábado (7 días desde el inicio actual)
                currentStart.setDate(currentStart.getDate() + 7);
            }
        
            return weeks;
        }
        
        
        // Función modificada para obtener los períodos que el usuario actual puede ceder (solo en el futuro)
        // Función modificada para obtener los períodos que el usuario actual puede ceder (solo en el futuro)
async function populatePeriodsToGive() {
    const currentUserResponse = await fetch(`${apiUrl}/auth/profile`, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    });
    currentUser = await currentUserResponse.json();  // Asigna el valor a currentUser

    const today = new Date();  // Fecha actual en UTC
    const requestedStartDate = new Date(startDateInput.value);  // Fecha solicitada en UTC
    const requestedEndDate = new Date(endDateInput.value);      // Fecha solicitada en UTC
    const requestedDays = Math.round((requestedEndDate - requestedStartDate) / (1000 * 60 * 60 * 24)) + 1;  // Duración solicitada en días

    periodsToGiveSelect.innerHTML = ''; // Limpiar checkboxes anteriores

    console.log("Vacaciones actuales del usuario (en UTC):", currentUser.vacations);

    currentUser.vacations
        .filter(vacation => new Date(vacation.startDate).getTime() > today.getTime())  // Solo vacaciones futuras en UTC
        .forEach(vacation => {
            const vacationStart = new Date(vacation.startDate).toISOString();  // Forzar UTC
            const vacationEnd = new Date(vacation.endDate).toISOString();      // Forzar UTC
            const vacationDays = Math.round((new Date(vacationEnd) - new Date(vacationStart)) / (1000 * 60 * 60 * 24)) + 1;

            console.log("Periodo de vacaciones en UTC:", { vacationStart, vacationEnd, vacationDays });

            if (vacationDays <= requestedDays) {
                console.log("Periodo completo a ceder en UTC:", { vacationStart, vacationEnd });

                // Crear el div contenedor
                const divGroup = document.createElement('div');
                divGroup.classList.add('swap-input-group');  // Agregar la clase al div

                // Crear checkbox en lugar de opciones de select
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = JSON.stringify({ startDate: vacation.startDate, endDate: vacation.endDate });
                checkbox.id = `vacation-${vacation._id}`;

                const label = document.createElement('label');
                label.setAttribute('for', checkbox.id);

                // Mostrar las fechas en formato UTC (sin la parte de horas)
                label.textContent = `Del ${vacationStart.split('T')[0]} al ${vacationEnd.split('T')[0]}`;

                // Añadir checkbox y label al div
                divGroup.appendChild(label);
                divGroup.appendChild(checkbox);

                // Añadir el div al contenedor principal
                periodsToGiveSelect.appendChild(divGroup);
            } else {
                console.log("Dividiendo periodo largo (en UTC):", { vacationStart, vacationEnd });

                // Si el período es más largo, dividir en semanas de sábado a domingo con un ID único
                const weeks = divideIntoWeeks(new Date(vacationStart), new Date(vacationEnd), vacation._id);
                weeks.forEach(week => {
                    console.log("Semana dividida en UTC:", week);

                    const divGroup = document.createElement('div');
                    divGroup.classList.add('swap-input-group');  // Agregar la clase al div

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = JSON.stringify({ startDate: week.startDate.toISOString(), endDate: week.endDate.toISOString() });
                    checkbox.id = `week-${week.weekId}`;

                    const label = document.createElement('label');
                    label.setAttribute('for', checkbox.id);

                    // Mostrar las fechas en formato UTC
                    label.textContent = `Del ${week.startDate.toISOString().split('T')[0]} al ${week.endDate.toISOString().split('T')[0]}`;

                    // Añadir checkbox y label al div
                    divGroup.appendChild(label);
                    divGroup.appendChild(checkbox);

                    // Añadir el div al contenedor principal
                    periodsToGiveSelect.appendChild(divGroup);
                });
            }
        });
}

        // Manejar el envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        // Seleccionar los checkboxes marcados
        const periodsToGiveCheckboxes = periodsToGiveSelect.querySelectorAll('input[type="checkbox"]:checked');
        
        // Log para asegurar que los checkboxes se están seleccionando
        console.log('Checkboxes seleccionados:', periodsToGiveCheckboxes);

        // Verificar si hay checkboxes seleccionados
        if (periodsToGiveCheckboxes.length === 0) {
            alert('Por favor, selecciona al menos un período para ceder.');
            return;  // Detener la ejecución si no hay checkboxes seleccionados
        }

        // Procesar los períodos seleccionados
        const periodsToGive = Array.from(periodsToGiveCheckboxes).map(checkbox => {
            const period = JSON.parse(checkbox.value);
            return {
                startDate: period.startDate,  // Ya en UTC, no es necesario ajustar manualmente
                endDate: period.endDate
            };
        });

        const message = messageInput.value;

        // Log para verificar los períodos seleccionados
        console.log('Períodos a ceder:', periodsToGive);

        if (startDate && endDate && periodsToGive.length > 0) {
            const response = await fetch(`${apiUrl}/vacation-swap/request-swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({
                    userId: currentUser._id,  // Usamos currentUser aquí
                    periodsToGive,
                    periodToRequest: { startDate, endDate },
                    message
                })
            });

            const result = await response.json();
            if (response.ok) {
                alert('Solicitud de intercambio enviada exitosamente');
            } else {
                alert(`Error: ${result.message}`);
            }
        } else {
            alert('Por favor, selecciona un período y períodos equivalentes para ceder.');
        }
    });

});