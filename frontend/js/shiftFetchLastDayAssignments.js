import { loadSchedule } from './shiftSchedule.js';

function getLastDayOfPreviousMonth(selectedYear, selectedMonth) {
    const date = new Date(selectedYear, selectedMonth - 1, 0); // Día 0 del mes actual es el último del anterior
    return date.toISOString().slice(0, 10); // Formato YYYY-MM-DD
}

export async function fetchLastDayAssignments(selectedYear, selectedMonth) {
    const lastDayOfPreviousMonth = getLastDayOfPreviousMonth(selectedYear, selectedMonth);
    const previousYear = lastDayOfPreviousMonth.split('-')[0];
    const previousMonth = lastDayOfPreviousMonth.split('-')[1];

    // Llama a loadSchedule para obtener todo el mes anterior
    const scheduleData = await loadSchedule(previousYear, parseInt(previousMonth, 10));

    if (scheduleData) {
        // Filtra solo las asignaciones del último día del mes
        const lastDayAssignments = scheduleData.filter(schedule => schedule.date === lastDayOfPreviousMonth);
        console.log(`Asignaciones para el último día del mes anterior (${lastDayOfPreviousMonth}):`, lastDayAssignments);
        return lastDayAssignments;
    } else {
        console.error('No se pudo cargar el horario del mes anterior.');
        return null;
    }
}
