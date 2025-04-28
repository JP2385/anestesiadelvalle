// frontend/js/shiftValidationUtils.js

// frontend/js/shiftValidationUtils.js

// Validar si mquiroga y lharriague están asignados el mismo día (excluyendo "V" y "ND")
export function validateMquirogaLharriague(selectConfig) {
    const daysWithBothAssigned = [];

    const assignmentsByDay = {};
    selectConfig.forEach(config => {
        if (config.assignment === 'V' || config.assignment === 'ND') {
            return; // Ignorar vacaciones o no disponibles
        }
        if (!assignmentsByDay[config.day]) {
            assignmentsByDay[config.day] = [];
        }
        assignmentsByDay[config.day].push(config.username);
    });

    for (const [day, usernames] of Object.entries(assignmentsByDay)) {
        if (usernames.includes('mquiroga') && usernames.includes('lharriague')) {
            daysWithBothAssigned.push(day);
        }
    }

    return daysWithBothAssigned;
}

// Validar que haya al menos un usuario que hace cardio asignado cada día (excluyendo "V" y "ND")
export function validateCardioAssignedEachDay() {
    const selects = Array.from(document.querySelectorAll('#shift-schedule select'));
    const daysWithoutCardio = [];

    const selectsByDay = {};
    selects.forEach(select => {
        const day = select.getAttribute('data-day');
        if (!selectsByDay[day]) {
            selectsByDay[day] = [];
        }
        selectsByDay[day].push(select);
    });

    for (const [day, selectsOfDay] of Object.entries(selectsByDay)) {
        const hasCardio = selectsOfDay.some(select => 
            select.value && 
            select.value.trim() !== '' && 
            select.value !== 'V' && 
            select.value !== 'ND' && 
            select.dataset.cardio === 'true'
        );

        if (!hasCardio) {
            daysWithoutCardio.push(day);
        }
    }

    return daysWithoutCardio;
}

// Validar que haya al menos una persona asignada a Fn y otra a Im cada día (excluyendo "V" y "ND")
export function validateFnAndImAssignedEachDay() {
    const selects = Array.from(document.querySelectorAll('#shift-schedule select'));
    const daysWithAssignments = {};

    // Agrupar por día y registrar qué asignaciones hay
    selects.forEach(select => {
        const day = select.getAttribute('data-day');
        const value = select.value.trim();

        if (value === '' || value === 'V' || value === 'ND') {
            return; // Ignorar selects vacíos, vacaciones y no disponibles
        }

        if (!daysWithAssignments[day]) {
            daysWithAssignments[day] = { hasFn: false, hasIm: false };
        }

        if (value === 'Fn') {
            daysWithAssignments[day].hasFn = true;
        } else if (value === 'Im') {
            daysWithAssignments[day].hasIm = true;
        }
    });

    // Buscar días que tengan problemas
    const daysMissingAssignments = [];

    for (const [day, assignments] of Object.entries(daysWithAssignments)) {
        if (!assignments.hasFn || !assignments.hasIm) {
            daysMissingAssignments.push({
                day,
                missingFn: !assignments.hasFn,
                missingIm: !assignments.hasIm
            });
        }
    }

    return daysMissingAssignments;
}
