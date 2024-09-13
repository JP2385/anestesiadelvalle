export function generateTableHeaders(schedules) {
    const thead = document.querySelector('#long-days-count-table thead tr');
    thead.innerHTML = '<th>Anestesiólogo</th><th>Total</th>'; // Reset the headers, first column is for user names, second for total

    // Add week/year columns
    schedules.forEach(schedule => {
        const th = document.createElement('th');
        const weekYear = getWeekYearFromSchedule(schedule);
        th.textContent = weekYear;
        thead.appendChild(th);
    });
}

// Generate table rows with users as rows, weeks as columns, and sorted by total long days
export function generateTableRows(schedules, users) {
    const tbody = document.querySelector('#long-days-count-table tbody');
    tbody.innerHTML = ''; // Clear existing rows

    // Step 1: Initialize an object to store the sum of long days for each user
    const longDaysSum = {};
    users.forEach(user => {
        longDaysSum[user._id] = 0; // Initialize the sum for each user
    });

    // Step 2: Accumulate the long days count for each user
    schedules.forEach(schedule => {
        users.forEach(user => {
            const userLongDaysCount = schedule.longDaysCount[user._id] ? schedule.longDaysCount[user._id].count : 0;
            // Accumulate the long days count for the user
            longDaysSum[user._id] += userLongDaysCount;
        });
    });

    // Step 3: Sort users by total long days in descending order
    const sortedUsers = users.sort((a, b) => longDaysSum[b._id] - longDaysSum[a._id]);

    // Step 4: Generate rows for each user in the sorted order
    sortedUsers.forEach(user => {
        const tr = document.createElement('tr');
        const userNameTd = document.createElement('td');
        userNameTd.textContent = user.username; // Add username in the first column
        tr.appendChild(userNameTd);

        // Add total sum for this user in the second column
        const totalTd = document.createElement('td');
        totalTd.textContent = longDaysSum[user._id];
        tr.appendChild(totalTd);

        // For each schedule, insert the long days count for this user
        schedules.forEach(schedule => {
            const td = document.createElement('td');
            const userLongDaysCount = schedule.longDaysCount[user._id] ? schedule.longDaysCount[user._id].count : 0;
            td.textContent = userLongDaysCount;
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

// Helper function to get week/year from the schedule's timestamp
export function getWeekYearFromSchedule(schedule) {
    const timestamp = new Date(schedule.timestamp);

    // Obtener el día de la semana (0 = domingo, 6 = sábado)
    let dayOfWeek = timestamp.getDay(); // 0 (domingo) a 6 (sábado)

    // Si el día es domingo (0) a viernes (5), restamos la cantidad necesaria para que pertenezca a la semana anterior
    if (dayOfWeek >= 0 && dayOfWeek < 6) {
        // Ajustamos la fecha restando el número de días para llevarla al último sábado
        const daysToSubtract = dayOfWeek + 1; // Llevamos al sábado anterior
        timestamp.setDate(timestamp.getDate() - daysToSubtract);
    }

    // Calcular la primera fecha del año (1 de enero)
    const startDate = new Date(timestamp.getFullYear(), 0, 1);

    // Calcular el número de días desde el inicio del año hasta la fecha ajustada
    const days = Math.floor((timestamp - startDate) / (24 * 60 * 60 * 1000));

    // Calcular la semana considerando que cada semana empieza el sábado
    const week = Math.ceil((timestamp.getDay() + 1 + days) / 7);

    // Obtener los últimos dos dígitos del año (yy)
    const year = timestamp.getFullYear().toString().slice(-2);

    // Asegurarnos de que la semana tenga dos dígitos (ww)
    const formattedWeek = week.toString().padStart(2, '0');

    // Devolver el resultado en formato ww/yy
    return `${formattedWeek}/${year}`;
}

