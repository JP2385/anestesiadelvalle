import { getAccumulatedLongDays } from './longDaysCount.js';

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DEBUG = false;

export function countLongDays() {
    const longDaysCount = {};
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (workSiteElement) {
            const workSite = workSiteElement.textContent.trim().toLowerCase();
            const selects = row.querySelectorAll('select');

            if (!workSite.includes('largo')) continue;

            selects.forEach(select => {
                const userId = select.value;
                if (!userId) return;

                const username = select.options[select.selectedIndex].getAttribute('data-username') || select.options[select.selectedIndex].text;

                if (!longDaysCount[userId]) {
                    longDaysCount[userId] = { username, count: 0 };
                }
                longDaysCount[userId].count++;
            });
        }
    }

    return longDaysCount;
}

export function collectAssignments(rows) {
    const assignments = {};
    const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (!workSiteElement) continue;

        const workSite = workSiteElement.textContent.trim();
        const selects = row.querySelectorAll('select');

        selects.forEach((select, index) => {
            const userId = select.value;
            if (!userId) return;

            const selectedOption = select.options[select.selectedIndex];
            const username = selectedOption.getAttribute('data-username') || selectedOption.text;
            const day = WEEK_DAYS[index];

            if (!assignments[day]) assignments[day] = [];

            assignments[day].push({ workSite, userId, username });
        });
    }

    return assignments;
}


export function selectBestConfiguration(allLongDaysCounts, allAssignments) {
    const longDaysSumGlobal = getAccumulatedLongDays();
    if (!longDaysSumGlobal || Object.keys(longDaysSumGlobal).length === 0) {
        console.error('longDaysSumGlobal está indefinido o vacío');
        return;
    }

    let minTwoLongDaysUsers = Infinity;
    let bestConfigurations = [];
    let maxUniqueUsers = 0;

    // Etapa 1
    allLongDaysCounts.forEach((longDaysCount, index) => {
        const count = countUsersWithTwoLongDays(longDaysCount);
        if (count < minTwoLongDaysUsers) {
            minTwoLongDaysUsers = count;
            bestConfigurations = [index];
        } else if (count === minTwoLongDaysUsers) {
            bestConfigurations.push(index);
        }
    });

    // Etapa 2
    const dispersions = bestConfigurations.map(i => calculateDispertion(allLongDaysCounts[i], longDaysSumGlobal));
    const minDisp = Math.min(...dispersions);
    const mostBalancedConfigurations = bestConfigurations.filter((i, idx) => dispersions[idx] === minDisp);

    // Etapa 3
    if (mostBalancedConfigurations.length > 1) {
        const uniqueUserCounts = mostBalancedConfigurations.map(i => countUniqueUsersInQ1(allAssignments[i]));
        maxUniqueUsers = Math.max(...uniqueUserCounts);
        const bestUniqueUsers = mostBalancedConfigurations.filter((_, idx) => uniqueUserCounts[idx] === maxUniqueUsers);

        if (bestUniqueUsers.length > 1) {
            const q1AssignmentCounts = bestUniqueUsers.map(i => countQ1Assignments(allAssignments[i]));
            const minMax = Math.min(...q1AssignmentCounts.map(q1 => Math.max(...Object.values(q1))));
            const equitable = bestUniqueUsers.filter((i, idx) => {
                const max = Math.max(...Object.values(q1AssignmentCounts[idx]));
                return max === minMax;
            });

            const selected = equitable.length > 1 ? equitable[Math.floor(Math.random() * equitable.length)] : equitable[0];
            generateReport(bestConfigurations, minTwoLongDaysUsers, maxUniqueUsers, selected, allLongDaysCounts[selected]);
            return selected;
        }

        const selected = bestUniqueUsers[0];
        generateReport(bestConfigurations, minTwoLongDaysUsers, maxUniqueUsers, selected, allLongDaysCounts[selected]);
        return selected;
    }

    const selected = mostBalancedConfigurations[0];
    generateReport(bestConfigurations, minTwoLongDaysUsers, maxUniqueUsers, selected, allLongDaysCounts[selected]);
    return selected;
}

function calculateDispertion(currentLongDaysCount, longDaysSumGlobal) {
    const allCounts = Object.entries(currentLongDaysCount).map(([userId, obj]) => {
        const total = (longDaysSumGlobal[userId] || 0) + obj.count;
        return total;
    });

    const mean = allCounts.reduce((sum, val) => sum + val, 0) / allCounts.length;
    const variance = allCounts.reduce((sum, val) => sum + (val - mean) ** 2, 0) / allCounts.length;
    return Math.sqrt(variance);
}

function generateReport(bestConfigurations, maxUniqueUsers, selectedConfigurationIndex, selectedLongDaysCount) {
    const informSpan = document.getElementById('long-days-inform');
    if (!informSpan) return;

    const ul = document.createElement('ul');
    const usersWithTwoLongDays = Object.values(selectedLongDaysCount).filter(u => u.count === 2).map(u => u.username);

    const li1 = document.createElement('li');
    li1.innerText = `- De los 200 esquemas de programación analizados, hubo ${bestConfigurations.length} esquemas con el menor número de usuarios trabajando 2 días largos.`;

    const li2 = document.createElement('li');
    li2.innerText = `- De los esquemas preseleccionados se eligió el esquema con la mayor cantidad de usuarios únicos en Fundación Q1, el número ${selectedConfigurationIndex + 1}.`;

    const li3 = document.createElement('li');
    li3.innerText = `- Los usuarios con 2 días largos en el esquema actual son: ${usersWithTwoLongDays.join(', ') || 'Ninguno'}.`;

    [li1, li2, li3].forEach(li => ul.appendChild(li));

    informSpan.innerHTML = '';
    informSpan.appendChild(ul);
}

function countUsersWithTwoLongDays(longDaysCount) {
    return Object.values(longDaysCount).reduce((acc, u) => acc + (u.count === 2 ? 1 : 0), 0);
}

function countUniqueUsersInQ1(assignments) {
    const unique = new Set();
    WEEK_DAYS.forEach(day => {
        (assignments[day] || []).forEach(a => {
            if (a.workSite.includes('Fundación Q1 Cardio')) unique.add(a.userId);
        });
    });
    return unique.size;
}

function countQ1Assignments(assignments) {
    const counts = {};
    WEEK_DAYS.forEach(day => {
        (assignments[day] || []).forEach(a => {
            if (a.workSite.includes('Fundación Q1 Cardio')) {
                counts[a.userId] = (counts[a.userId] || 0) + 1;
            }
        });
    });
    return counts;
}

export function applyBestConfiguration(bestConfiguration) {
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (!workSiteElement) continue;

        const workSite = workSiteElement.textContent.trim();
        const selects = row.querySelectorAll('select');

        selects.forEach((select, index) => {
            const day = WEEK_DAYS[index];
            const assignment = bestConfiguration[day]?.find(a => a.workSite === workSite);
            if (assignment) {
                select.value = assignment.userId;
                select.classList.add('assigned');
                select.classList.remove('default');
            }
        });
    }
}
