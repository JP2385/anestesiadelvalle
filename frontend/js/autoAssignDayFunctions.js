import { updateSelectBackgroundColors } from './assignUtils.js';
export function unassignUsersByDay(dayIndex) {
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'];
    const dayHeaderId = dayHeaders[dayIndex];

    if (!dayHeaderId) {
        console.error("Invalid day index provided.");
        return;
    }

    const dayHeader = document.getElementById(dayHeaderId);
    if (!dayHeader) {
        console.error(`Day header with ID ${dayHeaderId} not found.`);
        return;
    }

    const dayColumnIndex = Array.from(dayHeader.parentElement.children).indexOf(dayHeader);

    const selects = document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`); // +1 porque nth-child es 1-indexed
    selects.forEach(select => {
        if (select.value) {
            select.value = "";
        }
    });
    updateSelectBackgroundColors();
}

export function assignSpecificUsersByDay(dayIndex, scheme, user, assignedUsers) {
    // Evitar doble asignación
    if (assignedUsers.has(user.username)) return;

    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'];
    const dayHeaderId = dayHeaders[dayIndex];

    if (!dayHeaderId) {
        console.error("Invalid day index provided.");
        return;
    }

    const dayHeader = document.getElementById(dayHeaderId);
    if (!dayHeader) {
        console.error(`Day header with ID ${dayHeaderId} not found.`);
        return;
    }

    const dayColumnIndex = Array.from(dayHeader.parentElement.children).indexOf(dayHeader) + 1; // +1 because nth-child is 1-based

    Object.entries(scheme).forEach(([headerId, workSites]) => {
        if (headerId === dayHeaderId) {
            const workSiteList = Array.isArray(workSites) ? workSites : [workSites];

            for (let row of document.querySelectorAll('.work-site')) {
                const workSiteText = row.innerText.trim();

                if (workSiteList.includes(workSiteText)) {
                    const selectCell = row.closest('tr').querySelector(`td:nth-child(${dayColumnIndex})`);
                    const select = selectCell.querySelector('select');
                    
                    if (select && !select.disabled && !select.value) {
                        const option = Array.from(select.options).find(option => option.text === user.username);
                        if (option) {
                            select.value = option.value;
                            select.classList.add('assigned');
                            select.classList.remove('default');
                            assignedUsers.add(user.username); // ✅ Marcar como asignado SOLO si fue exitoso
                            return; // Salir una vez asignado
                        }
                    }
                }
            }

            console.error(`No valid select found for worksites ${workSiteList.join(', ')}`);
        }
    });
}

export function autoAssignMorningWorkersByDay(dayIndex, users, dayName, assignedUsers) {
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'];
    const dayHeaderId = dayHeaders[dayIndex];

    if (!dayHeaderId) {
        console.error("Invalid day index provided.");
        return;
    }

    const dayHeader = document.getElementById(dayHeaderId);
    if (!dayHeader) {
        console.error(`Day header with ID ${dayHeaderId} not found.`);
        return;
    }

    const dayColumnIndex = Array.from(dayHeader.parentElement.children).indexOf(dayHeader);
    const selects = Array.from(document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`));

    // Función para mezclar el array aleatoriamente
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const shuffledSelects = shuffle(selects);

    // Helper para elegir usuarios disponibles válidos
    function getValidUsers(select, conditionFn) {
        return Array.from(select.options)
            .filter(option =>
                option.value &&
                !Array.from(shuffledSelects).some(otherSelect =>
                    otherSelect !== select &&
                    otherSelect.value === option.value &&
                    otherSelect.closest('td').cellIndex === dayColumnIndex
                )
            )
            .map(option => users.find(user =>
                user && user._id === option.value &&
                !assignedUsers.has(user._id) &&
                conditionFn(user)
            ))
            .filter(user => user);
    }

    // Primera etapa: asignar usuarios a sitios específicos
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (!select.value && !select.disabled && workSite.includes('matutino')) {
            let availableUsers = [];

            if (['imágenes', 'coi', 'heller', 'plottier', 'centenario', 'castro'].some(site => workSite.includes(site))) {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateRioNegro &&
                    user.workSchedule[dayName] === 'Mañana'
                );
            } else if (['fundación', 'cmac', 'allen', 'cipolletti'].some(site => workSite.includes(site))) {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateNeuquen &&
                    user.workSchedule[dayName] === 'Mañana'
                );
            }

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
                assignedUsers.add(randomUser._id); // ✅ lo bloqueamos para el resto del día
            }
        }
    });

    // Segunda etapa: asignar a los sitios restantes
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('matutino') && !select.value && !select.disabled) {
            const availableUsers = getValidUsers(select, user =>
                user.workSchedule[dayName] === 'Mañana'
            );

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
                assignedUsers.add(randomUser._id); // ✅ marcar como asignado
            }
        }
    });
}


export function autoAssignAfternoonWorkersByDay(dayIndex, users, dayName, assignedUsers) {
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'];
    const dayHeaderId = dayHeaders[dayIndex];

    if (!dayHeaderId) {
        console.error("Invalid day index provided.");
        return;
    }

    const dayHeader = document.getElementById(dayHeaderId);
    if (!dayHeader) {
        console.error(`Day header with ID ${dayHeaderId} not found.`);
        return;
    }

    const dayColumnIndex = Array.from(dayHeader.parentElement.children).indexOf(dayHeader);
    const selects = Array.from(document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`));

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const shuffledSelects = shuffle(selects);

    function getValidUsers(select, conditionFn) {
        return Array.from(select.options)
            .filter(option =>
                option.value &&
                !Array.from(shuffledSelects).some(otherSelect =>
                    otherSelect !== select &&
                    otherSelect.value === option.value &&
                    otherSelect.closest('td').cellIndex === dayColumnIndex
                )
            )
            .map(option => users.find(user =>
                user && user._id === option.value &&
                !assignedUsers.has(user._id) &&
                conditionFn(user)
            ))
            .filter(user => user);
    }

    // Primera etapa: asignar a sitios específicos
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (!select.value && !select.disabled && workSite.includes('vespertino')) {
            let availableUsers = [];

            if (['imágenes', 'coi', 'heller', 'plottier', 'centenario', 'castro'].some(site => workSite.includes(site))) {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateRioNegro &&
                    user.workSchedule[dayName] === 'Tarde'
                );
            } else if (['fundación', 'cmac', 'allen', 'cipolletti'].some(site => workSite.includes(site))) {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateNeuquen &&
                    user.workSchedule[dayName] === 'Tarde'
                );
            }

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
                assignedUsers.add(randomUser._id);
            }
        }
    });

    // Segunda etapa: asignar a los restantes
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('vespertino') && !select.value && !select.disabled) {
            const availableUsers = getValidUsers(select, user =>
                user.workSchedule[dayName] === 'Tarde'
            );

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
                assignedUsers.add(randomUser._id);
            }
        }
    });
}

export function autoAssignLongDayWorkersByDay(dayIndex, users, dayName, assignedUsers) {
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'];
    const dayHeaderId = dayHeaders[dayIndex];

    if (!dayHeaderId) {
        console.error("Invalid day index provided.");
        return;
    }

    const dayHeader = document.getElementById(dayHeaderId);
    if (!dayHeader) {
        console.error(`Day header with ID ${dayHeaderId} not found.`);
        return;
    }

    const dayColumnIndex = Array.from(dayHeader.parentElement.children).indexOf(dayHeader);
    const selects = Array.from(document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`));

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const shuffledSelects = shuffle(selects);

    function getValidUsers(select, conditionFn) {
        return Array.from(select.options)
            .filter(option =>
                option.value &&
                !Array.from(shuffledSelects).some(otherSelect =>
                    otherSelect !== select &&
                    otherSelect.value === option.value &&
                    otherSelect.closest('td').cellIndex === dayColumnIndex
                )
            )
            .map(option => users.find(user =>
                user && user._id === option.value &&
                !assignedUsers.has(user._id) &&
                conditionFn(user)
            ))
            .filter(user => user);
    }

    // Primera etapa: asignar a sitios específicos
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (!select.value && !select.disabled && workSite.includes('largo')) {
            let availableUsers = [];

            if (['imágenes', 'coi', 'heller', 'plottier', 'centenario', 'castro'].some(site => workSite.includes(site))) {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateRioNegro &&
                    user.workSchedule[dayName] === 'Variable'
                );
            } else if (['fundación', 'cmac', 'allen', 'cipolletti'].some(site => workSite.includes(site))) {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateNeuquen &&
                    user.workSchedule[dayName] === 'Variable'
                );
            }

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
                assignedUsers.add(randomUser._id);
            }
        }
    });

    // Segunda etapa: asignar a los sitios restantes
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('largo') && !select.value && !select.disabled) {
            const availableUsers = getValidUsers(select, user =>
                user.workSchedule[dayName] === 'Variable'
            );

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
                assignedUsers.add(randomUser._id);
            }
        }
    });
}


export function autoAssignRemainingSlotsByDay(dayIndex, users, dayName, assignedUsers) {
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'];
    const dayHeaderId = dayHeaders[dayIndex];

    if (!dayHeaderId) {
        console.error("Invalid day index provided.");
        return;
    }

    const dayHeader = document.getElementById(dayHeaderId);
    if (!dayHeader) {
        console.error(`Day header with ID ${dayHeaderId} not found.`);
        return;
    }

    const dayColumnIndex = Array.from(dayHeader.parentElement.children).indexOf(dayHeader);
    const selects = Array.from(document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`));

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const shuffledSelects = shuffle(selects);

    function getValidUsers(select, conditionFn) {
        return Array.from(select.options)
            .filter(option =>
                option.value &&
                !Array.from(shuffledSelects).some(otherSelect =>
                    otherSelect !== select &&
                    otherSelect.value === option.value &&
                    otherSelect.closest('td').cellIndex === dayColumnIndex
                )
            )
            .map(option => users.find(user =>
                user && user._id === option.value &&
                !assignedUsers.has(user._id) &&
                conditionFn(user)
            ))
            .filter(user => user);
    }

    // Primera etapa: asignar a sitios específicos
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (!select.value && !select.disabled) {
            let availableUsers = [];

            if (['imágenes', 'coi', 'heller', 'plottier', 'centenario', 'castro'].some(site => workSite.includes(site))) {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateRioNegro &&
                    user.workSchedule[dayName] === 'Variable'
                );
            } else if (['fundación', 'cmac', 'allen', 'cipolletti'].some(site => workSite.includes(site))) {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateNeuquen &&
                    user.workSchedule[dayName] === 'Variable'
                );
            }

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
                assignedUsers.add(randomUser._id);
            }
        }
    });

    // Segunda etapa: asignar a cualquier sitio restante
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (!select.value && !select.disabled) {
            const availableUsers = getValidUsers(select, user =>
                user.workSchedule[dayName] === 'Variable'
            );

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
                assignedUsers.add(randomUser._id);
            }
        }
    });
}

