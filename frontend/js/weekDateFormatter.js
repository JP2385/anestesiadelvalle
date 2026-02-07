/**
 * Utilidades compartidas para formateo de fechas de la semana
 */

/**
 * Obtiene el nombre del día en español
 * @param {number} dayIndex - Índice del día (0=lunes, 1=martes, etc.)
 * @returns {string} Nombre del día en español
 */
function getDayName(dayIndex) {
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    return dayNames[dayIndex] || '';
}

/**
 * Obtiene el nombre del mes en español (formato corto)
 * @param {number} monthIndex - Índice del mes (0=enero, 1=febrero, etc.)
 * @returns {string} Nombre del mes en español
 */
function getMonthName(monthIndex) {
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return monthNames[monthIndex] || '';
}

/**
 * Formatea una fecha para el header de la tabla (formato corto)
 * Ejemplo: "Lunes 3"
 * @param {Date} date - Objeto Date
 * @param {number} dayIndex - Índice del día de la semana (0=lunes)
 * @returns {string} Fecha formateada
 */
export function formatDateShort(date, dayIndex) {
    const dayName = getDayName(dayIndex);
    const day = date.getDate();
    return `${dayName} ${day}`;
}

/**
 * Formatea una fecha para vista detallada (formato largo)
 * Ejemplo: "Lunes 3 de enero"
 * @param {Date} date - Objeto Date
 * @param {number} dayIndex - Índice del día de la semana (0=lunes)
 * @returns {string} Fecha formateada
 */
export function formatDateLong(date, dayIndex) {
    const dayName = getDayName(dayIndex);
    const day = date.getDate();
    const month = getMonthName(date.getMonth());
    return `${dayName} ${day} de ${month}`;
}

/**
 * Genera un objeto con los headers de los días para toda la semana
 * @param {Date|string} weekStart - Fecha de inicio de semana (sábado)
 * @param {boolean} longFormat - true para formato largo, false para corto
 * @returns {Object} Objeto con keys monday, tuesday, etc.
 */
export function generateWeekHeaders(weekStart, longFormat = false) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const headers = {};
    
    // Si weekStart es un string en formato ISO, parsearlo correctamente
    // para evitar problemas con zonas horarias
    let startDate;
    if (typeof weekStart === 'string') {
        const [year, month, day] = weekStart.split('T')[0].split('-').map(Number);
        startDate = new Date(year, month - 1, day);
    } else {
        startDate = new Date(weekStart);
    }

    // weekStart es el sábado, pero necesitamos empezar desde el lunes
    // El lunes es 2 días después del sábado
    const mondayDate = new Date(startDate);
    mondayDate.setDate(startDate.getDate() + 2);

    days.forEach((day, index) => {
        const date = new Date(mondayDate);
        date.setDate(mondayDate.getDate() + index);

        headers[day] = longFormat
            ? formatDateLong(date, index)
            : formatDateShort(date, index);
    });

    return headers;
}
