import { fetchVacations } from './fetchVacations.js';
import { validateStartDate, validateEndDate, filterUsersByDate, resetDateInputs, populateUserList, divideIntoWeeks, resetForm } from './vacationSwapUtils.js';
import toast from './toast.js';

document.addEventListener('DOMContentLoaded', async () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const periodsToGiveSelect = document.getElementById('periodsToGive');
    const userList = document.getElementById('user-list');
    const form = document.getElementById('swap-request-form');
    const messageInput = document.getElementById('message');
    const submitButton = form.querySelector('button[type="submit"]');

    // Setear la fecha mínima del startDateInput como la fecha actual
    const today = new Date().toISOString().split('T')[0];
    startDateInput.min = today;
    
    let users = [];
    let currentUser = null;

    try {
        users = await fetchVacations();
    } catch (error) {
        console.error('Error fetching vacation data:', error);
    }

    startDateInput.addEventListener('change', () => {
        validateStartDate(startDateInput, endDateInput, submitButton, handleDateChange);
        endDateInput.min = startDateInput.value;
        endDateInput.focus();
    });
    
    endDateInput.addEventListener('change', () => {
        validateEndDate(startDateInput, endDateInput, submitButton, handleDateChange);
    });

    async function handleDateChange() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!currentUser) {
            const currentUserResponse = await fetch(`${apiUrl}/auth/profile`, {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            });
            currentUser = await currentUserResponse.json();
        }

        if (startDate && endDate) {
            const filteredUsers = filterUsersByDate(users, currentUser, startDate, endDate, () => resetDateInputs(startDateInput, endDateInput, submitButton));
            if (filteredUsers.length > 0) {
                populateUserList(filteredUsers, userList);
                await populatePeriodsToGive();
            }
        }
    }

    async function populatePeriodsToGive() {
        const currentUserResponse = await fetch(`${apiUrl}/auth/profile`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        currentUser = await currentUserResponse.json();

        const today = new Date();
        const requestedStartDate = new Date(startDateInput.value);
        const requestedEndDate = new Date(endDateInput.value);
        const requestedDays = Math.round((requestedEndDate - requestedStartDate) / (1000 * 60 * 60 * 24)) + 1;

        periodsToGiveSelect.innerHTML = '';

        currentUser.vacations
            .filter(vacation => new Date(vacation.startDate).getTime() > today.getTime())
            .forEach(vacation => {
                const vacationStart = new Date(vacation.startDate).toISOString();
                const vacationEnd = new Date(vacation.endDate).toISOString();
                const vacationDays = Math.round((new Date(vacationEnd) - new Date(vacationStart)) / (1000 * 60 * 60 * 24)) + 1;

                if (vacationDays <= requestedDays) {
                    const divGroup = document.createElement('div');
                    divGroup.classList.add('swap-input-group');

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = JSON.stringify({ startDate: vacation.startDate, endDate: vacation.endDate });
                    checkbox.id = `vacation-${vacation._id}`;

                    const label = document.createElement('label');
                    label.setAttribute('for', checkbox.id);
                    label.textContent = `Del ${vacationStart.split('T')[0]} al ${vacationEnd.split('T')[0]}`;

                    divGroup.appendChild(label);
                    divGroup.appendChild(checkbox);
                    periodsToGiveSelect.appendChild(divGroup);
                } else {
                    const weeks = divideIntoWeeks(new Date(vacationStart), new Date(vacationEnd), vacation._id);
                    weeks.forEach(week => {
                        const divGroup = document.createElement('div');
                        divGroup.classList.add('swap-input-group');

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = JSON.stringify({ startDate: week.startDate.toISOString(), endDate: week.endDate.toISOString() });
                        checkbox.id = `week-${week.weekId}`;

                        const label = document.createElement('label');
                        label.setAttribute('for', checkbox.id);
                        label.textContent = `Del ${week.startDate.toISOString().split('T')[0]} al ${week.endDate.toISOString().split('T')[0]}`;

                        divGroup.appendChild(label);
                        divGroup.appendChild(checkbox);
                        periodsToGiveSelect.appendChild(divGroup);
                    });
                }
            });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const periodsToGiveCheckboxes = periodsToGiveSelect.querySelectorAll('input[type="checkbox"]:checked');

        if (periodsToGiveCheckboxes.length === 0) {
            toast.warning('Por favor, selecciona al menos un período para ceder.');
            return;
        }

        const periodsToGive = Array.from(periodsToGiveCheckboxes).map(checkbox => {
            const period = JSON.parse(checkbox.value);
            return { startDate: period.startDate, endDate: period.endDate };
        });

        const message = messageInput.value;

        if (startDate && endDate && periodsToGive.length > 0) {
            const response = await fetch(`${apiUrl}/vacation-swap/request-swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({
                    userId: currentUser._id,
                    periodsToGive,
                    periodToRequest: { startDate, endDate },
                    message
                })
            });

            const result = await response.json();
            if (response.ok) {
                toast.success('Solicitud de intercambio enviada exitosamente');
                resetForm(startDateInput, endDateInput, userList, periodsToGiveSelect, submitButton);  // Limpiar el formulario después del submit
            } else {
                toast.error(`Error: ${result.message}`);
            }
        } else {
            toast.warning('Por favor, selecciona un período y períodos equivalentes para ceder.');
        }
    });
});
