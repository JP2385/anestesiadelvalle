let holidays = []; // Variable global para almacenar los feriados

document.addEventListener('DOMContentLoaded', async function() {
    // Cargar los feriados desde el backend
    await fetchHolidays();
    
    window.toggleUpcomingPayments = function() {
        const upcomingPayments = document.getElementById('upcoming-payments');
        if (upcomingPayments.style.display === 'none') {
            updateUpcomingPayments();
            upcomingPayments.style.display = 'block';
        } else {
            upcomingPayments.style.display = 'none';
        }
    }

    async function fetchHolidays() {
        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(`${apiUrl}/holidays`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            holidays = await response.json();
            console.log("Feriados cargados para liquidaciones:", holidays);
        } catch (error) {
            console.error('Error al cargar los feriados:', error);
        }
    }

    function isHoliday(date) {
        const dateString = date.toISOString().slice(0, 10);
        return holidays.some(holiday => {
            const holidayStart = holiday.startDate.slice(0, 10);
            const holidayEnd = holiday.endDate.slice(0, 10);
            return dateString >= holidayStart && dateString <= holidayEnd;
        });
    }

    function isBusinessDay(date) {
        const day = date.getDay();
        // No es fin de semana (0=domingo, 6=sábado) y no es feriado
        return day !== 0 && day !== 6 && !isHoliday(date);
    }

    function updateUpcomingPayments() {
        const upcomingPaymentsList = document.getElementById('upcoming-payments');
        upcomingPaymentsList.innerHTML = ''; 

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const currentDay = today.getDate();

        let firstDate, secondDate;

        if (currentDay <= 16) {
            // Si estamos antes o en el día 16, mostrar liquidación del 16 de este mes y último día del mes
            firstDate = getBusinessDayOnOrBefore16(new Date(currentYear, currentMonth, 16));
            secondDate = getLastBusinessDay(currentMonth, currentYear);
        } else {
            // Si ya pasó el 16, mostrar último día de este mes y 16 del mes siguiente
            firstDate = getLastBusinessDay(currentMonth, currentYear);
            secondDate = getBusinessDayOnOrBefore16(new Date(currentYear, currentMonth + 1, 16));
        }

        upcomingPaymentsList.appendChild(createListItem(firstDate));
        upcomingPaymentsList.appendChild(createListItem(secondDate));
    }

    function getBusinessDayOnOrBefore16(date) {
        // Si el 16 es día hábil, devolver el 16
        // Si no, buscar el día hábil inmediatamente anterior
        let checkDate = new Date(date);
        
        while (!isBusinessDay(checkDate)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        return checkDate;
    }

    function getLastBusinessDay(month, year) {
        // Obtener el último día del mes
        const lastDay = new Date(year, month + 1, 0);
        
        // Buscar el último día hábil retrocediendo si es necesario
        while (!isBusinessDay(lastDay)) {
            lastDay.setDate(lastDay.getDate() - 1);
        }
        
        return lastDay;
    }

    function createListItem(date) {
        const listItem = document.createElement('li');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        listItem.textContent = date.toLocaleDateString('es-ES', options);
        return listItem;
    }

    updateUpcomingPayments();
});
