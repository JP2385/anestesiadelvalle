import { processAcceptedNotification, processPendingNotification, processRejectedNotification } from './notificationsUtils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const notificationArea = document.getElementById('notification-area');
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    try {
        console.log('Iniciando solicitud de notificaciones...');

        // Hacer una solicitud para obtener el perfil del usuario
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
        const userId = profileData._id;
        console.log('UserId obtenido desde el perfil:', userId);

        // Solicitud al backend para obtener las notificaciones
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

        // Filtrar notificaciones relevantes para el usuario
        const relevantNotifications = notifications.filter(notification => {
            console.log(`Revisando notificación con ID: ${notification._id}`);
            console.log(`Estado: ${notification.status}, isConfirmation: ${notification.isConfirmation}, Receiver: ${notification.receiver}, Sender: ${notification.sender}`);

            // Lógica de filtrado
            if (notification.status === 'accepted' && notification.receiver.toString() === userId.toString() && notification.isConfirmation) {
                console.log("Notificación aceptada relevante.");
                return true;
            }
            if (notification.status === 'rejected' && notification.receiver.toString() === userId.toString() && notification.isConfirmation) {
                console.log("Notificación de rechazo relevante.");
                return true;
            }
            if (notification.status === 'pending' && notification.receiver.toString() === userId.toString()) {
                console.log("Notificación pendiente.");
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

                const notificationDiv = document.createElement('div');
                notificationDiv.classList.add('notification');

                // Lógica para procesar diferentes tipos de notificaciones
                if (notification.status === 'accepted' && notification.isConfirmation && notification.receiver.toString() === userId) {
                    await processAcceptedNotification(notification, notificationDiv, apiUrl);
                } else if (notification.status === 'rejected' && notification.isConfirmation && notification.receiver.toString() === userId) {
                    await processRejectedNotification(notification, notificationDiv, apiUrl);
                } else {
                    await processPendingNotification(notification, notificationDiv, apiUrl);
                }

                notificationArea.appendChild(notificationDiv);
                console.log('Notificación agregada al área de notificaciones');
            }
        } else {
            notificationArea.textContent = '';
            notificationArea.classList.remove('notification-area');
        }

    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        notificationArea.textContent = 'Error al cargar notificaciones.';
    }
});