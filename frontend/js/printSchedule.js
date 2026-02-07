import toast from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const printButton = document.getElementById('print-schedule');
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://anestesiadelvalle.ar';
    let currentUserId = '';
    let currentUsername = '';

    // Obtener la información del perfil del usuario
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    fetch(`${apiUrl}/auth/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            toast.error(`Error: ${data.message}`);
            setTimeout(() => window.location.href = 'login.html', 1500);
        } else {
            currentUserId = data._id; // Guardar el ID del usuario
            currentUsername = data.username; // Guardar el nombre de usuario
        }
    })
    .catch(error => {
        toast.error('Hubo un problema al obtener el perfil: ' + error.message);
        setTimeout(() => window.location.href = 'login.html', 1500);
    });

    printButton.addEventListener('click', async () => {
        if (!currentUserId) {
            toast.error('Error: No se pudo obtener la información del usuario');
            return;
        }

        try {
            // Calcular fechas de la semana (sábado a viernes)
            const { weekStart, weekEnd } = calculateWeekDates();

            // Recolectar asignaciones en el NUEVO formato optimizado
            const assignments = await collectAssignmentsOptimized();

            // Recolectar estado de Mortal Kombat
            const mortalCombat = await collectMortalCombatState();

            // Recolectar longDaysCount y longDaysInform
            const longDaysCount = calculateLongDaysCountFromAssignments(assignments);
            const longDaysInform = collectLongDaysInform();

            // Validar que tenemos asignaciones
            if (!assignments) {
                console.error('No se pudieron recolectar las asignaciones');
                return;
            }

            console.log('📦 Guardando cronograma:', {
                weekStart,
                weekEnd,
                totalAssignments: Object.values(assignments).flat().length,
                longDaysTotal: Object.values(longDaysCount).reduce((sum, count) => sum + count, 0),
                createdBy: currentUserId
            });

            // Enviar los datos al backend en el NUEVO formato
            const response = await fetch(`${apiUrl}/schedule/save-schedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    weekStart,
                    weekEnd,
                    assignments,
                    mortalCombat,
                    longDaysCount,
                    longDaysInform,
                    createdBy: currentUserId
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Cronograma guardado exitosamente:', result.scheduleId);
                // Redirigir a print-view.html
                window.location.href = 'print-view.html';
            } else {
                console.error('❌ Error al guardar:', result.message);
                toast.error(`Error al guardar el cronograma: ${result.message}`);
            }
        } catch (error) {
            console.error('❌ Error al enviar los datos al servidor:', error);
            toast.error(`Error al guardar el cronograma: ${error.message}`);
        }
    });

    function collectAvailabilityInform() {
        const availabilityInform = {};
    
        // Recolectar información por cada día
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
            const sitesElement = document.getElementById(`${day}-sites`);
            const availableElement = document.getElementById(`${day}-available`);
            const assignmentsElement = document.getElementById(`${day}-assignments`);
            const compareElement = document.getElementById(`${day}-compare`);
    
            if (sitesElement && availableElement && assignmentsElement && compareElement) {
                const sitesTd = sitesElement.closest('td');
                const availableTd = availableElement.closest('td');
                const assignmentsTd = assignmentsElement.closest('td');
                const compareTd = compareElement.closest('td');
    
                // Recolectar los datos, incluyendo los <br> directamente en el HTML
                availabilityInform[day] = {
                    sitesEnabled: {
                        value: parseInt(sitesElement.textContent) || 0,
                        backgroundColor: sitesTd ? getComputedStyle(sitesTd).backgroundColor : 'transparent',
                        tooltip: sitesTd?.querySelector('.tooltip-wrapper')?.getAttribute('data-tooltip') || ''
                    },
                    available: {
                        value: parseInt(availableElement.textContent) || 0,
                        backgroundColor: availableTd ? getComputedStyle(availableTd).backgroundColor : 'transparent',
                        tooltip: availableTd?.querySelector('.tooltip-wrapper')?.getAttribute('data-tooltip') || ''
                    },
                    assigned: {
                        value: parseInt(assignmentsElement.textContent) || 0,
                        backgroundColor: assignmentsTd ? getComputedStyle(assignmentsTd).backgroundColor : 'transparent',
                        tooltip: assignmentsTd?.querySelector('.tooltip-wrapper')?.getAttribute('data-tooltip') || ''
                    },
                    unassigned: {
                        // Usar innerHTML para mantener los <br> en lugar de reemplazarlos
                        value: compareElement.innerHTML || '',
                        backgroundColor: compareTd ? getComputedStyle(compareTd).backgroundColor : 'transparent',
                        tooltip: compareTd?.querySelector('.tooltip-wrapper')?.getAttribute('data-tooltip') || ''
                    }
                };
            }
        });
    
        return availabilityInform;
    }
    
    

    function collectAssignments() {
        const assignments = {};
        const longDaysCount = {}; // Para almacenar el recuento de días largos
        const scheduleBody = document.getElementById('schedule-body');
        const rows = scheduleBody.getElementsByTagName('tr');
    
        for (let row of rows) {
            const workSiteElement = row.querySelector('.work-site');
            if (workSiteElement) {
                const workSite = workSiteElement.textContent.trim();
                const selects = row.querySelectorAll('select');
    
                selects.forEach((select, index) => {
                    const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index];
                    const selectedOption = select.options[select.selectedIndex];
                    const selectedUser = selectedOption.text;
                    const userId = selectedOption.value;
                    const username = selectedOption.getAttribute('data-username') || selectedUser;
    
                    // Saltar si el usuario seleccionado es "Select user"
                    if (selectedUser === "Select user") {
                        return;
                    }
    
                    if (!assignments[day]) {
                        assignments[day] = [];
                    }
    
                    if (selectedUser !== "") {
                        assignments[day].push({
                            workSite: workSite,
                            user: selectedUser,
                            userId: userId,
                            username: username
                        });
    
                        // Contar los días largos asignados
                        if (workSite.toLowerCase().includes('largo')) {
                            if (!longDaysCount[userId]) {
                                longDaysCount[userId] = { username: username, count: 0 };
                            }
                            longDaysCount[userId].count++;
                        }
                    }
                });
            }
        }
    
        return { assignments, longDaysCount };
    }
    
    
    function collectDayHeaders() {
        const dayHeaders = {};
        const headers = document.querySelectorAll('#schedule-assistant thead th');

        headers.forEach((header, index) => {
            if (index > 0) {
                const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index - 1];
                dayHeaders[day] = header.textContent.trim();
            }
        });

        return dayHeaders;
    }

    function collectSelectConfig() {
        const selectConfig = {};
        const scheduleBody = document.getElementById('schedule-body');
        const rows = scheduleBody.getElementsByTagName('tr');
    
        for (let row of rows) {
            const workSiteElement = row.querySelector('.work-site');
            if (workSiteElement) {
                const workSite = workSiteElement.textContent.trim();
                const selects = row.querySelectorAll('select');
    
                selects.forEach((select, index) => {
                    const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index];
                    
                    if (!selectConfig[day]) {
                        selectConfig[day] = [];
                    }
    
                    selectConfig[day].push({
                        workSite: workSite,
                        disabled: select.disabled,
                        className: select.className  // Almacenar la clase del select aquí
                    });
                });
            }
        }
    
        return selectConfig;
    }    

    function collectLongDaysInform() {
        // Obtener el contenido del span con id 'long-days-inform'
        const longDaysSpan = document.getElementById('long-days-inform');
        return longDaysSpan ? longDaysSpan.textContent.trim() : '';
    }

    async function collectMortalCombatState() {
        try {
            // Intentar importar las funciones desde weekly-schedule-utils.js
            const { getMortalCombatMode, getAllDailyMortalCombatModes } = await import('./weekly-schedule-utils.js');

            return {
                globalMode: getMortalCombatMode(),
                dailyModes: getAllDailyMortalCombatModes()
            };
        } catch (error) {
            // Si falla el import, usar método de fallback basado en UI
            console.warn('No se pudo importar weekly-schedule-utils, usando método de fallback');

            const mortalCombatLegend = document.getElementById('mortal-combat-legend');
            const globalMode = mortalCombatLegend && mortalCombatLegend.style.display === 'block';

            const dailyModes = {
                monday: false,
                tuesday: false,
                wednesday: false,
                thursday: false,
                friday: false
            };

            const dailyButtons = document.querySelectorAll('.daily-mortal-combat-button');
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

            dailyButtons.forEach((button, index) => {
                if (index < days.length) {
                    const isActive = button.style.background === 'rgb(204, 0, 0)' ||
                                    button.style.background === '#cc0000';
                    dailyModes[days[index]] = isActive;
                }
            });

            return {
                globalMode,
                dailyModes
            };
        }
    }

    // ========== NUEVAS FUNCIONES PARA FORMATO OPTIMIZADO ==========

    /**
     * Calcula las fechas de inicio y fin de la semana actual
     * La semana va de sábado a viernes
     */
    function calculateWeekDates() {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday

        // Calcular cuántos días restar para llegar al sábado anterior
        let daysToSubtract = dayOfWeek === 0 ? 1 : (dayOfWeek + 1);
        if (dayOfWeek === 6) daysToSubtract = 0; // Si es sábado, es el inicio

        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysToSubtract);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // 6 días después
        weekEnd.setHours(23, 59, 59, 999);

        return {
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString()
        };
    }

    /**
     * Recolecta asignaciones en el NUEVO formato optimizado
     * Formato: { workSiteId, userId, regime }
     * Ahora lee directamente el workSiteId del atributo data-worksite-id
     * IMPORTANTE: Guarda también selects enabled pero vacíos (con userId: null)
     */
    async function collectAssignmentsOptimized() {
        const assignments = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: []
        };

        const scheduleBody = document.getElementById('schedule-body');
        const rows = scheduleBody.getElementsByTagName('tr');

        for (let row of rows) {
            const workSiteElement = row.querySelector('.work-site');
            if (workSiteElement) {
                const selects = row.querySelectorAll('select');

                selects.forEach((select, index) => {
                    const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index];

                    // Saltar selects que están disabled (no forman parte del cronograma activo)
                    if (select.disabled) {
                        return;
                    }

                    const selectedOption = select.options[select.selectedIndex];
                    let userId = selectedOption.value;

                    // Si el userId contiene _morning_ o _afternoon_, extraer el ID original
                    if (userId && (userId.includes('_morning_') || userId.includes('_afternoon_'))) {
                        userId = userId.split('_')[0];
                    }

                    // Obtener el workSiteId y regime directamente de los atributos data
                    const workSiteId = select.getAttribute('data-worksite-id');
                    const regime = select.getAttribute('data-regime');

                    if (!workSiteId || !regime) {
                        console.warn(`⚠️ Select sin data-worksite-id o data-regime:`, workSiteElement.textContent);
                        return;
                    }

                    // Crear el assignment en formato optimizado
                    // Si está vacío (userId === '' o 'Select user'), guardamos con userId: null
                    assignments[day].push({
                        workSiteId: workSiteId,
                        userId: userId === '' || selectedOption.text === 'Select user' ? null : userId,
                        regime: regime
                    });
                });
            }
        }

        return assignments;
    }


    /**
     * Calcula longDaysCount desde assignments (formato: { userId: { count: N } })
     */
    function calculateLongDaysCountFromAssignments(assignments) {
        const longDaysCount = {};

        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
            if (assignments[day] && Array.isArray(assignments[day])) {
                assignments[day].forEach(assignment => {
                    if (assignment.regime === 'largo' && assignment.userId) {
                        let userId = assignment.userId;
                        // Si el userId contiene _morning_ o _afternoon_, extraer el ID original
                        if (userId.includes('_morning_') || userId.includes('_afternoon_')) {
                            userId = userId.split('_')[0];
                        }
                        
                        if (!longDaysCount[userId]) {
                            longDaysCount[userId] = { count: 0 };
                        }
                        longDaysCount[userId].count++;
                    }
                });
            }
        });

        return longDaysCount;
    }

    /**
     * Recolecta el contenido del span long-days-inform
     */
    function collectLongDaysInform() {
        const longDaysSpan = document.getElementById('long-days-inform');
        return longDaysSpan ? longDaysSpan.textContent.trim() : '';
    }
});
