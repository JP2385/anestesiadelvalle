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
    let minTwoDayUsers = Infinity;
    let bestConfigurationIndex = null;

    allLongDaysCounts.forEach((longDaysCount, index) => {
        const twoDayUsersCount = countTwoDayUsers(longDaysCount);

        if (twoDayUsersCount < minTwoDayUsers) {
            minTwoDayUsers = twoDayUsersCount;
            bestConfigurationIndex = index;
        }
    });

    return allLongDaysCounts[bestConfigurationIndex];
}

// Función para contar usuarios con 2 días largos
function countTwoDayUsers(longDaysCount) {
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
