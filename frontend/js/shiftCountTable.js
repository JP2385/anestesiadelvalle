// Obtener el acumulado previo de guardias desde el servidor
async function getAccumulatedShiftCounts() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';
    try {
        const response = await fetch(`${apiUrl}/accumulated-shifts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        const data = response.ok ? await response.json() : [];
        
        // Transformar el array de resultados en un objeto indexado por `username`
        return data.reduce((acc, item) => {
            acc[item.username] = {
                week: item.week,
                weekend: item.weekend,
                saturday: item.saturday
            };
            return acc;
        }, {});
    } catch (error) {
        console.error('Error al obtener el acumulado de guardias:', error);
        return {};
    }
}

// Actualizar la tabla de conteo de guardias, incluyendo acumulados
export async function updateShiftCountsTableWithAccumulated(weekCounts, weekendCounts, saturdayCounts) {
    const shiftCountsBody = document.getElementById('shift-counts-body');
    shiftCountsBody.innerHTML = '';

    // Obtener el acumulado previo desde el servidor
    const previousAccumulatedCounts = await getAccumulatedShiftCounts();
    console.log("Datos acumulados obtenidos desde el servidor:", previousAccumulatedCounts);

    // Generar la tabla mostrando el acumulado sin actualizarlo en el servidor
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

        // Valores de acumulado previo y cálculo del nuevo acumulado para mostrarlo en la tabla
        const previousAccumulated = previousAccumulatedCounts[username] || { week: 0, weekend: 0, saturday: 0 };
        const newAccumulatedWeek = (previousAccumulated.week || 0) + (weekCounts[username] || 0);
        const newAccumulatedWeekend = (previousAccumulated.weekend || 0) + (weekendCounts[username] || 0);
        const newAccumulatedSaturday = (previousAccumulated.saturday || 0) + (saturdayCounts[username] || 0);
        
        console.log(`Usuario: ${username}`);
        console.log("Conteo actual de semana:", weekCounts[username] || 0);
        console.log("Acumulado previo de semana:", previousAccumulated.week);
        console.log("Nuevo acumulado semana:", newAccumulatedWeek);
        console.log("Nuevo acumulado fin de semana:", newAccumulatedWeekend);
        console.log("Nuevo acumulado sábado:", newAccumulatedSaturday);

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
        console.log(`Fila añadida a la tabla para usuario ${username}`);
    });
}
