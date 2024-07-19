document.addEventListener('DOMContentLoaded', function() {
    // const apiUrl = 'http://localhost:3000';
    const apiUrl = 'https://adv-37d5b772f5fd.herokuapp.com';

    updateWeekDates();
    populateSelectOptions();

    function updateWeekDates() {
        const currentDate = new Date();
        const currentDay = currentDate.getDay();
        const daysToMonday = (currentDay === 0 ? 6 : currentDay - 1);
        const mondayDate = new Date(currentDate);
        mondayDate.setDate(currentDate.getDate() - daysToMonday);
    
        const dateOptions = { day: 'numeric' };
    
        function createRandomizeButton(dayId) {
            const button = document.createElement('button');
            button.innerText = '🔀';
            button.classList.add('randomize-button');
            button.addEventListener('click', () => {
                alert(`Randomize for ${dayId}`);
                // Aquí puedes agregar la lógica de aleatorizar
            });
            return button;
        }
    
        function updateHeader(dayId, dayName, date) {
            const header = document.getElementById(dayId);
            header.innerText = `${dayName} ${date.toLocaleDateString('es-ES', dateOptions)}`;
            header.appendChild(createRandomizeButton(dayId));
        }
    
        updateHeader('monday-header', 'Lunes', mondayDate);
    
        const tuesdayDate = new Date(mondayDate);
        tuesdayDate.setDate(mondayDate.getDate() + 1);
        updateHeader('tuesday-header', 'Martes', tuesdayDate);
    
        const wednesdayDate = new Date(mondayDate);
        wednesdayDate.setDate(mondayDate.getDate() + 2);
        updateHeader('wednesday-header', 'Miércoles', wednesdayDate);
    
        const thursdayDate = new Date(mondayDate);
        thursdayDate.setDate(mondayDate.getDate() + 3);
        updateHeader('thursday-header', 'Jueves', thursdayDate);
    
        const fridayDate = new Date(mondayDate);
        fridayDate.setDate(mondayDate.getDate() + 4);
        updateHeader('friday-header', 'Viernes', fridayDate);
    }
    

    async function populateSelectOptions() {
        try {
            const response = await fetch(`${apiUrl}/auth/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });
    
            if (response.ok) {
                const users = await response.json();
    
                const selects = document.querySelectorAll('select');
    
                selects.forEach(select => {
                    const workSite = select.closest('tr').querySelector('.work-site').innerText;
                    const dayIndex = select.closest('td').cellIndex - 1; // -1 because the first column is work-site
                    const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayIndex];
                    const dayHeaderText = document.getElementById(dayHeaderId).innerText;
                    const dayDateParts = dayHeaderText.match(/\d+/g);
    
                    if (dayDateParts && dayDateParts.length === 1) {
                        const dayOfMonth = dayDateParts[0];
                        const month = new Date().getMonth() + 1; // Current month
                        const year = new Date().getFullYear();
                        const dayDate = new Date(`${year}-${month}-${dayOfMonth}`);
    
                        select.innerHTML = '<option value="">Select user</option>';
    
                        users.forEach(user => {
                            const onVacation = user.vacations.some(vacation => {
                                const start = new Date(vacation.startDate);
                                const end = new Date(vacation.endDate);
                                return dayDate >= start && dayDate <= end;
                            });
    
                            if (onVacation) {
                                return; // Skip this user if they are on vacation
                            }
    
                            const dayName = dayHeaderId.split('-')[0];
    
                            if (user.workSchedule[dayName] === 'No trabaja') {
                                return; // Skip this user if they do not work on this day
                            }
    
                            if (user.worksInCmacOnly && !workSite.includes('CMAC')) {
                                return; // Skip this user if they only work in CMAC and the site is not CMAC
                            }
    
                            if (workSite.includes('Fundación') || workSite.includes('CMAC')) {
                                if (!user.worksInPrivateRioNegro) {
                                    return; // Skip this user if they do not work in Private Rio Negro
                                }
                            }
    
                            if (workSite.includes('Hospital Cipolletti') || workSite.includes('Hospital Allen')) {
                                if (!user.worksInPublicRioNegro) {
                                    return; // Skip this user if they do not work in Public Rio Negro
                                }
                            }
    
                            if (workSite.includes('Hospital Heller') || workSite.includes('Hospital Plottier') || workSite.includes('Hospital Centenario') || workSite.includes('Hospital Castro Rendon')) {
                                if (!user.worksInPublicNeuquen) {
                                    return; // Skip this user if they do not work in Public Neuquen
                                }
                            }
    
                            if (workSite.includes('Imágenes') || workSite.includes('COI')) {
                                if (!user.worksInPrivateNeuquen) {
                                    return; // Skip this user if they do not work in Private Neuquen
                                }
                            }
    
                            // Excluir de los sitios matutinos a quienes trabajan a la tarde y de los vespertinos a quienes trabajan a la mañana
                            if (workSite.includes('Matutino') && user.workSchedule[dayName] === 'Tarde') {
                                return;
                            }
    
                            if (workSite.includes('Vespertino') && user.workSchedule[dayName] === 'Mañana') {
                                return;
                            }
                            if (workSite.includes('Largo') && user.workSchedule[dayName] === 'Mañana') {
                                return;
                            }
                            if (workSite.includes('Largo') && user.workSchedule[dayName] === 'Tarde') {
                                return;
                            }
                            if (workSite.includes('Fundación Q1 Matutino')) {
                                if (user.doesCardio && user.worksInPrivateRioNegro && (user.workSchedule[dayName] === 'Mañana' || user.workSchedule[dayName] === 'Variable')) {
                                    const option = document.createElement('option');
                                    option.value = user._id;
                                    option.textContent = user.username;
                                    select.appendChild(option);
                                }
                            } else if (workSite.includes('Fundación RNM TAC') || workSite.includes('COI')) {
                                if (user.doesRNM) {
                                    const option = document.createElement('option');
                                    option.value = user._id;
                                    option.textContent = user.username;
                                    select.appendChild(option);
                                }
                            } else {
                                const option = document.createElement('option');
                                option.value = user._id;
                                option.textContent = user.username;
                                select.appendChild(option);
                            }
                        });
                    }
                });
    
                // Añadir eventos de click para los botones de bloqueo
                const lockButtons = document.querySelectorAll('.lock-button');
                lockButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const select = button.previousElementSibling;
                        select.disabled = !select.disabled;
                        button.textContent = select.disabled ? '🔓' : '🔒';
                    });
                });
    
                // Añadir eventos de cambio para los selectores
                selects.forEach(select => {
                    select.addEventListener('change', handleSelectChange);
                });
    
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            alert('Hubo un problema con la solicitud: ' + error.message);
        }
    }
    

    function handleSelectChange(event) {
        const select = event.target;
        const selectedUserId = select.value;
        const dayIndex = select.closest('td').cellIndex - 1;
        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayIndex];
        const dayHeaderText = document.getElementById(dayHeaderId).innerText;
        const selects = document.querySelectorAll(`td:nth-child(${dayIndex + 2}) select`); // +2 because the first column is work-site
    
        let userAlreadyAssigned = false;
    
        selects.forEach(otherSelect => {
            if (otherSelect !== select && otherSelect.value === selectedUserId) {
                userAlreadyAssigned = true;
            }
        });
    
        if (userAlreadyAssigned) {
            alert('El usuario que se intenta asignar ya tiene otro lugar asignado en este día.');
            select.value = ''; // Clear the current selection
        }
    
        // Cambiar el color de fondo del select según su valor
        if (select.value === '') {
            select.classList.add('default');
            select.classList.remove('assigned');
        } else {
            select.classList.add('assigned');
            select.classList.remove('default');
        }
    }
    
    // Asegúrate de que los selectores tengan la clase 'default' al cargar la página
    document.querySelectorAll('select').forEach(select => {
        select.classList.add('default');
        select.addEventListener('change', handleSelectChange);
    });
    
    
});
