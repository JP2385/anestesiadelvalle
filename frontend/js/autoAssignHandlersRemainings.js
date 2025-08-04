import { autoAssignRemainingSlotsByDay, grupoRioNegro, grupoNeuquen } from './autoAssignDayFunctions.js';

export async function autoAssignRemainingsByDay(apiUrl, dayIndex, availability, assignedUsers) {
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayName = dayNames[dayIndex];

    if (!availability?.[dayName]) {
        console.error(`Day name ${dayName} does not exist in availability.`);
        return;
    }

    const availableUsers = availability[dayName];

    const dayHeaderId = `${dayName}-header`;
    const dayHeader = document.getElementById(dayHeaderId);
    if (!dayHeader) return;

    const dayColumnIndex = Array.from(dayHeader.parentElement.children).indexOf(dayHeader);

    const workSiteElements = Array.from(document.querySelectorAll('.work-site'));
    const rows = workSiteElements.map(workSiteEl => {
        const workSiteText = workSiteEl.textContent.trim().toLowerCase();
        const row = workSiteEl.closest('tr');
        const select = row?.querySelectorAll('select')[dayIndex];
        const cellIndex = select?.closest('td')?.cellIndex ?? -1;

        const zona = grupoRioNegro.some(site => workSiteText.includes(site))
            ? 'rioNegro'
            : grupoNeuquen.some(site => workSiteText.includes(site))
                ? 'neuquen'
                : null;

        return { workSiteText, select, cellIndex, zona };
    }).filter(r => r.select);

    autoAssignRemainingSlotsByDay(rows, dayColumnIndex, availableUsers, dayName, assignedUsers);
}

