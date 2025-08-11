import { updateSelectBackgroundColors } from './assignUtils.js';
import { getMortalCombatMode, getDailyMortalCombatMode } from './weekly-schedule-utils.js';

export const grupoRioNegro = ['imágenes', 'coi', 'heller', 'plottier', 'centenario', 'castro'];
export const grupoNeuquen = ['fundación', 'cmac', 'allen', 'cipolletti'];

// Usuarios que mantienen sus restricciones de horario incluso en modo Mortal Combat
const SPECIAL_USERS = ['bvalenti', 'jbo', 'montes_esposito'];

// Helper para obtener el horario de trabajo considerando el modo Mortal Combat
function getEffectiveWorkSchedule(user, dayName, mortalCombatMode = false) {
    const isDailyMortalCombat = getDailyMortalCombatMode(dayName);
    const isAnyMortalCombat = mortalCombatMode || isDailyMortalCombat;
    
    // Si el modo Mortal Combat (global o diario) está activo y no es un usuario especial
    if (isAnyMortalCombat && !SPECIAL_USERS.includes(user.username)) {
        return 'Variable'; // Todos los usuarios normales se consideran Variable
    }
    // Caso normal: usar el horario original del usuario
    return user.workSchedule[dayName];
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getValidUsersFactory(shuffledRows, dayColumnIndex, users, assignedUsers) {
    const userMap = new Map(users.map(u => [u._id, u]));

    return function(select, conditionFn) {
        return Array.from(select.options).reduce((acc, option) => {
            if (!option.value) return acc;

            const user = userMap.get(option.value);
            if (
                user &&
                !assignedUsers.has(user._id) &&
                conditionFn(user) &&
                !shuffledRows.some(row =>
                    row.select !== select &&
                    row.select.value === option.value &&
                    row.cellIndex === dayColumnIndex
                )
            ) {
                acc.push(user);
            }

            return acc;
        }, []);
    };
}


function assignRandomUser(select, availableUsers, assignedUsers) {
    if (availableUsers.length === 0) return;
    const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
    select.value = randomUser._id;
    assignedUsers.add(randomUser._id);
}

// 📌 Funciones de autoasignación

export function autoAssignMorningWorkersByDay(rows, dayColumnIndex, users, dayName, assignedUsers) {
    const shuffledRows = shuffle(rows);
    const getValidUsers = getValidUsersFactory(shuffledRows, dayColumnIndex, users, assignedUsers);
    const mortalCombatMode = getMortalCombatMode();

    // Primera etapa: asignar por zona
    shuffledRows.forEach(({ workSiteText, select, zona }) => {
        if (!select.value && !select.disabled && workSiteText.includes('matutino')) {
            let availableUsers = [];

            if (zona === 'rioNegro') {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateRioNegro && getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Mañana'
                );
            } else if (zona === 'neuquen') {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateNeuquen && getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Mañana'
                );
            }

            assignRandomUser(select, availableUsers, assignedUsers);
        }
    });

    // Segunda etapa: cualquier sitio matutino restante
    shuffledRows.forEach(({ workSiteText, select }) => {
        if (workSiteText.includes('matutino') && !select.value && !select.disabled) {
            const availableUsers = getValidUsers(select, user =>
                getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Mañana'
            );
            assignRandomUser(select, availableUsers, assignedUsers);
        }
    });
}


export function autoAssignAfternoonWorkersByDay(rows, dayColumnIndex, users, dayName, assignedUsers) {
    const shuffledRows = shuffle(rows);
    const getValidUsers = getValidUsersFactory(shuffledRows, dayColumnIndex, users, assignedUsers);
    const mortalCombatMode = getMortalCombatMode();

    // Primera etapa: asignar por zona
    shuffledRows.forEach(({ workSiteText, select, zona }) => {
        if (!select.value && !select.disabled && workSiteText.includes('vespertino')) {
            let availableUsers = [];

            if (zona === 'rioNegro') {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateRioNegro && getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Tarde'
                );
            } else if (zona === 'neuquen') {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateNeuquen && getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Tarde'
                );
            }

            assignRandomUser(select, availableUsers, assignedUsers);
        }
    });

    // Segunda etapa: cualquier sitio vespertino restante
    shuffledRows.forEach(({ workSiteText, select }) => {
        if (workSiteText.includes('vespertino') && !select.value && !select.disabled) {
            const availableUsers = getValidUsers(select, user =>
                getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Tarde'
            );
            assignRandomUser(select, availableUsers, assignedUsers);
        }
    });
}

export function autoAssignLongDayWorkersByDay(rows, dayColumnIndex, users, dayName, assignedUsers) {
    const shuffledRows = shuffle(rows);
    const getValidUsers = getValidUsersFactory(shuffledRows, dayColumnIndex, users, assignedUsers);
    const mortalCombatMode = getMortalCombatMode();

    // Primera etapa: asignar por zona
    shuffledRows.forEach(({ workSiteText, select, zona }) => {
        if (!select.value && !select.disabled && workSiteText.includes('largo')) {
            let availableUsers = [];

            if (zona === 'rioNegro') {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateRioNegro && getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Variable'
                );
            } else if (zona === 'neuquen') {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateNeuquen && getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Variable'
                );
            }

            assignRandomUser(select, availableUsers, assignedUsers);
        }
    });

    // Segunda etapa: cualquier sitio largo restante
    shuffledRows.forEach(({ workSiteText, select }) => {
        if (workSiteText.includes('largo') && !select.value && !select.disabled) {
            const availableUsers = getValidUsers(select, user =>
                getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Variable'
            );
            assignRandomUser(select, availableUsers, assignedUsers);
        }
    });
}

export function autoAssignRemainingSlotsByDay(rows, dayColumnIndex, users, dayName, assignedUsers) {
    const shuffledRows = shuffle(rows);
    const getValidUsers = getValidUsersFactory(shuffledRows, dayColumnIndex, users, assignedUsers);
    const mortalCombatMode = getMortalCombatMode();

    // Primera etapa: asignar por zona
    shuffledRows.forEach(({ workSiteText, select, zona }) => {
        if (!select.value && !select.disabled) {
            let availableUsers = [];

            if (zona === 'rioNegro') {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateRioNegro && getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Variable'
                );
            } else if (zona === 'neuquen') {
                availableUsers = getValidUsers(select, user =>
                    !user.worksInPrivateNeuquen && getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Variable'
                );
            }

            assignRandomUser(select, availableUsers, assignedUsers);
        }
    });

    // Segunda etapa: cualquier sitio restante
    shuffledRows.forEach(({ workSiteText, select }) => {
        if (!select.value && !select.disabled) {
            const availableUsers = getValidUsers(select, user =>
                getEffectiveWorkSchedule(user, dayName, mortalCombatMode) === 'Variable'
            );
            assignRandomUser(select, availableUsers, assignedUsers);
        }
    });
}


export function assignSpecificUsersByDay(dayIndex, scheme, user, assignedUsers, workSiteElements) {
    if (assignedUsers.has(user.username)) return;

    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'];
    const dayHeaderId = dayHeaders[dayIndex];

    const dayHeader = document.getElementById(dayHeaderId);
    if (!dayHeader) {
        console.error(`Day header with ID ${dayHeaderId} not found.`);
        return;
    }

    const dayColumnIndex = Array.from(dayHeader.parentElement.children).indexOf(dayHeader) + 1;

    Object.entries(scheme).forEach(([headerId, workSites]) => {
        if (headerId !== dayHeaderId) return;

        const workSiteList = Array.isArray(workSites) ? workSites : [workSites];

        for (let workSiteEl of workSiteElements) {
            const workSiteText = workSiteEl.innerText.trim();

            if (!workSiteList.includes(workSiteText)) continue;

            const tr = workSiteEl.closest('tr');
            if (!tr) continue;

            const selectCell = tr.querySelector(`td:nth-child(${dayColumnIndex})`);
            const select = selectCell?.querySelector('select');

            if (select && !select.disabled && !select.value) {
                const option = Array.from(select.options).find(opt => opt.text === user.username);
                if (option) {
                    select.value = option.value;

                    // Solo mantener si realmente lo usás visualmente
                    // select.classList.add('assigned');
                    // select.classList.remove('default');

                    assignedUsers.add(user.username);
                    return;
                }
            }
        }

        console.error(`No valid select found for worksites: ${workSiteList.join(', ')}`);
    });
}


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
    const selects = document.querySelectorAll(`td:nth-child(${dayColumnIndex + 1}) select`);

    selects.forEach(select => {
        if (select.value) {
            select.value = "";
        }
    });

    updateSelectBackgroundColors();
}
