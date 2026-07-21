import { processAcceptedNotification, processPendingNotification, processRejectedNotification, processBirthdayNotification } from './notificationsUtils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const notificationArea = document.getElementById('notification-area');
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;

    try {

        // Hacer una solicitud para obtener el perfil del usuario
        const profileResponse = await fetch(`${apiUrl}/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token')),
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

        // Solicitud al backend para obtener las notificaciones
        const response = await fetch(`${apiUrl}/notifications`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token')),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Error en la respuesta del servidor:', response.status);
            notificationArea.textContent = 'Error al cargar notificaciones.';
            return;
        }

        const notifications = await response.json();

        // Filtrar notificaciones relevantes para el usuario
        const relevantNotifications = notifications.filter(notification => {

            // Notificaciones de cumpleaños
            if (notification.type === 'birthday' && notification.receiver.toString() === userId.toString() && notification.status === 'pending') {
                return true;
            }
            // Lógica de filtrado para intercambio de vacaciones
            if (notification.status === 'accepted' && notification.receiver.toString() === userId.toString() && notification.isConfirmation) {
                return true;
            }
            if (notification.status === 'rejected' && notification.receiver.toString() === userId.toString() && notification.isConfirmation) {
                return true;
            }
            if (notification.status === 'pending' && notification.receiver.toString() === userId.toString() && notification.type !== 'birthday') {
                return true;
            }
            return false;
        });

        if (relevantNotifications.length > 0) {
            notificationArea.classList.add('notification-area');
            for (const notification of relevantNotifications) {

                const notificationDiv = document.createElement('div');
                notificationDiv.classList.add('notification');

                // Lógica para procesar diferentes tipos de notificaciones
                if (notification.type === 'birthday') {
                    processBirthdayNotification(notification, notificationDiv);
                } else if (notification.status === 'accepted' && notification.isConfirmation && notification.receiver.toString() === userId) {
                    await processAcceptedNotification(notification, notificationDiv, apiUrl);
                } else if (notification.status === 'rejected' && notification.isConfirmation && notification.receiver.toString() === userId) {
                    await processRejectedNotification(notification, notificationDiv, apiUrl);
                } else {
                    await processPendingNotification(notification, notificationDiv, apiUrl);
                }

                notificationArea.appendChild(notificationDiv);
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
