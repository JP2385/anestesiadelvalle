document.addEventListener('DOMContentLoaded', async () => {
    const notificationArea = document.getElementById('notification-area');
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    try {
        console.log('Iniciando solicitud de notificaciones...');

        // Verificar si el userId está almacenado en localStorage
        let userId = localStorage.getItem('userId');
        if (!userId) {
            // Si no está en localStorage, hacer una solicitud para obtener el perfil del usuario
            const profileResponse = await fetch(`${apiUrl}/auth/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token'),
                    'Content-Type': 'application/json'
                }
            });

            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                userId = profileData._id;
                // Almacenar el userId en localStorage
                localStorage.setItem('userId', userId);
                console.log('userId obtenido y almacenado:', userId);
            } else {
                console.error('Error al obtener el perfil del usuario');
                notificationArea.textContent = 'Error al cargar notificaciones.';
                return;
            }
        }

        // Realizar una solicitud al backend para obtener las notificaciones pendientes o aceptadas
        const response = await fetch(`${apiUrl}/notifications`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            }
        });

        console.log('Respuesta recibida del backend:', response);

        if (!response.ok) {
            console.error('Error en la respuesta del servidor:', response.status);
            notificationArea.textContent = 'Error al cargar notificaciones.';
            return;
        }

        const notifications = await response.json();
        console.log('Notificaciones obtenidas:', notifications);

        // Filtrar notificaciones relevantes para el usuario (pending o accepted)
        const relevantNotifications = notifications.filter(notification => 
            (notification.status === 'pending' && notification.receiver.toString() === userId) ||
            (notification.status === 'accepted' && notification.sender.toString() === userId)
        );

        console.log('Notificaciones relevantes para mostrar:', relevantNotifications);

        if (relevantNotifications.length > 0) {
            notificationArea.innerHTML = '';  // Limpiar el área antes de renderizar
            notificationArea.classList.add('notification-area');
            for (const notification of relevantNotifications) {
                console.log('Procesando notificación:', notification);
        
                // Verificar si la notificación es para el *sender* y fue aceptada
                if (notification.status === 'accepted' && notification.sender.toString() === userId) {
                    // Crear un contenedor para la notificación aceptada
                    const notificationDiv = document.createElement('div');
                    notificationDiv.classList.add('notification');
                
                    // Hacer una solicitud para obtener el nombre del receiver basado en su ID
                    const senderResponse = await fetch(`${apiUrl}/auth/user/${notification.sender}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer ' + localStorage.getItem('token'),
                            'Content-Type': 'application/json'
                        }
                    });
                
                    const senderData = await senderResponse.json();
                    const senderName = senderData.username || 'Usuario desconocido';
                
                    // Capitalizar el nombre del receiver
                    const capitalizedSenderName = senderName.charAt(0).toUpperCase() + senderName.slice(1);
                
                    // Función para sumar 3 horas a una fecha
                    function addThreeHours(dateString) {
                        const date = new Date(dateString);
                        date.setHours(date.getHours() + 3);
                        return date;
                    }
                
                    // Ajustar las fechas sumando 3 horas
                    const adjustedStartDateToGive = addThreeHours(notification.periodsToGive[0].startDate).toLocaleDateString();
                    const adjustedEndDateToGive = addThreeHours(notification.periodsToGive[0].endDate).toLocaleDateString();
                    const adjustedVacationStartDate = addThreeHours(notification.vacationPeriod.startDate).toLocaleDateString();
                    const adjustedVacationEndDate = addThreeHours(notification.vacationPeriod.endDate).toLocaleDateString();
                
                    // Mensaje de notificación de aceptación
                    const message = document.createElement('p');
                    message.innerHTML = `<h3>Solicitud de intercambio de vacaciones aceptada</h3>
                    <p>Tu solicitud de intercambio de vacaciones ha sido aceptada por el usuario ${capitalizedSenderName}.</p> 
                    <p>Has cedido el período de vacaciones del ${adjustedStartDateToGive} al ${adjustedEndDateToGive}, 
                    y ahora tendrás vacaciones del ${adjustedVacationStartDate} al ${adjustedVacationEndDate}.</p>`;
                
                    // Botón para confirmar y marcar la notificación como 'notified'
                    const confirmButton = document.createElement('button');
                    confirmButton.textContent = 'De acuerdo';
                    confirmButton.addEventListener('click', () =>
                        markNotificationAsNotified(notification._id, notificationDiv));
                
                    // Añadir todo al contenedor de la notificación
                    notificationDiv.appendChild(message);
                    notificationDiv.appendChild(confirmButton);
                
                    // Añadir la notificación al área de notificaciones
                    notificationArea.appendChild(notificationDiv);
                } 
                 else {
                    // Procesar notificaciones pendientes para el receiver
                    // Hacer una solicitud para obtener el nombre del sender basado en su ID
                    const senderResponse = await fetch(`${apiUrl}/auth/user/${notification.sender}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer ' + localStorage.getItem('token'),
                            'Content-Type': 'application/json'
                        }
                    });

                    const senderData = await senderResponse.json();
                    const senderName = senderData.username || 'Usuario desconocido';

                    console.log('Sender:', senderName);

                    // Función para sumar 3 horas a una fecha
                    function addThreeHours(dateString) {
                        const date = new Date(dateString);
                        date.setHours(date.getHours() + 3);
                        return date;
                    }

                    // Obtener las fechas del período de vacaciones y sumarles 3 horas
                    const vacationStart = addThreeHours(notification.vacationPeriod?.startDate || '').toLocaleDateString();
                    const vacationEnd = addThreeHours(notification.vacationPeriod?.endDate || '').toLocaleDateString();

                    // Crear un contenedor para la notificación
                    const notificationDiv = document.createElement('div');
                    notificationDiv.classList.add('notification');

                    const capitalizedSenderName = senderName.charAt(0).toUpperCase() + senderName.slice(1);

                    // Crear el contenido de la notificación
                    const message = document.createElement('p');
                    message.innerHTML = `<h3>${capitalizedSenderName} ha solicitado un intercambio de vacaciones contigo:</h3>
                    <p>Desea tomar el período de vacaciones que ahora posees del ${vacationStart} hasta ${vacationEnd}.</p>
                    <p>Si te interesa tomar a su vez alguno de los períodos que puede ofrecerte, selecciónalo tildando en el recuadro y haz click en aceptar, si no haz click en rechazar.</p>
                    <p>Períodos que ${capitalizedSenderName} puede cederte:</p>`

                    // Crear los checkboxes para los períodos a ceder
                    const periodsToGiveDiv = document.createElement('div');
                    periodsToGiveDiv.classList.add('periods-to-give');
                    
                    notification.periodsToGive.forEach((period, index) => {
                        const periodStart = addThreeHours(period.startDate).toLocaleDateString();
                        const periodEnd = addThreeHours(period.endDate).toLocaleDateString();

                        // Crear checkbox y label
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `period-${index}`;
                        checkbox.value = JSON.stringify(period);

                        const label = document.createElement('label');
                        label.setAttribute('for', `period-${index}`);
                        label.textContent = `Del ${periodStart} al ${periodEnd}`;

                        // Añadir checkbox y label al contenedor
                        periodsToGiveDiv.appendChild(checkbox);
                        periodsToGiveDiv.appendChild(label);
                        periodsToGiveDiv.appendChild(document.createElement('br'));
                        periodsToGiveDiv.appendChild(document.createElement('br'));  // Separar las opciones
                    });

                    // Botón para aceptar la solicitud
                    const acceptButton = document.createElement('button');
                    acceptButton.textContent = 'Aceptar';
                    acceptButton.addEventListener('click', () => {
                        const selectedPeriods = Array.from(periodsToGiveDiv.querySelectorAll('input[type="checkbox"]:checked'))
                            .map(checkbox => checkbox.value);
                    
                        if (selectedPeriods.length === 0) {
                            alert('Por favor, selecciona al menos un período para tomar.');
                        } else {
                            respondToNotification(notification._id, 'accepted', selectedPeriods, notificationDiv);
                        }
                    });
                    

                    // Botón para rechazar la solicitud
                    const rejectButton = document.createElement('button');
                    rejectButton.textContent = 'Rechazar';
                    rejectButton.addEventListener('click', () => respondToNotification(notification._id, 'rejected', null, notificationDiv));

                    // Añadir todo al contenedor de la notificación
                    notificationDiv.appendChild(message);
                    notificationDiv.appendChild(periodsToGiveDiv);  // Añadir los checkboxes
                    notificationDiv.appendChild(acceptButton);
                    notificationDiv.appendChild(rejectButton);

                    // Añadir la notificación al área de notificaciones
                    notificationArea.appendChild(notificationDiv);
                }
                console.log('Notificación agregada al área de notificaciones');
            }
        } else {
            console.log('');
            notificationArea.textContent = '';
            notificationArea.classList.remove('notification-area');
        }

    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        notificationArea.textContent = 'Error al cargar notificaciones.';
    }
});


// Función para responder a la notificación (aceptar o rechazar)
async function respondToNotification(notificationId, response, selectedPeriod = null, notificationDiv) {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    try {
        const res = await fetch(`${apiUrl}/notifications/respond`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notificationId, response, selectedPeriod })
        });

        const result = await res.json();

        if (res.ok) {
            alert(`Solicitud de intercambio ${response}.`);

            // Eliminar la notificación del área de notificaciones sin recargar la página
            notificationDiv.remove();

            // Si ya no hay más notificaciones, mostrar un mensaje
            if (document.querySelectorAll('.notification').length === 0) {
                document.getElementById('notification-area').textContent = '';
            }
        } else {
            alert(`Error: ${result.message}`);
        }

    } catch (error) {
        console.error('Error al responder a la notificación:', error);
        alert('Hubo un problema al responder a la notificación.');
    }
}

// Función para marcar la notificación como 'notified'
async function markNotificationAsNotified(notificationId, notificationDiv) {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';
    const notificationArea = document.getElementById('notification-area');
    try {
        const res = await fetch(`${apiUrl}/notifications/mark-as-notified`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notificationId })
        });

        if (res.ok) {
            alert('Notificación marcada como vista.');
            notificationDiv.remove();
              // Eliminar la notificación del área

            // Si ya no hay más notificaciones, mostrar un mensaje
            if (document.querySelectorAll('.notification').length === 0) {
                document.getElementById('notification-area').textContent = '';
                notificationArea.classList.remove('notification-area')
            }
        }
    } catch (error) {
        console.error('Error al marcar notificación como vista:', error);
        alert('Hubo un problema al marcar la notificación.');
    }
}
