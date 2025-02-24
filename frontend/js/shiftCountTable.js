export async function calculateAccumulatedShiftCounts(selectedYear, selectedMonth) {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com';
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

        // Filtrar los horarios para incluir solo los registros anteriores al año y mes seleccionados
        monthlySchedules.forEach(schedule => {
            const [year, month] = schedule.month.split('-').map(Number);

            // Condiciones para acumular: años anteriores o meses anteriores del mismo año
            if (year < selectedYear || (year === selectedYear && month < selectedMonth + 1)) {
                schedule.shiftCounts.forEach(count => {
                    const { username, weekdayShifts = 0, weekendShifts = 0, saturdayShifts = 0 } = count;

                    // Inicializar acumulado si no existe
                    if (!accumulatedCounts[username]) {
                        accumulatedCounts[username] = { week: 0, weekend: 0, saturday: 0 };
                    }

                    // Aplicar el multiplicador de 1.1667 para el usuario "nvela"
                    const adjustedWeekdayShifts = username === "nvela" ? weekdayShifts * 1.1667 : weekdayShifts;
                    const adjustedWeekendShifts = username === "nvela" ? weekendShifts * 1.1667 : weekendShifts;

                    // Acumular valores ajustados
                    accumulatedCounts[username].week += adjustedWeekdayShifts;
                    accumulatedCounts[username].weekend += adjustedWeekendShifts;
                    accumulatedCounts[username].saturday += saturdayShifts; // Este valor no cambia
                });
            }
        });

        return accumulatedCounts;
    } catch (error) {
        console.error('Error al calcular el acumulado de guardias:', error);
        return {};
    }
}

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

        // Obtiene los valores de las guardias del mes actual
        const weekCount = weekCounts[username] || 0;
        const weekendCount = weekendCounts[username] || 0;
        const saturdayCount = saturdayCounts[username] || 0;

        // Ajusta los valores para el usuario "nvela" dividiendo por 1.1667
        const adjustedWeekCount = username === "nvela" ? Math.round(weekCount / 1.1667) : weekCount;
        const adjustedWeekendCount = username === "nvela" ? Math.round(weekendCount / 1.1667) : weekendCount;        

        const weekCountCell = document.createElement('td');
        weekCountCell.textContent = adjustedWeekCount % 1 !== 0 ? adjustedWeekCount.toFixed(1) : adjustedWeekCount.toFixed(0);
        row.appendChild(weekCountCell);

        const weekendCountCell = document.createElement('td');
        weekendCountCell.textContent = adjustedWeekendCount % 1 !== 0 ? adjustedWeekendCount.toFixed(1) : adjustedWeekendCount.toFixed(0);
        row.appendChild(weekendCountCell);

        const saturdayCountCell = document.createElement('td');
        saturdayCountCell.textContent = saturdayCount.toFixed(0);
        row.appendChild(saturdayCountCell);

        // Acumulado previo y cálculo del nuevo acumulado sumando los datos actuales del DOM
        const previousAccumulated = previousAccumulatedCounts[username] || { week: 0, weekend: 0, saturday: 0 };
        
        // Ajusta el acumulado previo para "nvela" dividiendo por 1.1667
        const adjustedPreviousWeek = username === "nvela" ? Math.round(previousAccumulated.week / 1.1667) : previousAccumulated.week;
        const adjustedPreviousWeekend = username === "nvela" ? Math.round(previousAccumulated.weekend / 1.1667) : previousAccumulated.weekend;

        const newAccumulatedWeek = adjustedPreviousWeek + adjustedWeekCount;
        const newAccumulatedWeekend = adjustedPreviousWeekend + adjustedWeekendCount;
        const newAccumulatedSaturday = previousAccumulated.saturday + saturdayCount;

        const accumulatedWeekCell = document.createElement('td');
        accumulatedWeekCell.textContent = newAccumulatedWeek % 1 !== 0 ? newAccumulatedWeek.toFixed(1) : newAccumulatedWeek.toFixed(0);
        row.appendChild(accumulatedWeekCell);

        const accumulatedWeekendCell = document.createElement('td');
        accumulatedWeekendCell.textContent = newAccumulatedWeekend % 1 !== 0 ? newAccumulatedWeekend.toFixed(1) : newAccumulatedWeekend.toFixed(0);
        row.appendChild(accumulatedWeekendCell);

        const accumulatedSaturdayCell = document.createElement('td');
        accumulatedSaturdayCell.textContent = newAccumulatedSaturday.toFixed(0);
        row.appendChild(accumulatedSaturdayCell);

        shiftCountsBody.appendChild(row);
    });
}




