import { getNextMeetingDates } from './meetingsUtils.js';

document.addEventListener('DOMContentLoaded', function () {
    const meetingDatesList = document.getElementById('meeting-dates');
    if (!meetingDatesList) return; // Protege contra HTMLs sin este elemento

    window.toggleMeetingDates = function () {
        if (meetingDatesList.style.display === 'none') {
            updateMeetingDates();
            meetingDatesList.style.display = 'block';
        } else {
            meetingDatesList.style.display = 'none';
        }
    };

    function updateMeetingDates() {
        meetingDatesList.innerHTML = '';
        const meetingDates = getNextMeetingDates();

        meetingDates.forEach(date => {
            meetingDatesList.appendChild(createListItem(date));
        });
    }

    function createListItem(date) {
        const listItem = document.createElement('li');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        listItem.textContent = date.toLocaleDateString('es-ES', options);
        return listItem;
    }

    updateMeetingDates();
});