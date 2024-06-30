document.addEventListener('DOMContentLoaded', function() {
    window.toggleUpcomingPayments = function() {
        const upcomingPayments = document.getElementById('upcoming-payments');
        if (upcomingPayments.style.display === 'none') {
            updateUpcomingPayments();
            upcomingPayments.style.display = 'block';
        } else {
            upcomingPayments.style.display = 'none';
        }
    }

    function updateUpcomingPayments() {
        const upcomingPaymentsList = document.getElementById('upcoming-payments');
        upcomingPaymentsList.innerHTML = ''; 

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const currentDay = today.getDate();

        let firstDate, secondDate;

        if (currentDay <= 15) {
            firstDate = getPreviousBusinessDay(new Date(currentYear, currentMonth, 15));
            secondDate = getLastBusinessDay(new Date(currentYear, currentMonth));
        } else {
            firstDate = getLastBusinessDay(new Date(currentYear, currentMonth));
            secondDate = getPreviousBusinessDay(new Date(currentYear, currentMonth + 1, 15));
        }

        upcomingPaymentsList.appendChild(createListItem(firstDate));
        upcomingPaymentsList.appendChild(createListItem(secondDate));
    }

    function getPreviousBusinessDay(date) {
        const day = date.getDay();
        const diff = (day === 0) ? -2 : (day === 6) ? -1 : 0;
        date.setDate(date.getDate() + diff);
        return date;
    }

    function getLastBusinessDay(date) {
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const day = lastDay.getDay();
        const diff = (day === 0) ? -2 : (day === 6) ? -1 : 0;
        lastDay.setDate(lastDay.getDate() + diff);
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
