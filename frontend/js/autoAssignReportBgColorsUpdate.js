export function autoAssignReportBgColorsUpdate(dayIndex) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const day = days[dayIndex];

    const siteTd = document.getElementById(`${day}-sites`).closest('td');
    const availableTd = document.getElementById(`${day}-available`).closest('td');
    const assignmentsTd = document.getElementById(`${day}-assignments`).closest('td');

    const siteValue = parseInt(document.getElementById(`${day}-sites`).textContent) || 0;
    const availableValue = parseInt(document.getElementById(`${day}-available`).textContent) || 0;
    const assignmentsValue = parseInt(document.getElementById(`${day}-assignments`).textContent) || 0;

    // Reset background colors and tooltips
    siteTd.style.backgroundColor = '';
    siteTd.querySelector('.tooltip-wrapper').removeAttribute('data-tooltip');
    availableTd.style.backgroundColor = '';
    availableTd.querySelector('.tooltip-wrapper').removeAttribute('data-tooltip');
    assignmentsTd.style.backgroundColor = '';
    assignmentsTd.querySelector('.tooltip-wrapper').removeAttribute('data-tooltip');

    // Update background colors and tooltips based on the conditions
    if (siteValue > availableValue) {
        siteTd.style.backgroundColor = 'rgb(238, 144, 144)';
        siteTd.querySelector('.tooltip-wrapper').setAttribute('data-tooltip', 'Más sitios de trabajo que anestesiólogos disponibles. Elimine un sitio de trabajo');
    } else if (availableValue > siteValue) {
        availableTd.style.backgroundColor = 'rgb(238, 230, 144)';
        availableTd.querySelector('.tooltip-wrapper').setAttribute('data-tooltip', 'Más anestesiólogos que sitios de trabajo disponibles, desbloquee un sitio de trabajo.');
    }

    if (assignmentsValue < availableValue) {
        assignmentsTd.style.backgroundColor = 'rgb(238, 230, 144)';
        assignmentsTd.querySelector('.tooltip-wrapper').setAttribute('data-tooltip', 'Anestesiologos sin asignar, si ya realizó la asignación, modifique la estructura de sus sitios de trabajo e intente una nueva asignación.');
    } else if (assignmentsValue === availableValue) {
        assignmentsTd.style.backgroundColor = ''; // Remove background color if equal
    }
}

// Add event listeners for showing tooltips
document.addEventListener('mouseover', function (e) {
    const target = e.target.closest('.tooltip-wrapper');
    if (target && target.hasAttribute('data-tooltip')) {
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = target.getAttribute('data-tooltip');
        document.body.appendChild(tooltip);

        const rect = target.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX + 10}px`;
        tooltip.style.top = `${rect.top + window.scrollY + 10}px`;
    }
});

document.addEventListener('mouseout', function (e) {
    const tooltip = document.querySelector('.custom-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
});
