import { getAccumulatedLongDays } from './longDaysCount.js';

export function countLongDays() {
    const longDaysCount = {};
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (workSiteElement) {
            const workSite = workSiteElement.textContent.trim();
            const selects = row.querySelectorAll('select');

            selects.forEach((select) => {
                const selectedOption = select.options[select.selectedIndex];
                const userId = selectedOption.value;
                const username = selectedOption.getAttribute('data-username') || selectedOption.text;

                // Si el sitio de trabajo incluye 'largo' y el usuario tiene un ID válido
                if (userId && workSite.toLowerCase().includes('largo')) {
                    if (!longDaysCount[userId]) {
                        longDaysCount[userId] = { username, count: 0 };
                    }
                    longDaysCount[userId].count++;
                }
            });
        }
    }

    console.log(longDaysCount);
    return longDaysCount;
}


export function collectAssignments() {
    const assignments = {};
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (workSiteElement) {
            const workSite = workSiteElement.textContent.trim();
            const selects = row.querySelectorAll('select');

            // Recorremos los selectores para obtener las asignaciones
            selects.forEach((select, index) => {
                const selectedOption = select.options[select.selectedIndex];
                const userId = selectedOption.value;
                const username = selectedOption.getAttribute('data-username') || selectedOption.text;
                
                const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index];

                if (!assignments[day]) {
                    assignments[day] = [];
                }

                // Solo agregar si hay una asignación válida
                if (userId) {
                    assignments[day].push({
                        workSite: workSite,
                        userId: userId,
                        username: username
                    });
                }
            });
        }
    }

    return assignments;
}

export function selectBestConfiguration(allLongDaysCounts, allAssignments) {
    // Asegúrate de obtener `longDaysSumGlobal`
    const longDaysSumGlobal = getAccumulatedLongDays();
    
    if (!longDaysSumGlobal || Object.keys(longDaysSumGlobal).length === 0) {
        console.error('longDaysSumGlobal está indefinido o vacío');
        return;
    }

    let minTwoLongDaysUsers = Infinity;
    let bestConfigurations = [];
    let maxUniqueUsers = 0; // Inicializamos maxUniqueUsers

    console.log("Etapa 1: Encontrar las configuraciones con el menor número de usuarios con 2 días largos.");

    // Etapa 1: Encontrar las configuraciones con el menor número de usuarios con 2 días largos
    allLongDaysCounts.forEach((longDaysCount, index) => {
        const twoLongDaysUsers = countUsersWithTwoLongDays(longDaysCount);
        
        if (twoLongDaysUsers < minTwoLongDaysUsers) {
            minTwoLongDaysUsers = twoLongDaysUsers;
            bestConfigurations = [index];
        } else if (twoLongDaysUsers === minTwoLongDaysUsers) {
            bestConfigurations.push(index);
        }
    });

    console.log("Configuraciones con menos usuarios con 2 días largos:", bestConfigurations);
    
    console.log("Etapa 2: Calcular la dispersión del conteo acumulado de días largos en las mejores configuraciones.");

    // Etapa 2: Calcular la dispersión del conteo acumulado de días largos en las mejores configuraciones
    const dispersions = bestConfigurations.map((configIndex) => {
        return calculateDispertion(allLongDaysCounts[configIndex], longDaysSumGlobal);
    });

    // Encontrar la configuración con la menor dispersión
    let minDispertion = Math.min(...dispersions);
    let mostBalancedConfigurations = bestConfigurations.filter((configIndex, i) => dispersions[i] === minDispertion);

    // Log para ver las configuraciones con la menor dispersión y su valor de dispersión
    console.log("Configuraciones con la menor dispersión:");
    mostBalancedConfigurations.forEach((configIndex, i) => {
        console.log(`Configuración ${configIndex + 1}: dispersión = ${dispersions[bestConfigurations.indexOf(configIndex)]}`);
    });

    // Etapa 3: Si hay múltiples configuraciones con la misma dispersión, aplicar la lógica de Q1 Fundación Cardio
    if (mostBalancedConfigurations.length > 1) {
        console.log("Etapa 3: Aplicar lógica de Q1 Fundación Cardio.");

        const uniqueUserCounts = mostBalancedConfigurations.map((configIndex) => {
            return countUniqueUsersInQ1(allAssignments[configIndex]);
        });

        maxUniqueUsers = Math.max(...uniqueUserCounts);  // Definir maxUniqueUsers aquí
        let bestUniqueUserConfigurations = mostBalancedConfigurations.filter((_, index) => uniqueUserCounts[index] === maxUniqueUsers);

        console.log("Configuraciones con más usuarios únicos en Fundación Q1:", bestUniqueUserConfigurations);

        // Si todavía hay múltiples configuraciones, aplicar la lógica de minimizar asignaciones a Fundación Q1
        if (bestUniqueUserConfigurations.length > 1) {
            console.log("Minimizar asignaciones a Fundación Q1.");

            const q1AssignmentsCounts = bestUniqueUserConfigurations.map((configIndex) => {
                return countQ1Assignments(allAssignments[configIndex]);
            });

            let minMaxAssignments = Infinity;
            let mostEquitableConfigurations = [];

            q1AssignmentsCounts.forEach((assignmentsCount, index) => {
                const maxAssignments = Math.max(...Object.values(assignmentsCount));

                if (maxAssignments < minMaxAssignments) {
                    minMaxAssignments = maxAssignments;
                    mostEquitableConfigurations = [bestUniqueUserConfigurations[index]];
                } else if (maxAssignments === minMaxAssignments) {
                    mostEquitableConfigurations.push(bestUniqueUserConfigurations[index]);
                }
            });

            console.log("Configuraciones más equitativas:", mostEquitableConfigurations);

            // Si hay más de una configuración equitativa, seleccionamos una al azar
            if (mostEquitableConfigurations.length > 1) {
                const randomIndex = Math.floor(Math.random() * mostEquitableConfigurations.length);
                console.log("Seleccionando una configuración al azar de las más equitativas:", mostEquitableConfigurations[randomIndex]);

                generateReport(bestConfigurations, minTwoLongDaysUsers, maxUniqueUsers, mostEquitableConfigurations[randomIndex], allLongDaysCounts[mostEquitableConfigurations[randomIndex]]);
                return mostEquitableConfigurations[randomIndex]; // Retorna el índice
            }

            console.log("Seleccionando la configuración más equitativa:", mostEquitableConfigurations[0]);

            generateReport(bestConfigurations, minTwoLongDaysUsers, maxUniqueUsers, mostEquitableConfigurations[0], allLongDaysCounts[mostEquitableConfigurations[0]]);
            return mostEquitableConfigurations[0]; // Retorna el índice
        }

        console.log("Seleccionando la mejor configuración basada en más usuarios únicos en Fundación Q1:", bestUniqueUserConfigurations[0]);

        generateReport(bestConfigurations, minTwoLongDaysUsers, maxUniqueUsers, bestUniqueUserConfigurations[0], allLongDaysCounts[bestUniqueUserConfigurations[0]]);
        return bestUniqueUserConfigurations[0]; // Retorna el índice
    }

    // Si no hay múltiples configuraciones, asegúrate de pasar el valor de maxUniqueUsers
    console.log("Seleccionando la configuración más balanceada:", mostBalancedConfigurations[0]);

    generateReport(bestConfigurations, minTwoLongDaysUsers, maxUniqueUsers, mostBalancedConfigurations[0], allLongDaysCounts[mostBalancedConfigurations[0]]);
    return mostBalancedConfigurations[0]; // Retorna el índice
}


function calculateDispertion(currentLongDaysCount, longDaysSumGlobal) {
    console.log("---- Comenzando cálculo de dispersión ----")

    // 1. Sumar días largos acumulados y actuales por usuario
    const allCounts = Object.keys(currentLongDaysCount).map(userId => {
        const userIdStr = String(userId);  // Convertimos el ID a string para asegurar que coincida

        const currentLongDays = currentLongDaysCount[userIdStr]?.count || 0;
        const accumulatedLongDays = longDaysSumGlobal[userIdStr] || 0;

        const totalLongDays = accumulatedLongDays + currentLongDays;

        return totalLongDays;
    });

    // 2. Calcular la media de los días largos
    const mean = allCounts.reduce((sum, count) => sum + count, 0) / allCounts.length;
    console.log("Media (mean) de días largos:", mean);

    // 3. Calcular la variancia
    const variance = allCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / allCounts.length;
    console.log("Variancia (variance):", variance);

    // 4. Calcular la desviación estándar (dispersión)
    const standardDeviation = Math.sqrt(variance);
    console.log("Desviación estándar (standardDeviation):", standardDeviation);

    console.log("---- Fin del cálculo de dispersión ----");

    return standardDeviation;
}


// Función para generar el informe y volcarlo en el HTML
function generateReport(bestConfigurations, maxUniqueUsers, selectedConfigurationIndex, selectedLongDaysCount) {
    const usersWithTwoLongDays = Object.values(selectedLongDaysCount)
        .filter(user => user.count === 2)
        .map(user => user.username);

    const informSpan = document.getElementById('long-days-inform');
    if (informSpan) {
        // Crear el elemento <ul>
        const ul = document.createElement('ul');

        // Crear los elementos <li> para cada mensaje
        const configurationsMessage = `- De los 200 esquemas de programación analizados, hubo ${bestConfigurations.length} esquemas con el menor número de usuarios trabajando 2 días largos.
        - De cada uno de estos ${bestConfigurations.length} esquemas se calculó su impacto en la dispersión del acumulado de días largos, pre-seleccionando aquel/aquellos que redujeran o de ser esto imposible, incrementaran la dispersión lo menos posible.`;  // Cambiado para reflejar la cantidad de bestConfigurations
        const selectedConfigurationMessage = `- De los esquemas preseleccionados se eligió el esquema con la mayor cantidad de usuarios únicos en Fundación Q1, el número ${selectedConfigurationIndex + 1}.`;
        const twoLongDaysUsersMessage = `- Los usuarios con 2 días largos en el esquema actual son: ${usersWithTwoLongDays.join(', ') || 'Ninguno'}.`;

        const li1 = document.createElement('li');
        li1.innerText = configurationsMessage;

        const li2 = document.createElement('li');
        li2.innerText = selectedConfigurationMessage;

        const li3 = document.createElement('li');
        li3.innerText = twoLongDaysUsersMessage;

        // Agregar los <li> al <ul>
        ul.appendChild(li1);
        ul.appendChild(li2);
        ul.appendChild(li3);

        // Limpiar el contenido anterior y agregar el <ul> al elemento <span>
        informSpan.innerHTML = '';
        informSpan.appendChild(ul);
    }
}


// Función para contar usuarios únicos asignados a "Fundación Q1"
function countUniqueUsersInQ1(assignments) {
    const uniqueUsers = new Set();

    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
        assignments[day].forEach(assignment => {
            if (assignment.workSite.includes('Fundación Q1 Cardio')) {
                uniqueUsers.add(assignment.userId);
            }
        });
    });

    return uniqueUsers.size;
}


function countUsersWithTwoLongDays(longDaysCount) {
    return Object.values(longDaysCount).filter(user => user.count === 2).length;
}

function countQ1Assignments(assignments) {
    const q1Assignments = {};

    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
        assignments[day].forEach(assignment => {
            if (assignment.workSite.includes('Fundación Q1 Cardio')) {
                const userId = assignment.userId;
                if (!q1Assignments[userId]) {
                    q1Assignments[userId] = 0;
                }
                q1Assignments[userId]++;
            }
        });
    });

    return q1Assignments;
}


// Función para aplicar la mejor configuración
export function applyBestConfiguration(bestConfiguration) {
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    console.log("Best Configuration:", bestConfiguration); // Verifica la estructura

    // Recorremos cada fila de la tabla (cada work site)
    for (let row of rows) {
        const workSiteElement = row.querySelector('.work-site');
        if (workSiteElement) {
            const workSite = workSiteElement.textContent.trim();
            const selects = row.querySelectorAll('select');

            // Iterar sobre los selectores (uno por día de la semana)
            selects.forEach((select, index) => {
                const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index];

                // Verificamos si existen asignaciones para el día en la mejor configuración
                if (bestConfiguration[day]) {
                    // Encontramos la asignación para el workSite actual
                    const assignmentForDay = bestConfiguration[day].find(assignment => assignment.workSite === workSite);
                    
                    // Si hay una asignación para este workSite y este día, la aplicamos
                    if (assignmentForDay) {
                        select.value = assignmentForDay.userId;
                        select.classList.add('assigned');
                        select.classList.remove('default');
                    } else {
                    }
                } else {
                    console.warn(`No se encontró configuración para el día ${day}`);
                }
            });
        }
    }
}
