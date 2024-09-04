export function updateSelectColors(dayIndex, availability) {
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayName = dayNames[dayIndex];
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const select = row.querySelectorAll('select')[dayIndex];
        if (select) {
            const selectedUserId = select.value;
            // Eliminar clases previas para evitar acumulación
            select.className = '';
    
            if (selectedUserId !== '') {
                // Obtener el horario de trabajo del usuario seleccionado
                const user = availability[dayName].find(user => user._id === selectedUserId || user.username === selectedUserId);
    
                // Asignar la clase CSS correspondiente al horario de trabajo
                if (user) {
                    if (user.workSchedule[dayName] === 'Mañana') {
                        select.classList.add('select-morning');
                    } else if (user.workSchedule[dayName] === 'Tarde') {
                        select.classList.add('select-afternoon');
                    } else if (user.workSchedule[dayName] === 'Variable') {
                        select.classList.add('select-long');
                    }
                }
            } else {
                // Si no hay usuario seleccionado, asignar la clase por defecto
                select.classList.add('default');
            }
        }
    }
}