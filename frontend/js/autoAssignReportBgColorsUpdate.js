export function autoAssignReportBgColorsUpdate(dayIndex) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const day = days[dayIndex];

    const siteTd = document.getElementById(`${day}-sites`).closest('td');
    const availableTd = document.getElementById(`${day}-available`).closest('td');
    const assignmentsTd = document.getElementById(`${day}-assignments`).closest('td');

    const siteValue = parseInt(document.getElementById(`${day}-sites`).textContent) || 0;
    const availableValue = parseInt(document.getElementById(`${day}-available`).textContent) || 0;
    const assignmentsValue = parseInt(document.getElementById(`${day}-assignments`).textContent) || 0;

    console.log(`Updating background colors for ${day}`);
    console.log(`siteValue: ${siteValue}, availableValue: ${availableValue}, assignmentsValue: ${assignmentsValue}`);

    // Reset background colors
    siteTd.style.backgroundColor = '';
    availableTd.style.backgroundColor = '';
    assignmentsTd.style.backgroundColor = '';

    // Update background colors based on the conditions
    if (siteValue > availableValue) {
        siteTd.style.backgroundColor = 'rgb(238, 144, 144)';
        console.log(`Setting ${day} site background color to red`);
    } else if (availableValue > siteValue) {
        availableTd.style.backgroundColor = 'rgb(238, 230, 144)';
        console.log(`Setting ${day} available background color to yellow`);
    }

    if (assignmentsValue < availableValue) {
        assignmentsTd.style.backgroundColor = 'rgb(238, 230, 144)';
        console.log(`Setting ${day} assignments background color to yellow`);
    } else if (assignmentsValue === availableValue) {
        assignmentsTd.style.backgroundColor = ''; // Remove background color if equal
        console.log(`Clearing ${day} assignments background color`);
    }
}
