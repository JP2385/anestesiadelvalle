let holidays = []; // Variable global para almacenar los feriados

// Función para cargar los feriados
export async function fetchHolidays(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/holidays`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        holidays = await response.json();
        console.log("Feriados cargados:", holidays);
    } catch (error) {
        console.error('Error al cargar los feriados:', error);
    }
}

// Función para verificar si una fecha es feriado
export function isHoliday(dateString) {
    return holidays.some(holiday => {
        const holidayStart = holiday.startDate.slice(0, 10);
        const holidayEnd = holiday.endDate.slice(0, 10);
        return dateString >= holidayStart && dateString <= holidayEnd;
    });
}
