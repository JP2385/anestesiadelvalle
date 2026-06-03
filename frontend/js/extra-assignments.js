// Módulo para gestionar asignaciones extras (fuera de las asignaciones por defecto)
import toast from './toast.js';
import { buildWorkSiteName } from './workSiteNameUtils.js';
import { generateWeekHeaders } from './weekDateFormatter.js';

const apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://';

let workSitesData = [];
let users = [];
let currentWeekStart = null;
let extraAssignmentsData = {}; // Almacena las asignaciones extras de la semana actual
let availabilityData = {}; // Almacena la disponibilidad efectiva de anestesiólogos por día
let lockedSelects = new Set(); // Almacena los IDs de los selects bloqueados

// Obtener el lunes de la semana actual por defecto
function getMondayOfCurrentWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si es domingo, retroceder 6 días
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

// Formatear fecha para input type="date"
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Calcular número de semana del año
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        showSpinner();

        // Establecer fecha por defecto (lunes de esta semana)
        currentWeekStart = getMondayOfCurrentWeek();
        document.getElementById('week-selector').value = formatDateForInput(currentWeekStart);

        // Cargar datos iniciales
        await loadUsers();
        await loadWorkSites();
        await loadAvailability();
        await loadWeekData();

        // Setup event listeners
        document.getElementById('load-week-button').addEventListener('click', loadWeekData);
        document.getElementById('save-extra-assignments').addEventListener('click', saveExtraAssignments);
        document.getElementById('generate-monthly-report').addEventListener('click', generateMonthlyReport);

    } catch (error) {
        console.error('Error initializing:', error);
        toast.error('Error al inicializar la página: ' + error.message);
    } finally {
        hideSpinner();
    }
});

async function loadUsers() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${apiUrl}/auth/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar usuarios');
        }

        users = await response.json();
        users.sort((a, b) => a.username.localeCompare(b.username));

    } catch (error) {
        console.error('Error loading users:', error);
        throw error;
    }
}

async function loadAvailability() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${apiUrl}/auth/availability`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar disponibilidad');
        }

        availabilityData = await response.json();
        console.log('Availability data loaded:', availabilityData);

    } catch (error) {
        console.error('Error loading availability:', error);
        availabilityData = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: []
        };
    }
}

async function loadWorkSites() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${apiUrl}/work-sites/schedule/data`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar sitios de trabajo');
        }

        const result = await response.json();
        workSitesData = result.data;

    } catch (error) {
        console.error('Error loading work sites:', error);
        throw error;
    }
}

async function loadWeekData() {
    try {
        showSpinner();

        // Obtener fecha seleccionada
        const selectedDate = new Date(document.getElementById('week-selector').value + 'T00:00:00');

        // Ajustar a lunes de esa semana
        const dayOfWeek = selectedDate.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        currentWeekStart = new Date(selectedDate);
        currentWeekStart.setDate(selectedDate.getDate() + diff);
        currentWeekStart.setHours(0, 0, 0, 0);

        // Actualizar input con el lunes correcto
        document.getElementById('week-selector').value = formatDateForInput(currentWeekStart);

        // Actualizar headers de la tabla
        updateTableHeaders();

        // Cargar asignaciones extras de esta semana desde el backend
        await loadExtraAssignmentsFromBackend();

        // Construir tabla con asignaciones por defecto + extras
        buildScheduleTable();

    } catch (error) {
        console.error('Error loading week data:', error);
        toast.error('Error al cargar datos de la semana: ' + error.message);
    } finally {
        hideSpinner();
    }
}

function updateTableHeaders() {
    const weekNumber = getWeekNumber(currentWeekStart);
    const isOddWeek = weekNumber % 2 !== 0;
    const weekType = isOddWeek ? 'Impar' : 'Par';

    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 4); // Viernes

    document.getElementById('week-info').textContent =
        `Semana ${weekNumber} (${weekType}) - ${currentWeekStart.toLocaleDateString('es-AR')} al ${weekEnd.toLocaleDateString('es-AR')}`;

    // Actualizar headers de días
    const headers = generateWeekHeaders(currentWeekStart, false);
    document.getElementById('monday-header').textContent = headers.monday;
    document.getElementById('tuesday-header').textContent = headers.tuesday;
    document.getElementById('wednesday-header').textContent = headers.wednesday;
    document.getElementById('thursday-header').textContent = headers.thursday;
    document.getElementById('friday-header').textContent = headers.friday;
}

async function loadExtraAssignmentsFromBackend() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const weekStartISO = currentWeekStart.toISOString().split('T')[0];

        const response = await fetch(`${apiUrl}/extra-assignments/week/${weekStartISO}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            extraAssignmentsData = result.data || {};
        } else {
            // Si no existe, inicializar vacío
            extraAssignmentsData = {};
        }

    } catch (error) {
        console.error('Error loading extra assignments:', error);
        extraAssignmentsData = {};
    }
}

/**
 * Construye un mapa de usuarios ya asignados por día
 * Formato: {
 *   'monday': {
 *     matutino: Set(['userId1']),
 *     vespertino: Set(['userId2']),
 *     largo: Set(['userId3'])
 *   }
 * }
 *
 * IMPORTANTE: Si un usuario tiene turno "largo", se bloquea para matutino y vespertino también
 * Un usuario PUEDE estar en el mismo worksite en matutino Y vespertino (son turnos diferentes)
 * Un usuario NO puede estar en DOS worksites diferentes del mismo día/régimen
 */
function buildAssignedUsersMap(weekKey) {
    const assignedMap = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // Inicializar mapa para cada día
    days.forEach(day => {
        assignedMap[day] = {
            matutino: new Set(),
            vespertino: new Set(),
            largo: new Set()
        };
    });

    // Recorrer todos los worksites y agregar asignaciones por defecto
    workSitesData.forEach(institutionGroup => {
        institutionGroup.workSites.forEach(site => {
            days.forEach(day => {
                // Asignaciones por defecto
                const defaultUser = getDefaultUserForSite(site._id, site.regime, day, weekKey);
                if (defaultUser) {
                    assignedMap[day][site.regime].add(defaultUser);

                    // Si es turno largo, también bloquear para matutino y vespertino
                    if (site.regime === 'largo') {
                        assignedMap[day].matutino.add(defaultUser);
                        assignedMap[day].vespertino.add(defaultUser);
                    }
                }

                // Asignaciones extras
                // IMPORTANTE: Usar clave única que incluya workSiteId Y régimen
                const uniqueKey = `${site._id}-${site.regime}`;
                const extraUserId = extraAssignmentsData[uniqueKey]?.[day];
                if (extraUserId) {
                    assignedMap[day][site.regime].add(extraUserId);

                    // Si es turno largo, también bloquear para matutino y vespertino
                    if (site.regime === 'largo') {
                        assignedMap[day].matutino.add(extraUserId);
                        assignedMap[day].vespertino.add(extraUserId);
                    }
                }
            });
        });
    });

    // Segunda pasada: Si alguien tiene matutino Y vespertino, bloquear largo
    days.forEach(day => {
        const matutinos = assignedMap[day].matutino;
        const vespertinos = assignedMap[day].vespertino;
        const largos = assignedMap[day].largo;

        // Encontrar usuarios que tienen matutino Y vespertino
        matutinos.forEach(userId => {
            if (vespertinos.has(userId)) {
                // Este usuario tiene matutino y vespertino, no puede hacer largo
                largos.add(userId);
            }
        });
    });

    return assignedMap;
}

function buildScheduleTable() {
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = '';

    const weekNumber = getWeekNumber(currentWeekStart);
    const isOddWeek = weekNumber % 2 !== 0;
    const weekKey = isOddWeek ? 'oddWeeks' : 'evenWeeks';

    // Construir mapa de usuarios ya asignados por día y régimen
    const assignedUsersMap = buildAssignedUsersMap(weekKey);

    let isFirstInstitution = true;

    workSitesData.forEach(institutionGroup => {
        // Separador entre instituciones
        if (!isFirstInstitution) {
            const separatorRow = document.createElement('tr');
            separatorRow.innerHTML = '<td class="separator-institution" colspan="6"></td>';
            tbody.appendChild(separatorRow);
        }
        isFirstInstitution = false;

        const institution = institutionGroup.institution;
        const workSites = institutionGroup.workSites;

        // Contar sitios únicos
        const uniqueSites = new Set();
        workSites.forEach(site => uniqueSites.add(site.abbreviation));
        const hasOnlyOneSite = uniqueSites.size === 1;

        // Agrupar por sitio de trabajo
        const groupedByWorkSite = [];
        let currentGroup = null;

        workSites.forEach(site => {
            if (!currentGroup || currentGroup.abbreviation !== site.abbreviation) {
                if (currentGroup) {
                    groupedByWorkSite.push(currentGroup);
                }
                currentGroup = {
                    abbreviation: site.abbreviation,
                    regimes: []
                };
            }
            currentGroup.regimes.push(site);
        });
        if (currentGroup) {
            groupedByWorkSite.push(currentGroup);
        }

        // Renderizar cada grupo
        groupedByWorkSite.forEach((workSiteGroup, groupIndex) => {
            workSiteGroup.regimes.forEach((site, regimeIndex) => {
                const row = document.createElement('tr');

                // Nombre del sitio
                let workSiteName = institution.name;

                // Agregar abreviatura si hay múltiples sitios
                if (!hasOnlyOneSite && site.abbreviation) {
                    workSiteName += ' ' + site.abbreviation;
                }

                // Agregar régimen
                const regimeLabel = site.regime === 'matutino' ? ' Matutino' :
                                  site.regime === 'vespertino' ? ' Vespertino' : ' Largo';
                workSiteName += regimeLabel;

                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                let rowHTML = `<td class="work-site">${workSiteName}</td>`;

                days.forEach(day => {
                    // Verificar si este día está habilitado para este régimen
                    const isDayEnabled = site.weeklySchedule?.[day] !== false;

                    // Buscar si hay asignación por defecto para este sitio/día
                    const defaultUser = getDefaultUserForSite(site._id, site.regime, day, weekKey);

                    // Buscar si hay asignación extra guardada
                    // IMPORTANTE: Usar clave única que incluya workSiteId Y régimen
                    const uniqueKey = `${site._id}-${site.regime}`;
                    const extraUserId = extraAssignmentsData[uniqueKey]?.[day];

                    // Obtener usuarios ya asignados en este día y régimen
                    const assignedUsers = assignedUsersMap[day]?.[site.regime] || new Set();

                    // Filtrar usuarios válidos para este sitio/día/régimen
                    let validUsers = filterUsersByWorkSite(site, institution, day);

                    // Excluir usuarios ya asignados en este día/régimen (excepto el usuario de este select)
                    const currentUserId = extraUserId || defaultUser;
                    validUsers = validUsers.filter(user => {
                        // Permitir el usuario actualmente asignado a este select
                        if (user._id === currentUserId) {
                            return true;
                        }
                        // Excluir usuarios ya asignados en otro worksite del mismo día/régimen
                        return !assignedUsers.has(user._id);
                    });

                    // Incluir régimen en el ID para hacerlo único (un worksite puede tener múltiples regímenes)
                    const selectId = `select-${site._id}-${site.regime}-${day}`;
                    const isLocked = lockedSelects.has(selectId);
                    const bgColor = defaultUser ? 'background-color: #e0e0e0;' : '';

                    // Determinar si el select debe estar deshabilitado por defecto:
                    // 1. Si el día no está habilitado en el cronograma
                    // 2. Si tiene asignación por defecto
                    // 3. Si tiene asignación extra guardada
                    // 4. O si está bloqueado manualmente con el candado
                    const hasAssignment = defaultUser || extraUserId;
                    const shouldBeDisabled = !isDayEnabled || hasAssignment || isLocked;
                    const selectDisabled = shouldBeDisabled ? 'disabled' : '';

                    // Determinar el estado inicial del candado
                    // Si no está en lockedSelects, determinamos si debe estar bloqueado por defecto
                    let lockState = 'unlocked';
                    let lockIcon = '🔓';

                    if (isLocked) {
                        lockState = 'locked';
                        lockIcon = '🔒';
                    } else if (shouldBeDisabled) {
                        // Si está deshabilitado por defecto, mostrarlo como bloqueado
                        lockState = 'locked';
                        lockIcon = '🔒';
                        lockedSelects.add(selectId);
                    }

                    rowHTML += `
                        <td class="droppable">
                            <div class="cell-content">
                                <select class="user-assignment-select"
                                        id="${selectId}"
                                        data-worksite-id="${site._id}"
                                        data-regime="${site.regime}"
                                        data-day="${day}"
                                        data-default-user="${defaultUser || ''}"
                                        data-originally-disabled="${!isDayEnabled}"
                                        ${selectDisabled}
                                        style="${bgColor}">
                                    <option value="">Sin asignar</option>
                                    ${validUsers.map(user => {
                                        const isDefault = user._id === defaultUser;
                                        const selected = user._id === (extraUserId || defaultUser) ? 'selected' : '';
                                        return `<option value="${user._id}" ${selected} ${isDefault ? 'style="background-color: #d0d0d0;"' : ''}>${user.username}${isDefault ? ' (Defecto)' : ''}</option>`;
                                    }).join('')}
                                </select>
                                <button class="lock-button ${lockState}" data-select-id="${selectId}">${lockIcon}</button>
                            </div>
                        </td>
                    `;
                });

                row.innerHTML = rowHTML;
                tbody.appendChild(row);

                // Separadores
                if (regimeIndex < workSiteGroup.regimes.length - 1) {
                    const thinSeparatorRow = document.createElement('tr');
                    thinSeparatorRow.innerHTML = '<td class="separator-thin" colspan="6"></td>';
                    tbody.appendChild(thinSeparatorRow);
                }
            });

            if (groupIndex < groupedByWorkSite.length - 1) {
                const thickSeparatorRow = document.createElement('tr');
                thickSeparatorRow.innerHTML = '<td class="separator-thick" colspan="6"></td>';
                tbody.appendChild(thickSeparatorRow);
            }
        });
    });

    // Agregar event listeners para detectar cambios
    document.querySelectorAll('.user-assignment-select').forEach(select => {
        select.addEventListener('change', handleSelectChange);
    });

    // Agregar event listeners para los botones de candado
    document.querySelectorAll('.lock-button').forEach(button => {
        button.addEventListener('click', handleLockButtonClick);
    });
}

function getDefaultUserForSite(workSiteId, regime, day, weekKey) {
    // Buscar en todos los usuarios cuál tiene asignación por defecto para este sitio/día
    for (const user of users) {
        if (user.defaultAssignments && user.defaultAssignments[weekKey]) {
            const assignments = user.defaultAssignments[weekKey][day];
            if (assignments && Array.isArray(assignments)) {
                const match = assignments.find(a =>
                    a.workSiteId === workSiteId && a.regime === regime
                );
                if (match) {
                    return user._id;
                }
            }
        }
    }
    return null;
}

function filterUsersByWorkSite(workSite, institution, day) {
    // Primero obtener solo los usuarios disponibles para este día (sin vacaciones/licencias)
    const availableUsersForDay = availabilityData[day] || [];
    const availableUserIds = new Set(availableUsersForDay.map(u => u._id));

    return users.filter(user => {
        // 0. Verificar que el usuario esté disponible (no de vacaciones/licencia)
        if (!availableUserIds.has(user._id)) {
            return false;
        }

        // 1. Filtrar por provincia y sector
        const province = institution.province;
        const sector = institution.sector;

        const isPrivateNeuquen = province === 'Neuquén' && sector === 'Sector Privado';
        const isPublicNeuquen = province === 'Neuquén' && sector === 'Sector Público';
        const isPrivateRioNegro = province === 'Río Negro' && sector === 'Sector Privado';
        const isPublicRioNegro = province === 'Río Negro' && sector === 'Sector Público';

        const hasLocationPermission =
            (isPrivateNeuquen && user.worksInPrivateNeuquen) ||
            (isPublicNeuquen && user.worksInPublicNeuquen) ||
            (isPrivateRioNegro && user.worksInPrivateRioNegro) ||
            (isPublicRioNegro && user.worksInPublicRioNegro);

        if (!hasLocationPermission) return false;

        // 2. Filtrar por especialidades
        if (workSite.specialties?.isCardio && !user.doesCardio) return false;
        if (workSite.specialties?.isPediatrics && !user.doesPediatrics) return false;
        if (workSite.specialties?.isRNM && !user.doesRNM) return false;

        // 3. CMAC-only
        if (user.worksInCmacOnly) {
            if (!institution.name.toLowerCase().includes('cmac')) return false;
        }

        // 4. Filtrar por esquema horario y régimen
        if (user.workSchedule && day) {
            const userSchedule = user.workSchedule[day];
            const regime = workSite.regime;

            if (regime === 'matutino' && userSchedule !== 'Mañana' && userSchedule !== 'Variable') {
                return false;
            }
            if (regime === 'vespertino' && userSchedule !== 'Tarde' && userSchedule !== 'Variable') {
                return false;
            }
            if (regime === 'largo' && userSchedule !== 'Variable') {
                return false;
            }
        }

        return true;
    });
}

function handleSelectChange(event) {
    const select = event.target;
    const defaultUser = select.dataset.defaultUser;
    const selectedUser = select.value;

    // Si seleccionó el usuario por defecto, poner fondo gris
    // Si seleccionó otro usuario (asignación extra), poner fondo blanco
    if (selectedUser === defaultUser) {
        select.style.backgroundColor = '#e0e0e0';
    } else if (selectedUser === '') {
        select.style.backgroundColor = defaultUser ? '#e0e0e0' : '';
    } else {
        select.style.backgroundColor = '#ffff99'; // Amarillo para extras
    }

    // Actualizar las asignaciones extras en memoria
    const workSiteId = select.dataset.worksiteId;
    const regime = select.dataset.regime;
    const day = select.dataset.day;

    // IMPORTANTE: Usar clave única que incluya workSiteId Y régimen
    const uniqueKey = `${workSiteId}-${regime}`;

    if (selectedUser && selectedUser !== defaultUser) {
        // Nueva asignación extra
        if (!extraAssignmentsData[uniqueKey]) {
            extraAssignmentsData[uniqueKey] = {};
        }
        extraAssignmentsData[uniqueKey][day] = selectedUser;
    } else if (extraAssignmentsData[uniqueKey]?.[day]) {
        // Eliminar asignación extra si vuelve a por defecto o vacío
        delete extraAssignmentsData[uniqueKey][day];
        if (Object.keys(extraAssignmentsData[uniqueKey]).length === 0) {
            delete extraAssignmentsData[uniqueKey];
        }
    }

    // Reconstruir la tabla para actualizar las opciones disponibles
    buildScheduleTable();
}

function handleLockButtonClick(event) {
    const button = event.target;
    const selectId = button.dataset.selectId;

    console.log('Button clicked, selectId:', selectId);

    const select = document.getElementById(selectId);

    if (!select) {
        console.error('Select not found with ID:', selectId);
        return;
    }

    console.log('Select found:', select.id, 'Current disabled state:', select.disabled);

    // Toggle lock state
    if (lockedSelects.has(selectId)) {
        // Unlock - habilitar el select (sin importar su estado original)
        lockedSelects.delete(selectId);
        button.textContent = '🔓';
        button.classList.remove('locked');
        button.classList.add('unlocked');
        select.disabled = false;
        console.log('Unlocked - select disabled:', select.disabled);
    } else {
        // Lock - deshabilitar el select
        lockedSelects.add(selectId);
        button.textContent = '🔒';
        button.classList.remove('unlocked');
        button.classList.add('locked');
        select.disabled = true;
        console.log('Locked - select disabled:', select.disabled);
    }
}

async function saveExtraAssignments() {
    try {
        showSpinner();

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const weekStartISO = currentWeekStart.toISOString().split('T')[0];

        // Recolectar solo las asignaciones extras (diferentes a las por defecto)
        const extraAssignments = {};

        document.querySelectorAll('.user-assignment-select').forEach(select => {
            const workSiteId = select.dataset.worksiteId;
            const regime = select.dataset.regime;
            const day = select.dataset.day;
            const defaultUser = select.dataset.defaultUser;
            const selectedUser = select.value;

            // Solo guardar si es diferente a la asignación por defecto
            if (selectedUser && selectedUser !== defaultUser) {
                // IMPORTANTE: Usar clave única que incluya workSiteId Y régimen
                const uniqueKey = `${workSiteId}-${regime}`;
                if (!extraAssignments[uniqueKey]) {
                    extraAssignments[uniqueKey] = {};
                }
                extraAssignments[uniqueKey][day] = selectedUser;
            }
        });

        const response = await fetch(`${apiUrl}/extra-assignments/week`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                weekStart: weekStartISO,
                assignments: extraAssignments
            })
        });

        if (!response.ok) {
            throw new Error('Error al guardar asignaciones extras');
        }

        toast.success('Asignaciones extras guardadas exitosamente');
        await loadExtraAssignmentsFromBackend();

    } catch (error) {
        console.error('Error saving extra assignments:', error);
        toast.error('Error al guardar asignaciones: ' + error.message);
    } finally {
        hideSpinner();
    }
}

async function generateMonthlyReport() {
    try {
        showSpinner();

        // Pedir al usuario mes y año
        const month = prompt('Ingrese el mes (1-12):');
        const year = prompt('Ingrese el año (ej: 2025):');

        if (!month || !year) {
            toast.warning('Debe ingresar mes y año');
            return;
        }

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${apiUrl}/extra-assignments/report/${year}/${month}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al generar reporte');
        }

        const result = await response.json();

        // Mostrar reporte en una nueva ventana o descargarlo
        displayMonthlyReport(result.data, result.period, month, year);

    } catch (error) {
        console.error('Error generating report:', error);
        toast.error('Error al generar reporte: ' + error.message);
    } finally {
        hideSpinner();
    }
}

function displayMonthlyReport(reportData, period, month, year) {
    // Crear ventana nueva con el reporte
    const reportWindow = window.open('', '_blank');

    if (!reportWindow) {
        toast.error('No se pudo abrir la ventana del reporte. Por favor, permita ventanas emergentes para este sitio.');
        return;
    }

    const { defaultAssignments, extraAssignments, userTotals, summary } = reportData;

    let html = `
        <html>
        <head>
            <title>Reporte Mensual de Asignaciones - ${month}/${year}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    background-color: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                h1 {
                    color: #0056b3;
                    border-bottom: 3px solid #0056b3;
                    padding-bottom: 10px;
                }
                h2 {
                    color: #333;
                    margin-top: 30px;
                    background-color: #e3f2fd;
                    padding: 10px;
                    border-left: 4px solid #0056b3;
                }
                .summary-box {
                    background-color: #fffbe6;
                    border: 2px solid #ffd94d;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .summary-box h3 {
                    margin-top: 0;
                    color: #a37a00;
                }
                .summary-stats {
                    display: flex;
                    justify-content: space-around;
                    flex-wrap: wrap;
                    gap: 15px;
                    margin-top: 15px;
                }
                .stat-item {
                    background-color: white;
                    padding: 15px;
                    border-radius: 5px;
                    text-align: center;
                    min-width: 150px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .stat-label {
                    font-size: 12px;
                    color: #666;
                    text-transform: uppercase;
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #0056b3;
                    margin-top: 5px;
                }
                .stat-percentage {
                    font-size: 14px;
                    color: #1a7a32;
                    margin-top: 5px;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin-top: 20px;
                    background-color: white;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }
                th {
                    background-color: #0056b3;
                    color: white;
                    font-weight: bold;
                }
                tr:nth-child(even) {
                    background-color: #f8f9fa;
                }
                tr:hover {
                    background-color: #e3f2fd;
                }
                .print-btn {
                    margin: 20px 0;
                    padding: 12px 24px;
                    font-size: 16px;
                    cursor: pointer;
                    background-color: #0056b3;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    transition: background-color 0.3s;
                }
                .print-btn:hover {
                    background-color: #003d82;
                }
                .no-data {
                    padding: 20px;
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }
                @media print {
                    .print-btn { display: none; }
                    body { background-color: white; }
                    .container { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Reporte Mensual de Asignaciones</h1>
                <p><strong>Período:</strong> ${month}/${year}</p>
                <button class="print-btn" onclick="window.print()">Imprimir</button>

                <!-- Resumen General -->
                <div class="summary-box">
                    <h3>Resumen General</h3>
                    <div class="summary-stats">
                        <div class="stat-item">
                            <div class="stat-label">Total Asignaciones</div>
                            <div class="stat-value">${summary.totalAssignments}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Por Defecto</div>
                            <div class="stat-value">${summary.totalDefaultAssignments}</div>
                            <div class="stat-percentage">${summary.defaultPercentage}%</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Extras</div>
                            <div class="stat-value">${summary.totalExtraAssignments}</div>
                            <div class="stat-percentage">${summary.extraPercentage}%</div>
                        </div>
                    </div>
                </div>

                <!-- Tabla de Totales por Usuario -->
                <h2>Resumen por Usuario</h2>
                ${Object.keys(userTotals).length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Por Defecto</th>
                                <th>Extras</th>
                                <th>Total</th>
                                <th>% del Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(userTotals)
                                .sort((a, b) => b[1].totalCount - a[1].totalCount) // Ordenar por total descendente
                                .map(([userId, data]) => `
                                <tr>
                                    <td><strong>${data.username}</strong></td>
                                    <td style="text-align: center;">${data.defaultCount}</td>
                                    <td style="text-align: center;">${data.extraCount}</td>
                                    <td style="text-align: center;"><strong>${data.totalCount}</strong></td>
                                    <td style="text-align: center; color: #0056b3;"><strong>${data.percentage}%</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<div class="no-data">No hay asignaciones en este mes</div>'}

                <!-- Tabla de Asignaciones por Defecto -->
                <h2>Asignaciones por Defecto</h2>
                ${Object.keys(defaultAssignments).length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Cantidad</th>
                                <th>Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(defaultAssignments).map(([userId, data]) => `
                                <tr>
                                    <td><strong>${data.username}</strong></td>
                                    <td style="text-align: center;">${data.count}</td>
                                    <td style="font-size: 11px;">${data.details.join(', ')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<div class="no-data">No hay asignaciones por defecto en este mes</div>'}

                <!-- Tabla de Asignaciones Extras -->
                <h2>Asignaciones Extras</h2>
                ${Object.keys(extraAssignments).length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Cantidad</th>
                                <th>Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(extraAssignments).map(([userId, data]) => `
                                <tr>
                                    <td><strong>${data.username}</strong></td>
                                    <td style="text-align: center;">${data.count}</td>
                                    <td style="font-size: 11px;">${data.details.join(', ')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<div class="no-data">No hay asignaciones extras en este mes</div>'}
            </div>
        </body>
        </html>
    `;

    reportWindow.document.write(html);
    reportWindow.document.close();
}
