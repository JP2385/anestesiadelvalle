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

    // Encontrar las configuraciones con el menor número de usuarios con 2 días largos
    allLongDaysCounts.forEach((longDaysCount, index) => {
        const twoLongDaysUsers = countUsersWithTwoLongDays(longDaysCount);
        if (twoLongDaysUsers < minTwoLongDaysUsers) {
            minTwoLongDaysUsers = twoLongDaysUsers;
            bestConfigurations = [index]; // Reiniciar la lista con la nueva mejor configuración
        } else if (twoLongDaysUsers === minTwoLongDaysUsers) {
            bestConfigurations.push(index); // Añadir la configuración a la lista
        }
    });

    // Seleccionar una configuración al azar de las mejores configuraciones
    const randomIndexInBest = Math.floor(Math.random() * bestConfigurations.length); // Índice aleatorio en el array bestConfigurations
    const selectedConfigIndex = bestConfigurations[randomIndexInBest]; // Índice real de la configuración seleccionada en allLongDaysCounts
    const selectedLongDaysCount = allLongDaysCounts[selectedConfigIndex]; // Obtener el longDaysCount para la configuración seleccionada

    // Filtrar los usuarios con 2 días largos
    const usersWithTwoLongDays = Object.values(selectedLongDaysCount)
        .filter(user => user.count === 2)
        .map(user => user.username);

    // Construir el mensaje dinámico
    const informSpan = document.getElementById('long-days-inform');
    if (informSpan) {
        // Crear el elemento <ul>
        const ul = document.createElement('ul');

        // Crear los elementos <li> para cada mensaje
        const configurationsMessage = `- De los 200 esquemas de programación analizados hubo ${bestConfigurations.length} esquemas con ${minTwoLongDaysUsers} usuarios trabajando 2 días largos.`;
        const selectedConfigurationMessage = `- Se seleccionó uno de ellos en forma aleatoria, el número ${randomIndexInBest + 1}.`;
        const usersMessage = `- Los usuarios con 2 días largos son: ${usersWithTwoLongDays.join(', ') || 'Ninguno'}.`;

        const li1 = document.createElement('li');
        li1.innerText = configurationsMessage;

        const li2 = document.createElement('li');
        li2.innerText = selectedConfigurationMessage;

        const li3 = document.createElement('li');
        li3.innerText = usersMessage;

        // Agregar los <li> al <ul>
        ul.appendChild(li1);
        ul.appendChild(li2);
        ul.appendChild(li3);

        // Limpiar el contenido anterior y agregar el <ul> al elemento <span>
        informSpan.innerHTML = '';
        informSpan.appendChild(ul);
    }

    // Devolver la mejor configuración seleccionada
    return allLongDaysCounts[selectedConfigIndex];
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
