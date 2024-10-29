    // Función para obtener el acumulado previo (Simulación)
    function getPreviousAccumulatedCounts(username) {
        return {
            week: 0,         // Valor de ejemplo previo
            weekend: 0,      // Valor de ejemplo previo
            saturday: 0      // Valor de ejemplo previo
        };
    }

    // Función para actualizar la tabla de conteo de guardias
    export function updateShiftCountsTable(weekCounts, weekendCounts, saturdayCounts) {
        const shiftCountsBody = document.getElementById('shift-counts-body');
        
        shiftCountsBody.innerHTML = '';

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

            // Valores de acumulado previo
            const previousAccumulated = getPreviousAccumulatedCounts(username);

            const accumulatedWeekCell = document.createElement('td');
            accumulatedWeekCell.textContent = (previousAccumulated.week || 0) + (weekCounts[username] || 0);
            row.appendChild(accumulatedWeekCell);

            const accumulatedWeekendCell = document.createElement('td');
            accumulatedWeekendCell.textContent = (previousAccumulated.weekend || 0) + (weekendCounts[username] || 0);
            row.appendChild(accumulatedWeekendCell);

            const accumulatedSaturdayCell = document.createElement('td');
            accumulatedSaturdayCell.textContent = (previousAccumulated.saturday || 0) + (saturdayCounts[username] || 0);
            row.appendChild(accumulatedSaturdayCell);

            shiftCountsBody.appendChild(row);
        });
    }
