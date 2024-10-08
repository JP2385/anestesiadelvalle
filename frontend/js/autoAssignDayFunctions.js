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

export function assignSpecificUsersByDay(dayIndex, scheme, user) {
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
            // console.log(`Worksites for ${headerId}: ${workSiteList.join(', ')}`);

            let foundMatch = false;

            // Iterar sobre todas las filas
            for (let row of document.querySelectorAll('.work-site')) {
                const workSiteText = row.innerText.trim();
                // console.log(`Checking row: ${workSiteText}`);

                if (workSiteList.includes(workSiteText)) {
                    // console.log(`Found matching row for worksite: ${workSiteText}`);
                    const selectCell = row.closest('tr').querySelector(`td:nth-child(${dayColumnIndex})`);
                    const select = selectCell.querySelector('select');
                    if (select && !select.disabled) {
                        const option = Array.from(select.options).find(option => option.text === user.username);
                        if (option) {
                            select.value = option.value;
                            select.classList.add('assigned');
                            select.classList.remove('default');
                            // console.log(`Assigned user ${user.username} to select`);
                            foundMatch = true; // Se encontró y asignó a un `select`
                            break; // Salir del bucle
                        } else {
                            // console.error(`Option with username ${user.username} not found in select`);
                        }
                    } else {
                        // console.error(`Select element not found or is disabled for worksite ${workSiteText}`);
                    }
                }
            }

            if (!foundMatch) {
                console.error(`No valid select found for worksites ${workSiteList.join(', ')}`);
            }
        }
    });
}

export function autoAssignMorningWorkersByDay(dayIndex, users) {
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
    const selects = Array.from(document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`)); // Convertimos NodeList a Array

    // Función para mezclar el array aleatoriamente
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Mezclamos los selects
    const shuffledSelects = shuffle(selects);

    // Primera etapa: Asignar usuarios a sitios específicos
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('matutino') 
        && (workSite.includes('imágenes') || workSite.includes('coi') || workSite.includes('heller') 
        || workSite.includes('plottier') || workSite.includes('centenario') || workSite.includes('castro')) 
        && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Mañana') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        } else if (workSite.includes('matutino') 
        && (workSite.includes('fundación') || workSite.includes('cmac') || workSite.includes('allen') 
        || workSite.includes('cipolletti')) 
        && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateNeuquen);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Mañana') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        }
    });

    // Segunda etapa: Asignar usuarios a los sitios restantes
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('matutino') && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Mañana') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        }
    });
}

export function autoAssignAfternoonWorkersByDay(dayIndex, users) {
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
    const selects = Array.from(document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`)); // Convertimos NodeList a Array

    // Función para mezclar el array aleatoriamente
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Mezclamos los selects
    const shuffledSelects = shuffle(selects);

    // Primera etapa: Asignar usuarios a sitios específicos
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('matutino') 
            && (workSite.includes('imágenes') || workSite.includes('coi') || workSite.includes('heller') 
            || workSite.includes('plottier') || workSite.includes('centenario') || workSite.includes('castro')) 
            && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Tarde') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        } else if (workSite.includes('vespertino') 
            && (workSite.includes('fundación') || workSite.includes('cmac') || workSite.includes('allen') 
            || workSite.includes('cipolletti')) 
            && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateNeuquen);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Tarde') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        }
    });

    // Segunda etapa: Asignar usuarios a los sitios restantes
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('vespertino') && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Tarde') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        }
    });
}

export function autoAssignLongDayWorkersByDay(dayIndex, users) {
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
    const selects = Array.from(document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`)); // Convertimos NodeList a Array

    // Función para mezclar el array aleatoriamente
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Mezclamos los selects
    const shuffledSelects = shuffle(selects);

    // Primera etapa: Asignar usuarios a sitios específicos
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('largo') 
            && (workSite.includes('imágenes') || workSite.includes('coi') || workSite.includes('heller') 
            || workSite.includes('plottier') || workSite.includes('centenario') || workSite.includes('castro')) 
            && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Variable') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        } else if (workSite.includes('largo') 
            && (workSite.includes('fundación') || workSite.includes('cmac') || workSite.includes('allen') 
            || workSite.includes('cipolletti')) && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateNeuquen);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Variable') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        }
    });

    // Segunda etapa: Asignar usuarios a los sitios restantes
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('largo') && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Variable') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        }
    });
}

export function autoAssignRemainingSlotsByDay(dayIndex, users) {
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
    const selects = Array.from(document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`)); // Convertimos NodeList a Array

    // Función para mezclar el array aleatoriamente
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Mezclamos los selects
    const shuffledSelects = shuffle(selects);

    // Primera etapa: Asignar usuarios a sitios específicos
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if ((workSite.includes('imágenes') || workSite.includes('coi') || workSite.includes('heller') 
            || workSite.includes('plottier') || workSite.includes('centenario')  || workSite.includes('castro')) 
            && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Variable') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        } else if ((workSite.includes('fundación') || workSite.includes('cmac') || workSite.includes('allen') 
            || workSite.includes('cipolletti')) && !select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateNeuquen);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Variable') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        }
    });

    // Segunda etapa: Asignar usuarios a los sitios restantes
    shuffledSelects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (!select.value && !select.disabled) {
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(shuffledSelects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('td').cellIndex === dayColumnIndex;
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value);
                    if (user && user.workSchedule[dayHeaderId.split('-')[0]] === 'Variable') {
                        return user;
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        }
    });
}
