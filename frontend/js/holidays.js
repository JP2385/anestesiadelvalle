document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    const holidayList = document.getElementById('holiday-list');
    const addHolidayButton = document.getElementById('add-holiday');
    const holidayNameInput = document.getElementById('holiday-name');
    const startDateInput = document.getElementById('holiday-start');
    const endDateInput = document.getElementById('holiday-end');

    // Obtener la lista de feriados
    fetch(`${apiUrl}/holidays`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
        .then(response => response.json())
        .then(holidays => {
            holidays.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
            holidays.forEach(holiday => displayHoliday(holiday));
        })
        .catch(error => {
            alert('Hubo un problema al obtener la lista de feriados: ' + error.message);
        });

    // Validar que la fecha de fin no sea inferior a la fecha de inicio
    startDateInput.addEventListener('change', () => {
        const startDate = startDateInput.value;

        // Actualiza el atributo min del campo de fecha de fin
        endDateInput.min = startDate;

        // Si la fecha de fin es anterior a la fecha de inicio, reinicia el valor de endDateInput
        if (endDateInput.value && new Date(endDateInput.value) < new Date(startDate)) {
            endDateInput.value = '';
            alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
        }
    });

// Manejar el botón de agregar feriado
// Manejar el botón de agregar feriado
addHolidayButton.addEventListener('click', () => {
    const holidayName = holidayNameInput.value;
    const startDateUTC = new Date(startDateInput.value).toISOString();
    const endDateUTC = new Date(endDateInput.value).toISOString();

    if (!holidayName || !startDateUTC || !endDateUTC) {
        alert('Por favor completa todos los campos');
        return;
    }

    const newHoliday = { name: holidayName, startDate: startDateUTC, endDate: endDateUTC };

    fetch(`${apiUrl}/holidays`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(newHoliday)
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Error al crear el feriado');
                });
            }
            return response.json();
        })
        .then(createdHoliday => {
            displayHoliday(createdHoliday);
            holidayNameInput.value = '';
            startDateInput.value = '';
            endDateInput.value = '';
            endDateInput.min = '';
        })
        .catch(error => {
            if (error.message === 'Ya existe un feriado en este rango de fechas.') {
                alert('Ya existe un feriado en este rango de fechas');
            } else {
                alert('Hubo un problema al agregar el feriado: ' + error.message);
            }
        });
});

    // Función para mostrar un feriado en la lista
    function displayHoliday(holiday) {
        const holidayItem = document.createElement('li');
        holidayItem.innerHTML = `<div>
            <strong>${holiday.name}:</strong></div>
            del <input type="date" class="holiday-start" value="${new Date(holiday.startDate).toISOString().split('T')[0]}"> 
            al <input type="date" class="holiday-end" value="${new Date(holiday.endDate).toISOString().split('T')[0]}">
            <button class="delete-holiday">❌</button>
        `;

        holidayItem.querySelector('.delete-holiday').addEventListener('click', () => {
            deleteHoliday(holiday._id, holidayItem);
        });

        holidayList.appendChild(holidayItem);
    }

    function deleteHoliday(holidayId, holidayItem) {
        fetch(`${apiUrl}/holidays/${holidayId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al eliminar el feriado en el servidor');
            }
            
            holidayList.removeChild(holidayItem); // Eliminar el feriado del DOM
            alert('Feriado eliminado'); // Confirmación de eliminación exitosa
        })
        .catch(error => {
            console.error('Hubo un problema al eliminar el feriado:', error);
            
            // Verifica si el feriado aún está en el DOM (lo cual indica que el servidor no respondió correctamente)
            if (holidayList.contains(holidayItem)) {
                holidayList.removeChild(holidayItem);
            }
            
            // Mostrar el mensaje solo si el error no es "Failed to fetch"
            if (error.message !== 'Failed to fetch') {
                alert('Hubo un problema al eliminar el feriado: ' + error.message);
            }
        });
    }
    
});
