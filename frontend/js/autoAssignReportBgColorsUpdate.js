// backgroundColorUpdater.js

export function autoAssignReportBgColorsUpdate(dayIndex) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const day = days[dayIndex];

    const siteTd = document.getElementById(`${day}-sites`).closest('td');
    const availableTd = document.getElementById(`${day}-available`).closest('td');
    const assignmentsTd = document.getElementById(`${day}-assignments`).closest('td');

    const siteValue = parseInt(document.getElementById(`${day}-sites`).textContent) || 0;
    const availableValue = parseInt(document.getElementById(`${day}-available`).textContent) || 0;
    const assignmentsValue = parseInt(document.getElementById(`${day}-assignments`).textContent) || 0;

    console.log(`Day: ${day}`);
    console.log(`Site Value: ${siteValue}, Available Value: ${availableValue}, Assignments Value: ${assignmentsValue}`);

    // Reset background colors
    siteTd.style.backgroundColor = '';
    availableTd.style.backgroundColor = '';
    assignmentsTd.style.backgroundColor = '';

    // Update background colors based on the conditions
    if (siteValue > availableValue) {
        siteTd.style.backgroundColor = 'red';
        console.log(`${day} site background set to red`);
    } else if (availableValue > siteValue) {
        availableTd.style.backgroundColor = 'yellow';
        console.log(`${day} available background set to yellow`);
    }

    if (assignmentsValue > availableValue) {
        assignmentsTd.style.backgroundColor = 'yellow';
        console.log(`${day} assignments background set to yellow`);
    } else if (assignmentsValue === availableValue) {
        assignmentsTd.style.backgroundColor = ''; // Remove background color if equal
        console.log(`${day} assignments background cleared`);
    }
}
