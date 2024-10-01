document.addEventListener('DOMContentLoaded', async () => {
    const notificationArea = document.getElementById('notification-area');
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    try {
        console.log('Iniciando solicitud de notificaciones...');

        // Hacer una solicitud para obtener el perfil del usuario (siempre obtenemos desde el servidor)
        const profileResponse = await fetch(`${apiUrl}/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            }
        });

        if (!profileResponse.ok) {
            console.error('Error al obtener el perfil del usuario');
            notificationArea.textContent = 'Error al cargar notificaciones.';
            return;
        }

        const profileData = await profileResponse.json();
        const userId = profileData._id;  // Asignar el userId desde el perfil obtenido
        console.log('UserId obtenido desde el perfil:', userId);

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

        // Filtrar notificaciones relevantes para el usuario (pending o accepted o rejected)
        const relevantNotifications = notifications.filter(notification => {
            console.log(`Revisando notificación con ID: ${notification._id}`);
            console.log(`Estado: ${notification.status}, isConfirmation: ${notification.isConfirmation}, Receiver: ${notification.receiver}, Sender: ${notification.sender}`);

            // Filtrar notificaciones aceptadas con isConfirmation = true
            if (notification.status === 'accepted') {
                if (notification.receiver.toString() === userId.toString() && notification.isConfirmation === true) {
                    console.log("Notificación aceptada relevante para el sender original.");
                    return true;
                } else {
                    console.log("Notificación 'accepted' pero no es una confirmación.");
                }
            }

            // Filtrar notificaciones rechazadas para el sender original
            if (notification.status === 'rejected' && notification.isConfirmation === true && notification.receiver.toString() === userId.toString()) {
                console.log("Notificación de rechazo relevante para el sender original.");
                return true;
            }

            // Filtrar notificaciones pendientes donde el usuario es el receiver
            if (notification.status === 'pending' && notification.receiver.toString() === userId.toString()) {
                console.log("Notificación pendiente encontrada para el receiver.");
                return true;
            }

            console.log("Notificación no relevante.");
            return false;
        });

        console.log('Notificaciones relevantes después del filtrado:', relevantNotifications);

        if (relevantNotifications.length > 0) {
            notificationArea.classList.add('notification-area');
            for (const notification of relevantNotifications) {
                console.log('Procesando notificación:', notification);

                // Verificar si la notificación es una confirmación para el sender original y fue aceptada
                if (notification.status === 'accepted' && notification.isConfirmation && notification.receiver.toString() === userId) {
                    // Crear un contenedor para la notificación aceptada
                    const notificationDiv = document.createElement('div');
                    notificationDiv.classList.add('notification');

                    // Hacer una solicitud para obtener el nombre del usuario que aceptó (el `receiver` en la notificación de confirmación)
                    const receiverResponse = await fetch(`${apiUrl}/auth/user/${notification.sender}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer ' + localStorage.getItem('token'),
                            'Content-Type': 'application/json'
                        }
                    });

                    const receiverData = await receiverResponse.json();
                    const receiverName = receiverData.username || 'Usuario desconocido';

                    const capitalizedReceiverName = receiverName.charAt(0).toUpperCase() + receiverName.slice(1);

                    // Convertir las fechas en UTC sin convertir a zona horaria local
                    const startDateToGive = new Date(notification.periodsToGive[0].startDate).toISOString().split('T')[0];
                    const endDateToGive = new Date(notification.periodsToGive[0].endDate).toISOString().split('T')[0];
                    const vacationStartDate = new Date(notification.vacationPeriod.startDate).toISOString().split('T')[0];
                    const vacationEndDate = new Date(notification.vacationPeriod.endDate).toISOString().split('T')[0];

                    // Mensaje de notificación de aceptación
                    const message = document.createElement('p');
                    message.innerHTML = `<h3>Solicitud de intercambio de vacaciones aceptada</h3>
                    <p>Tu solicitud de intercambio de vacaciones ha sido aceptada por ${capitalizedReceiverName}.</p> 
                    <p>Has cedido el período de vacaciones del ${startDateToGive} al ${endDateToGive}, 
                    y ahora tendrás vacaciones del ${vacationStartDate} al ${vacationEndDate}.</p>`;

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

                // Verificar si la notificación es para el sender original y fue rechazada
                } else if (notification.status === 'rejected' && notification.isConfirmation && notification.receiver.toString() === userId) {
                    // Crear un contenedor para la notificación de rechazo
                    const notificationDiv = document.createElement('div');
                    notificationDiv.classList.add('notification');

                    // Hacer una solicitud para obtener el nombre del receiver basado en su ID
                    const receiverResponse = await fetch(`${apiUrl}/auth/user/${notification.sender}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer ' + localStorage.getItem('token'),
                            'Content-Type': 'application/json'
                        }
                    });

                    const receiverData = await receiverResponse.json();
                    const receiverName = receiverData.username || 'Usuario desconocido';
                    const capitalizedReceiverName = receiverName.charAt(0).toUpperCase() + receiverName.slice(1);

                    // Mensaje de notificación de rechazo
                    const message = document.createElement('p');
                    message.innerHTML = `<h3>Solicitud de intercambio de vacaciones rechazada</h3>
                    <p>Tu solicitud de intercambio de vacaciones fue rechazada por ${capitalizedReceiverName}.</p>`;

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

                } else {
                    // Procesar notificaciones pendientes para el receiver
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

                    // Obtener las fechas del período de vacaciones en UTC y convertirlas a un formato legible
                    const vacationStart = new Date(notification.vacationPeriod?.startDate || '').toISOString().split('T')[0];
                    const vacationEnd = new Date(notification.vacationPeriod?.endDate || '').toISOString().split('T')[0];

                    // Crear un contenedor para la notificación
                    const notificationDiv = document.createElement('div');
                    notificationDiv.classList.add('notification');

                    const capitalizedSenderName = senderName.charAt(0).toUpperCase() + senderName.slice(1);

                    const message = document.createElement('p');
                    message.innerHTML = `<h3>${capitalizedSenderName} ha solicitado un intercambio de vacaciones contigo:</h3>
                    <p>Desea tomar el período de vacaciones que ahora posees del ${vacationStart} hasta ${vacationEnd}.</p>
                    <p>Períodos que ${capitalizedSenderName} puede cederte:</p>`;

                    // Crear los checkboxes para los períodos a ceder
                    const periodsToGiveDiv = document.createElement('div');
                    periodsToGiveDiv.classList.add('periods-to-give');
                    
                    notification.periodsToGive.forEach((period, index) => {
                        const periodStart = new Date(period.startDate).toISOString().split('T')[0];
                        const periodEnd = new Date(period.endDate).toISOString().split('T')[0];

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `period-${index}`;
                        checkbox.value = JSON.stringify(period);

                        const label = document.createElement('label');
                        label.setAttribute('for', `period-${index}`);
                        label.textContent = `Del ${periodStart} al ${periodEnd}`;

                        periodsToGiveDiv.appendChild(checkbox);
                        periodsToGiveDiv.appendChild(label);
                        periodsToGiveDiv.appendChild(document.createElement('br'));
                        periodsToGiveDiv.appendChild(document.createElement('br'));
                    });

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
                    
                    const rejectButton = document.createElement('button');
                    rejectButton.textContent = 'Rechazar';
                    rejectButton.addEventListener('click', () => {
                        // Para asegurarnos que siempre se envía un valor
                        respondToNotification(notification._id, 'rejected', [], notificationDiv);
                    });                    

                    notificationDiv.appendChild(message);
                    notificationDiv.appendChild(periodsToGiveDiv);
                    notificationDiv.appendChild(acceptButton);
                    notificationDiv.appendChild(rejectButton);

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
        console.log(`Enviando respuesta para la notificación ${notificationId} con estado ${response}`);

        // Realizamos la solicitud POST al servidor
        const res = await fetch(`${apiUrl}/notifications/respond`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notificationId, response, selectedPeriod })
        });

        // Capturamos el resultado en formato JSON
        const result = await res.json();
        console.log('Respuesta del servidor (estado):', res.status);
        console.log('Respuesta completa del servidor:', result);  // Agrega un log para verificar la respuesta

        // Si la respuesta es exitosa
        if (res.ok) {
            console.log('Respuesta exitosa, procediendo a eliminar la notificación');
            alert(`Solicitud de intercambio ${response}.`);  // Mostrar el alert con el estado de la respuesta

            // Eliminar la notificación del DOM
            notificationDiv.remove();
            console.log('Notificación eliminada del DOM');

            // Verificar si quedan notificaciones
            const remainingNotifications = document.querySelectorAll('.notification');
            const notificationArea = document.getElementById('notification-area');
            
            if (remainingNotifications.length === 0) {
                console.log('No quedan más notificaciones');
                notificationArea.textContent = '';  // Limpiar el contenido si no quedan notificaciones
                notificationArea.classList.remove('notification-area');  // Remover la clase si no quedan notificaciones
            }
        } else {
            // Si hay un error, mostrar el mensaje del servidor
            console.log('Error en la respuesta del servidor:', result);
            alert(`Error: ${result.message}`);
        }

    } catch (error) {
        // Manejo de errores si la solicitud falla
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
