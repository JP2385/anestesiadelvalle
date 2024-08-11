export function countLongDays() {
    const longDaysCount = {};
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (workSiteElement) {
            const workSite = workSiteElement.textContent.trim();
            const selects = row.querySelectorAll('select');

            selects.forEach(select => {
                const selectedOption = select.options[select.selectedIndex];
                const userId = selectedOption.value;
                const username = selectedOption.getAttribute('data-username') || selectedOption.text;

                if (userId && workSite.toLowerCase().includes('largo')) {
                    if (!longDaysCount[userId]) {
                        longDaysCount[userId] = { username, count: 0 };
                    }
                    longDaysCount[userId].count++;
                }
            });
        }
    }

    return longDaysCount;
}

export function selectBestConfiguration(allLongDaysCounts) {
    let minTwoLongDaysUsers = Infinity;
    let bestConfigurations = [];

    allLongDaysCounts.forEach((longDaysCount, index) => {
        const twoLongDaysUsers = countUsersWithTwoLongDays(longDaysCount);
        if (twoLongDaysUsers < minTwoLongDaysUsers) {
            minTwoLongDaysUsers = twoLongDaysUsers;
            bestConfigurations = [index]; // Reiniciar la lista con la nueva mejor configuración
        } else if (twoLongDaysUsers === minTwoLongDaysUsers) {
            bestConfigurations.push(index); // Añadir la configuración a la lista
        }
    });

    console.log(`Best configurations with ${minTwoLongDaysUsers} users having two long days:`, bestConfigurations);

    // Seleccionar una configuración al azar de las mejores configuraciones
    const randomIndex = bestConfigurations[Math.floor(Math.random() * bestConfigurations.length)];
    console.log(`Selected configuration at index: ${randomIndex}`);
    return allLongDaysCounts[randomIndex];
}

function countUsersWithTwoLongDays(longDaysCount) {
    return Object.values(longDaysCount).filter(user => user.count === 2).length;
}

// Función para aplicar la mejor configuración
export function applyBestConfiguration(bestConfiguration) {
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (workSiteElement) {
            const workSite = workSiteElement.textContent.trim();
            const selects = row.querySelectorAll('select');

            selects.forEach(select => {
                const selectedOption = select.options[select.selectedIndex];
                const userId = selectedOption.value;

                if (bestConfiguration[userId]) {
                    select.value = userId;
                }
            });
        }
    }
}
