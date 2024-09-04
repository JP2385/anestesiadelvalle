export async function countAssignmentsByDay() {
    const selects = document.querySelectorAll('select');
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'];
    const counts = {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0
    };
    const contents = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: []
    };

    selects.forEach(select => {
        if (select.value) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const dayName = dayHeaders[dayColumnIndex - 1].split('-')[0];
            const selectedText = select.options[select.selectedIndex].text; // Obtener el texto del option seleccionado
            
            if (dayName === 'monday') {
                counts.monday++;
                contents.monday.push(selectedText);
            } else if (dayName === 'tuesday') {
                counts.tuesday++;
                contents.tuesday.push(selectedText);
            } else if (dayName === 'wednesday') {
                counts.wednesday++;
                contents.wednesday.push(selectedText);
            } else if (dayName === 'thursday') {
                counts.thursday++;
                contents.thursday.push(selectedText);
            } else if (dayName === 'friday') {
                counts.friday++;
                contents.friday.push(selectedText);
            }
        }
    });

    // Update HTML with counts
    document.getElementById('monday-assignments').textContent = `${counts.monday}`;
    document.getElementById('tuesday-assignments').textContent = `${counts.tuesday}`;
    document.getElementById('wednesday-assignments').textContent = `${counts.wednesday}`;
    document.getElementById('thursday-assignments').textContent = `${counts.thursday}`;
    document.getElementById('friday-assignments').textContent = `${counts.friday}`;

    return { counts, contents };
}

export function countEnabledSelectsByDay() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const counts = days.map(() => 0);

    const table = document.querySelector('table#schedule-assistant');
    if (!table) {
        console.error("Table with id 'schedule-assistant' not found");
        return { counts };
    }

    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');

        cells.forEach((cell, index) => {
            if (index > 0 && index <= days.length) { // Skip the first column which is 'Sitio de Trabajo'
                const select = cell.querySelector('select');
                if (select && !select.disabled) {
                    counts[index - 1]++;
                }
            }
        });
    });

    updateSiteCounts(counts);
    return { counts };
}

function updateSiteCounts(counts) {
    const elements = {
        'Monday': document.getElementById('monday-sites'),
        'Tuesday': document.getElementById('tuesday-sites'),
        'Wednesday': document.getElementById('wednesday-sites'),
        'Thursday': document.getElementById('thursday-sites'),
        'Friday': document.getElementById('friday-sites')
    };

    elements.Monday.textContent = `${counts[0]}`;
    elements.Tuesday.textContent = `${counts[1]}`;
    elements.Wednesday.textContent = `${counts[2]}`;
    elements.Thursday.textContent = `${counts[3]}`;
    elements.Friday.textContent = `${counts[4]}`;
}
