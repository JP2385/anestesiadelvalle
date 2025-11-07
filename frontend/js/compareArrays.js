import { fetchAvailability } from './assignUtils.js';
import { countAssignmentsByDay } from './autoAssignFunctions.js';
import { getMortalCombatMode, getDailyMortalCombatMode } from './weekly-schedule-utils.js';

export async function compareAvailabilities() {
    try {
        const serverAvailability = await fetchAvailability();
        const { contents: clientAvailability } = await countAssignmentsByDay();

        const serverUsernames = extractUsernamesFromAvailability(serverAvailability);
        const differences = compareUserAvailability(serverUsernames, clientAvailability);

        updateDOMWithDifferences(differences);
        
    } catch (error) {
        console.error('Error comparing availabilities:', error);
    }
}

export async function compareAvailabilitiesForEachDay(dayIndex) {
    try {
        
        const serverAvailability = await fetchAvailability();
        
        const { contents: clientAvailability } = await countAssignmentsByDay();
        
        const serverUsernames = extractUsernamesFromAvailability(serverAvailability);
        const differences = compareUserAvailabilityForDay(serverUsernames, clientAvailability, dayIndex);
        
        updateDOMWithDifferencesForDay(differences, dayIndex);
        
    } catch (error) {
        console.error(`Error comparing availabilities for day index ${dayIndex}:`, error);
    }
}

function extractUsernamesFromAvailability(availability) {
    const usernames = {};
    for (const day in availability) {
        usernames[day] = availability[day].map(userObj => userObj.username);
    }
    return usernames;
}

function compareUserAvailability(serverData, clientData) {
    const differences = {};

    for (const day in serverData) {
        if (serverData.hasOwnProperty(day) && clientData.hasOwnProperty(day)) {
            const serverArray = serverData[day];
            const clientArray = clientData[day];

            const onlyInServer = serverArray.filter(user => !clientArray.includes(user));

            differences[day] = {
                onlyInServer,
            };
        }
    }

    return differences;
}

function compareUserAvailabilityForDay(serverData, clientData, dayIndex) {
    const day = convertDayIndexToName(dayIndex);
    const differences = {};

    if (serverData.hasOwnProperty(day) && clientData.hasOwnProperty(day)) {
        const serverArray = serverData[day];
        const clientArray = clientData[day];

        const onlyInServer = serverArray.filter(user => !clientArray.includes(user));
       
        differences[day] = {
            onlyInServer,
        };
    }

    return differences;
}

function convertDayIndexToName(dayIndex) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    return days[dayIndex];
}

// Usuarios que mantienen sus restricciones incluso en modo Mortal Combat
const SPECIAL_USERS = ['ecesar', 'jbo', 'montes_esposito'];

function formatWorkScheduleForDay(workSchedule, day, username) {
    const mortalCombatMode = getMortalCombatMode();
    const isDailyMortalCombat = getDailyMortalCombatMode(day);
    const isAnyMortalCombat = mortalCombatMode || isDailyMortalCombat;
    const isSpecialUser = SPECIAL_USERS.includes(username);
    
    // Si el modo Mortal Combat (global o diario) está activo y no es un usuario especial
    if (isAnyMortalCombat && !isSpecialUser) {
        return 'Variable'; // Mostrar como Variable
    }
    
    // Caso normal: usar el horario original del usuario
    return workSchedule[day] || 'No asignado';
}

function updateDOMWithDifferences(differences) {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com';
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    days.forEach(day => {
        const element = document.getElementById(`${day}-compare`);
        const { onlyInServer } = differences[day] || { onlyInServer: [] };

        if (element) {
            if (onlyInServer.length > 0) {
                fetch(`${apiUrl}/auth/users`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                })
                .then(response => response.json())
                .then(users => {
                    let htmlContent = '';

                    const userSchedules = users.filter(user => onlyInServer.includes(user.username))
                                               .map(user => `${user.username} (${formatWorkScheduleForDay(user.workSchedule, day, user.username)})`);

                    if (userSchedules.length > 0) {
                        htmlContent += `${userSchedules.join('<br>')}<br>`;
                    }

                    if (userSchedules.length === 0) {
                        htmlContent += 'Todos los anestesiólogos fueron asignados.<br>';
                    }

                    element.innerHTML = htmlContent;
                })
                .catch(error => {
                    console.error('Error fetching users:', error);
                });
            } else {
                element.innerHTML = 'Todos los anestesiólogos fueron asignados.<br>';
            }
        } else {
            console.error(`Element with id ${day}-compare not found.`);
        }
    });
}

function updateDOMWithDifferencesForDay(differences, dayIndex) {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com';
    const day = convertDayIndexToName(dayIndex);

    const element = document.getElementById(`${day}-compare`);
    const { onlyInServer } = differences[day] || { onlyInServer: [] };

    if (element) {
        if (onlyInServer.length > 0) {
            fetch(`${apiUrl}/auth/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            })
            .then(response => response.json())
            .then(users => {
                let htmlContent = '';

                const userSchedules = users.filter(user => onlyInServer.includes(user.username))
                                           .map(user => `${user.username} (${formatWorkScheduleForDay(user.workSchedule, day, user.username)})`);

                if (userSchedules.length > 0) {
                    htmlContent += `${userSchedules.join('<br>')}<br>`;
                }

                if (userSchedules.length === 0) {
                    htmlContent += 'Todos los anestesiólogos fueron asignados.<br>';
                }

                element.innerHTML = htmlContent;
            })
            .catch(error => {
                console.error('Error fetching users:', error);
            });
        } else {
            element.innerHTML = 'Todos los anestesiólogos fueron asignados.<br>';
        }
    } else {
        console.error(`Element with id ${day}-compare not found.`);
    }
}
