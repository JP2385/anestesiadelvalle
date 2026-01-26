// Lista de feriados estáticos usados para evitar reuniones
const staticHolidays = [
  '01-01', '02-24', '02-25', '03-24', '04-02', '05-01', '05-25',
  '06-20', '07-09', '12-25'
];

export function getNextMeetingDates(startDate = new Date(), numberOfMeetings = 6) {
  const meetings = [];
  let date = new Date(startDate);

  if (date.getDate() > 1) {
    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
  }

  while (meetings.length < numberOfMeetings) {
    const month = date.getMonth();
    const weekday = (month + 1) % 2 === 0 ? 1 : 2;
    const meeting = getFirstWeekday(new Date(date.getFullYear(), month, 1), weekday);

    if (!isHoliday(meeting) && meeting > startDate) {
      meetings.push(meeting);
    }

    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
  }

  return meetings.slice(0, numberOfMeetings);
}

export function getMeetingDateForMonth(year, month) {
  const weekday = (month + 1) % 2 === 0 ? 1 : 2;
  return getFirstWeekday(new Date(year, month, 1), weekday);
}

function getFirstWeekday(date, weekday) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = firstDay.getDay();
  let diff = (day <= weekday) ? (weekday - day) : (7 - day + weekday);
  if (day === weekday) diff = 0;
  firstDay.setDate(firstDay.getDate() + diff);
  return firstDay;
}

function isHoliday(date) {
  const monthDay = ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
  return staticHolidays.includes(monthDay);
}
