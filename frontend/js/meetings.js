document.addEventListener('DOMContentLoaded', function() {
    window.toggleMeetingDates = function() {
        const meetingDates = document.getElementById('meeting-dates');
        if (meetingDates.style.display === 'none') {
            updateMeetingDates();
            meetingDates.style.display = 'block';
        } else {
            meetingDates.style.display = 'none';
        }
    }

    function updateMeetingDates() {
        const meetingDatesList = document.getElementById('meeting-dates');
        meetingDatesList.innerHTML = ''; 

        const today = new Date();
        const meetingDates = getNextMeetingDates(today, 6);

        meetingDates.forEach(date => {
            meetingDatesList.appendChild(createListItem(date));
        });
    }

    function getNextMeetingDates(startDate, numberOfMeetings) {
        const holidays = [
            '01-01', '02-24', '02-25', '03-24', '04-02', '05-01', '05-25', 
            '06-20', '07-09', '12-25'
        ];

        const meetings = [];
        let date = new Date(startDate);

        if (date.getDate() > 1) {
            date.setMonth(date.getMonth() + 1);
            date.setDate(1);
        }

        while (meetings.length < numberOfMeetings) {
            const month = date.getMonth();
            if ((month + 1) % 2 === 0) {
                date = getFirstWeekday(new Date(date.getFullYear(), month, 1), 1); 
            } else {
                date = getFirstWeekday(new Date(date.getFullYear(), month, 1), 2); 
            }

            if (!isHoliday(date, holidays) && date > startDate) {
                meetings.push(new Date(date));
            }

            date.setMonth(date.getMonth() + 1);
            date.setDate(1); 
        }

        while (meetings.length > numberOfMeetings) {
            meetings.shift();
        }

        return meetings;
    }

    function getFirstWeekday(date, weekday) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const day = firstDay.getDay();
        let diff = (day <= weekday) ? (weekday - day) : (7 - day + weekday);
        if (day === weekday) {
            diff = 0;
        }
        firstDay.setDate(firstDay.getDate() + diff);
        return firstDay;
    }

    function isHoliday(date, holidays) {
        const monthDay = ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
        return holidays.includes(monthDay);
    }

    function createListItem(date) {
        const listItem = document.createElement('li');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        listItem.textContent = date.toLocaleDateString('es-ES', options);
        return listItem;
    }

    updateMeetingDates();
});
