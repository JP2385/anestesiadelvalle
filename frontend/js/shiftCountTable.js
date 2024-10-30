// Obtener el acumulado sumando todos los conteos de guardias mensuales para el año seleccionado, excluyendo el mes actual
async function calculateAccumulatedShiftCounts(selectedYear, selectedMonth) {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';
    try {
        const response = await fetch(`${apiUrl}/shift-schedule/all-monthly-schedules`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        
        const monthlySchedules = response.ok ? await response.json() : [];
        
        // Inicializar el objeto acumulado para cada usuario
        const accumulatedCounts = {};

        // Filtrar los horarios para incluir solo los del año seleccionado y excluir el mes actual
        monthlySchedules.forEach(schedule => {
            const [year, month] = schedule.month.split('-');
            if (parseInt(year) === selectedYear && parseInt(month) !== selectedMonth + 1) { // `selectedMonth + 1` porque `selectedMonth` es índice
                schedule.shiftCounts.forEach(count => {
                    const { username, weekdayShifts, weekendShifts, saturdayShifts } = count;
                    if (!accumulatedCounts[username]) {
                        accumulatedCounts[username] = { week: 0, weekend: 0, saturday: 0 };
                    }
                    accumulatedCounts[username].week += weekdayShifts;
                    accumulatedCounts[username].weekend += weekendShifts;
                    accumulatedCounts[username].saturday += saturdayShifts;
                });
            }
        });

        return accumulatedCounts;
    } catch (error) {
        console.error('Error al calcular el acumulado de guardias:', error);
        return {};
    }
}

// Actualizar la tabla de conteo de guardias, incluyendo acumulados
export async function updateShiftCountsTableWithAccumulated(weekCounts, weekendCounts, saturdayCounts) {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const selectedYear = parseInt(yearSelect.value);
    const selectedMonth = parseInt(monthSelect.value);

    // Obtener el acumulado previo de guardias para el año seleccionado, excluyendo el mes actual
    const previousAccumulatedCounts = await calculateAccumulatedShiftCounts(selectedYear, selectedMonth);

    const shiftCountsBody = document.getElementById('shift-counts-body');
    shiftCountsBody.innerHTML = '';

    // Generar la tabla mostrando el acumulado incluyendo los datos del mes actual desde el DOM
    Object.keys(weekCounts).forEach(username => {
        const row = document.createElement('tr');

        const userCell = document.createElement('td');
        userCell.textContent = username;
        row.appendChild(userCell);

        const weekCountCell = document.createElement('td');
        weekCountCell.textContent = weekCounts[username] || 0;
        row.appendChild(weekCountCell);

        const weekendCountCell = document.createElement('td');
        weekendCountCell.textContent = weekendCounts[username] || 0;
        row.appendChild(weekendCountCell);

        const saturdayCountCell = document.createElement('td');
        saturdayCountCell.textContent = saturdayCounts[username] || 0;
        row.appendChild(saturdayCountCell);

        // Acumulado previo y cálculo del nuevo acumulado sumando los datos actuales del DOM
        const previousAccumulated = previousAccumulatedCounts[username] || { week: 0, weekend: 0, saturday: 0 };
        const newAccumulatedWeek = (previousAccumulated.week || 0) + (weekCounts[username] || 0);
        const newAccumulatedWeekend = (previousAccumulated.weekend || 0) + (weekendCounts[username] || 0);
        const newAccumulatedSaturday = (previousAccumulated.saturday || 0) + (saturdayCounts[username] || 0);

        const accumulatedWeekCell = document.createElement('td');
        accumulatedWeekCell.textContent = newAccumulatedWeek;
        row.appendChild(accumulatedWeekCell);

        const accumulatedWeekendCell = document.createElement('td');
        accumulatedWeekendCell.textContent = newAccumulatedWeekend;
        row.appendChild(accumulatedWeekendCell);

        const accumulatedSaturdayCell = document.createElement('td');
        accumulatedSaturdayCell.textContent = newAccumulatedSaturday;
        row.appendChild(accumulatedSaturdayCell);

        shiftCountsBody.appendChild(row);
    });
}
