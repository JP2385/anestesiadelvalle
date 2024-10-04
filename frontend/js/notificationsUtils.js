// notificationUtils.js

// Objeto para cachear los usuarios y evitar múltiples solicitudes GET al backend
const userCache = {};

// Obtener datos del usuario con fechas en UTC
async function getUserData(apiUrl, userId) {
    if (userCache[userId]) {
        return userCache[userId];
    }

    const userResponse = await fetch(`${apiUrl}/auth/user/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token'),
            'Content-Type': 'application/json'
        }
    });

    const userData = await userResponse.json();
    userCache[userId] = userData;
    return userData;
}

// Responder a la notificación asegurando el uso de fechas UTC
async function respondToNotification(apiUrl, notificationId, response, selectedPeriod = null, notificationDiv) {
    try {
        console.log(`Enviando respuesta para la notificación ${notificationId} con estado ${response}`);

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
            // Chequea si el mensaje del servidor indica que la notificación sigue pendiente
            if (result.message.includes('pendiente')) {
                alert(result.message);  // Mostrar el mensaje completo cuando sigue pendiente
            } else {
                alert(`Solicitud de intercambio ${response}.`);
                // Solo eliminar la notificación del DOM si se acepta o rechaza
                notificationDiv.remove();
                if (document.querySelectorAll('.notification').length === 0) {
                    const notificationArea = document.getElementById('notification-area');
                    notificationArea.textContent = '';
                    notificationArea.classList.remove('notification-area');
                }
            }
        } else {
            console.log('Error en la respuesta del servidor:', result);
            alert(`Error: ${result.message}`);
        }        
    } catch (error) {
        console.error('Error al responder a la notificación:', error);
        alert('Hubo un problema al responder a la notificación.');
    }
}

// Marcar la notificación como notificada en UTC
async function markNotificationAsNotified(apiUrl, notificationId, notificationDiv) {
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
            if (document.querySelectorAll('.notification').length === 0) {
                const notificationArea = document.getElementById('notification-area');
                notificationArea.textContent = '';
                notificationArea.classList.remove('notification-area');
            }
        }
    } catch (error) {
        console.error('Error al marcar notificación como vista:', error);
        alert('Hubo un problema al marcar la notificación.');
    }
}

// Procesar notificaciones aceptadas con fechas UTC
export async function processAcceptedNotification(notification, notificationDiv, apiUrl) {
    const receiverData = await getUserData(apiUrl, notification.sender);
    const receiverName = receiverData.username || 'Usuario desconocido';
    const capitalizedReceiverName = receiverName.charAt(0).toUpperCase() + receiverName.slice(1);

    const startDateToGive = new Date(notification.periodsToGive[0].startDate).toISOString().split('T')[0];
    const endDateToGive = new Date(notification.periodsToGive[0].endDate).toISOString().split('T')[0];
    const vacationStartDate = new Date(notification.vacationPeriod.startDate).toISOString().split('T')[0];
    const vacationEndDate = new Date(notification.vacationPeriod.endDate).toISOString().split('T')[0];

    const message = document.createElement('p');
    message.innerHTML = `<h3>Solicitud de intercambio de vacaciones aceptada</h3>
    <p>Tu solicitud ha sido aceptada por ${capitalizedReceiverName}.</p>
    <p>Has cedido el período del ${startDateToGive} al ${endDateToGive} y tendrás vacaciones del ${vacationStartDate} al ${vacationEndDate}.</p>`;

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'De acuerdo';
    confirmButton.addEventListener('click', () => markNotificationAsNotified(apiUrl, notification._id, notificationDiv));

    notificationDiv.appendChild(message);
    notificationDiv.appendChild(confirmButton);
}

// Procesar notificaciones rechazadas con fechas UTC
export async function processRejectedNotification(notification, notificationDiv, apiUrl) {
    const receiverData = await getUserData(apiUrl, notification.sender);
    const receiverName = receiverData.username || 'Usuario desconocido';
    const capitalizedReceiverName = receiverName.charAt(0).toUpperCase() + receiverName.slice(1);

    const message = document.createElement('p');
    message.innerHTML = `<h3>Solicitud de intercambio de vacaciones rechazada</h3>
    <p>Tu solicitud fue rechazada por ${capitalizedReceiverName}.</p>`;

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'De acuerdo';
    confirmButton.addEventListener('click', () => markNotificationAsNotified(apiUrl, notification._id, notificationDiv));

    notificationDiv.appendChild(message);
    notificationDiv.appendChild(confirmButton);
}

// Procesar notificaciones pendientes con fechas UTC
export async function processPendingNotification(notification, notificationDiv, apiUrl) {
    const senderData = await getUserData(apiUrl, notification.sender);
    const senderName = senderData.username || 'Usuario desconocido';

    const vacationStart = new Date(notification.vacationPeriod?.startDate || '').toISOString().split('T')[0];
    const vacationEnd = new Date(notification.vacationPeriod?.endDate || '').toISOString().split('T')[0];

    const capitalizedSenderName = senderName.charAt(0).toUpperCase() + senderName.slice(1);

    const message = document.createElement('p');
    message.innerHTML = `<h3>${capitalizedSenderName} ha solicitado un intercambio de vacaciones contigo:</h3>
    <p>Desea tomar el período de vacaciones del ${vacationStart} al ${vacationEnd}.</p>
    <p>Períodos que ${capitalizedSenderName} puede cederte:</p>`;

    const periodsToGiveDiv = document.createElement('div');
    periodsToGiveDiv.classList.add('periods-to-give');

    notification.periodsToGive.forEach((period, index) => {
        const periodStart = new Date(period.startDate).toISOString().split('T')[0];
        const periodEnd = new Date(period.endDate).toISOString().split('T')[0];

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `period-${index}`;
        checkbox.value = JSON.stringify({
            startDate: new Date(period.startDate).toISOString(),
            endDate: new Date(period.endDate).toISOString()
        });

        const label = document.createElement('label');
        label.setAttribute('for', `period-${index}`);
        label.textContent = `Del ${periodStart} al ${periodEnd}`;

        periodsToGiveDiv.appendChild(checkbox);
        periodsToGiveDiv.appendChild(label);
        periodsToGiveDiv.appendChild(document.createElement('br'));
        periodsToGiveDiv.appendChild(document.createElement('br'));
    });

    // Calcular los días hábiles del período solicitado por el sender
    const senderBusinessDays = countBusinessDays(new Date(notification.vacationPeriod.startDate), new Date(notification.vacationPeriod.endDate));

    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Aceptar';
    acceptButton.addEventListener('click', () => {
        const selectedPeriods = Array.from(periodsToGiveDiv.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.value);

        // Log para verificar los valores de los checkboxes seleccionados
        console.log("Periodos seleccionados:", selectedPeriods);

        // Calcular la suma de los días hábiles seleccionados
        let selectedBusinessDays = 0;
        selectedPeriods.forEach(period => {
            const parsedPeriod = JSON.parse(period);
            const startDate = new Date(parsedPeriod.startDate);
            const endDate = new Date(parsedPeriod.endDate);
            selectedBusinessDays += countBusinessDays(startDate, endDate);
        });

        // Verificar si los días hábiles seleccionados son suficientes
        if (selectedBusinessDays < senderBusinessDays) {
            alert('No puedes tomar menos días hábiles que los que te piden a cambio.');
            return;
        }

        // Si todo está bien, proceder con la respuesta
        respondToNotification(apiUrl, notification._id, 'accepted', selectedPeriods, notificationDiv);
    });

    const rejectButton = document.createElement('button');
    rejectButton.textContent = 'Rechazar';
    rejectButton.addEventListener('click', () => respondToNotification(apiUrl, notification._id, 'rejected', [], notificationDiv));

    notificationDiv.appendChild(message);
    notificationDiv.appendChild(periodsToGiveDiv);
    notificationDiv.appendChild(acceptButton);
    notificationDiv.appendChild(rejectButton);
}

// Función para contar días hábiles entre dos fechas
function countBusinessDays(startDate, endDate) {
    let count = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Excluir fines de semana
            count++;
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return count;
}
