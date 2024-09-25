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
    let minTwoLongDaysUsers = Infinity;
    let bestConfigurations = [];

    // Encontrar las configuraciones con el menor número de usuarios con 2 días largos
    allLongDaysCounts.forEach((longDaysCount, index) => {
        const twoLongDaysUsers = countUsersWithTwoLongDays(longDaysCount);
        
        if (twoLongDaysUsers < minTwoLongDaysUsers) {
            minTwoLongDaysUsers = twoLongDaysUsers;
            bestConfigurations = [index];
        } else if (twoLongDaysUsers === minTwoLongDaysUsers) {
            bestConfigurations.push(index);
        }
    });

    // Contar cuántos usuarios únicos han sido asignados a "Fundación Q1"
    const uniqueUserCounts = bestConfigurations.map((configIndex) => {
        return countUniqueUsersInQ1(allAssignments[configIndex]);
    });

    // Encontrar la configuración con el mayor número de usuarios únicos asignados a Fundación Q1
    let maxUniqueUsers = Math.max(...uniqueUserCounts);
    let bestUniqueUserConfigurations = bestConfigurations.filter((_, index) => uniqueUserCounts[index] === maxUniqueUsers);

    // Si todavía hay múltiples configuraciones, minimizar la cantidad de asignaciones a Fundación Q1 por usuario
    if (bestUniqueUserConfigurations.length > 1) {
    
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

        // Si hay más de una configuración equitativa, seleccionamos una al azar
        if (mostEquitableConfigurations.length > 1) {
            const randomIndex = Math.floor(Math.random() * mostEquitableConfigurations.length);
            generateReport(bestConfigurations.length, minTwoLongDaysUsers, maxUniqueUsers, mostEquitableConfigurations[randomIndex], allLongDaysCounts[mostEquitableConfigurations[randomIndex]]);
            return mostEquitableConfigurations[randomIndex]; // Retorna el índice
        }

        generateReport(bestConfigurations.length, minTwoLongDaysUsers, maxUniqueUsers, mostEquitableConfigurations[0], allLongDaysCounts[mostEquitableConfigurations[0]]);
        return mostEquitableConfigurations[0]; // Retorna el índice
    }

    generateReport(bestConfigurations.length, minTwoLongDaysUsers, maxUniqueUsers, bestUniqueUserConfigurations[0], allLongDaysCounts[bestUniqueUserConfigurations[0]]);
    return bestUniqueUserConfigurations[0]; // Retorna el índice
}

// Función para generar el informe y volcarlo en el HTML
function generateReport(totalConfigurations, minTwoLongDaysUsers, maxUniqueUsers, selectedConfigurationIndex, selectedLongDaysCount) {
    const usersWithTwoLongDays = Object.values(selectedLongDaysCount)
        .filter(user => user.count === 2)
        .map(user => user.username);

    const informSpan = document.getElementById('long-days-inform');
    if (informSpan) {
        // Crear el elemento <ul>
        const ul = document.createElement('ul');

        // Crear los elementos <li> para cada mensaje
        const configurationsMessage = `- De los 200 esquemas de programación analizados, hubo ${minTwoLongDaysUsers} esquemas con ${minTwoLongDaysUsers} usuarios trabajando 2 días largos.`;
        const selectedConfigurationMessage = `- Se seleccionó el esquema con la mayor cantidad de usuarios únicos en Fundación Q1, el número ${selectedConfigurationIndex + 1}.`;
        const uniqueUsersMessage = `- El número máximo de usuarios únicos asignados a Fundación Q1 fue de: ${maxUniqueUsers}.`;
        const twoLongDaysUsersMessage = `- Los usuarios con 2 días largos en el esquema elegido son: ${usersWithTwoLongDays.join(', ') || 'Ninguno'}.`;

        const li1 = document.createElement('li');
        li1.innerText = configurationsMessage;

        const li2 = document.createElement('li');
        li2.innerText = selectedConfigurationMessage;

        const li3 = document.createElement('li');
        li3.innerText = uniqueUsersMessage;

        const li4 = document.createElement('li');
        li4.innerText = twoLongDaysUsersMessage;

        // Agregar los <li> al <ul>
        ul.appendChild(li1);
        ul.appendChild(li2);
        ul.appendChild(li3);
        ul.appendChild(li4);

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
            if (assignment.workSite.includes('Fundación Q1')) {
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
