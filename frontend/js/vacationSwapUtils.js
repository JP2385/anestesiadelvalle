// vacationSwapUtils.js
import toast from './toast.js';

export function validateStartDate(startDateInput, endDateInput, submitButton, handleDateChange) {
    const startDate = new Date(startDateInput.value + "T00:00:00Z");
    const endDate = new Date(endDateInput.value + "T00:00:00Z");

    // Verificar si la fecha de inicio es sábado (6) en UTC
    if (startDate.getUTCDay() !== 6) {
        toast.warning('La fecha de inicio debe ser un sábado.');
        startDateInput.value = '';  // Vaciar el campo de fecha de inicio
        submitButton.disabled = true;  // Desactivar el botón de envío
        return;
    }

    // Si ya hay fecha de fin, validar que la fecha de inicio sea anterior y que haya al menos 8 días de diferencia
    if (endDateInput.value) {
        if (startDate >= endDate) {
            toast.warning('La fecha de inicio debe ser anterior a la fecha de fin.');
            startDateInput.value = '';  // Vaciar el campo de fecha de inicio
            submitButton.disabled = true;  // Desactivar el botón de envío
            return;
        }

        const daysDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        if (daysDifference < 8) {
            toast.warning('Debe haber al menos 8 días entre la fecha de inicio y la de fin.');
            startDateInput.value = '';  // Vaciar el campo de fecha de inicio
            submitButton.disabled = true;  // Desactivar el botón de envío
            return;
        }
    }

    submitButton.disabled = false;
    handleDateChange();
}

export function validateEndDate(startDateInput, endDateInput, submitButton, handleDateChange) {
    const startDate = new Date(startDateInput.value + "T00:00:00Z");
    const endDate = new Date(endDateInput.value + "T00:00:00Z");

    if (endDate.getUTCDay() !== 0) {
        toast.warning('La fecha de fin debe ser un domingo.');
        endDateInput.value = '';  // Vaciar el campo de fecha de fin
        submitButton.disabled = true;  // Desactivar el botón de envío
        return;
    }

    const daysDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDifference < 8) {
        toast.warning('Debe haber al menos 8 días entre la fecha de inicio y la de fin.');
        endDateInput.value = '';  // Vaciar el campo de fecha de fin
        submitButton.disabled = true;
    } else {
        submitButton.disabled = false;
        handleDateChange();
    }
}

export function filterUsersByDate(users, currentUser, startDate, endDate, resetDateInputs) {
    const userHasPeriod = currentUser.vacations.some(vacation => {
        const vacationStart = new Date(vacation.startDate);
        const vacationEnd = new Date(vacation.endDate);
        return vacationStart <= new Date(startDate) && vacationEnd >= new Date(endDate);
    });

    if (userHasPeriod) {
        toast.warning('Ya posees este período de vacaciones. No puedes solicitarlo.');
        resetDateInputs();
        return [];
    }

    return users.filter(user => {
        return user.vacations.some(vacation => {
            const vacationStart = new Date(vacation.startDate);
            const vacationEnd = new Date(vacation.endDate);
            return vacationStart <= new Date(startDate) && vacationEnd >= new Date(endDate);
        });
    });
}

export function resetDateInputs(startDateInput, endDateInput, submitButton) {
    startDateInput.value = '';
    endDateInput.value = '';
    submitButton.disabled = true;
}

export function populateUserList(filteredUsers, userList) {
    userList.innerHTML = ''; 
    filteredUsers.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username;
        userList.appendChild(li);
    });
}

export function divideIntoWeeks(startDate, endDate, vacationId) {
    const weeks = [];
    let currentStart = new Date(startDate);
    const vacationEnd = new Date(endDate);

    if (startDate === endDate) {
        weeks.push({
            weekId: vacationId,
            startDate: currentStart,
            endDate: vacationEnd
        });
        return weeks;
    }

    while (currentStart <= vacationEnd) {
        let currentEnd = new Date(currentStart);
        currentEnd.setDate(currentStart.getDate() + 8);

        if (currentEnd > vacationEnd) {
            currentEnd = vacationEnd;
        }

        const daysInWeek = (currentEnd - currentStart) / (1000 * 60 * 60 * 24) + 1;
        if (daysInWeek >= 3) {
            weeks.push({
                weekId: `${vacationId}-${weeks.length + 1}`,
                startDate: new Date(currentStart),
                endDate: new Date(currentEnd)
            });
        }

        currentStart.setDate(currentStart.getDate() + 7);
    }

    return weeks;
}

export function resetForm(startDateInput, endDateInput, userList, periodsToGiveSelect, submitButton) {
    // Resetear los campos de fecha
    startDateInput.value = '';
    endDateInput.value = '';

    // Limpiar la lista de usuarios
    userList.innerHTML = '';

    // Limpiar la lista de períodos para ceder
    periodsToGiveSelect.innerHTML = '';

    // Deshabilitar el botón de envío hasta que se seleccionen nuevas fechas válidas
    submitButton.disabled = true;
}