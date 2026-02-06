import toast from './toast.js';
import { loadWorkSitesTable } from './loadWorkSites.js';

const apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://adelvalle-88dd0d34d7bd.herokuapp.com';

let currentWeekType = 'odd'; // 'odd' or 'even'
let users = [];
let workSitesData = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        showSpinner();

        // Cargar usuarios
        await loadUsers();

        // Cargar sitios de trabajo
        await loadWorkSites();

        // Mostrar tabs y tablas
        document.getElementById('weeks-tabs').style.display = 'block';
        document.getElementById('odd-week-container').style.display = 'block';
        document.getElementById('even-week-container').style.display = 'none';

        // Setup event listeners
        setupEventListeners();

        // Cargar asignaciones existentes
        await loadAllDefaultAssignments();

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

        // Ordenar alfabéticamente por username
        users.sort((a, b) => a.username.localeCompare(b.username));

        // Poblar el filtro de usuarios
        populateUserFilter();

    } catch (error) {
        console.error('Error loading users:', error);
        throw error;
    }
}

function populateUserFilter() {
    const userFilter = document.getElementById('user-filter');
    if (!userFilter) return;

    // Limpiar opciones existentes (excepto la primera)
    userFilter.innerHTML = '<option value="">-- Seleccione un usuario --</option>';

    // Agregar usuarios
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user._id;
        option.textContent = user.username;
        userFilter.appendChild(option);
    });
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

        // Construir tablas para ambas semanas
        buildScheduleTable('odd');
        buildScheduleTable('even');

    } catch (error) {
        console.error('Error loading work sites:', error);
        throw error;
    }
}

/**
 * Filtra usuarios según las características del sitio de trabajo, institución, día y régimen
 */
function filterUsersByWorkSite(workSite, institution, day) {
    return users.filter(user => {
        // 1. Filtrar por provincia y sector
        const province = institution.province;
        const sector = institution.sector;

        // Mapeo de condiciones
        const isPrivateNeuquen = province === 'Neuquén' && sector === 'Sector Privado';
        const isPublicNeuquen = province === 'Neuquén' && sector === 'Sector Público';
        const isPrivateRioNegro = province === 'Río Negro' && sector === 'Sector Privado';
        const isPublicRioNegro = province === 'Río Negro' && sector === 'Sector Público';

        // Verificar permisos de usuario según provincia/sector
        const hasLocationPermission =
            (isPrivateNeuquen && user.worksInPrivateNeuquen) ||
            (isPublicNeuquen && user.worksInPublicNeuquen) ||
            (isPrivateRioNegro && user.worksInPrivateRioNegro) ||
            (isPublicRioNegro && user.worksInPublicRioNegro);

        if (!hasLocationPermission) {
            return false;
        }

        // 2. Filtrar por especialidades del sitio de trabajo
        if (workSite.specialties?.isCardio && !user.doesCardio) {
            return false;
        }

        if (workSite.specialties?.isPediatrics && !user.doesPediatrics) {
            return false;
        }

        if (workSite.specialties?.isRNM && !user.doesRNM) {
            return false;
        }

        // 3. Si el usuario solo trabaja en CMAC, filtrar por nombre de institución
        if (user.worksInCmacOnly) {
            // Solo permitir si la institución contiene "CMAC" en el nombre
            if (!institution.name.toLowerCase().includes('cmac')) {
                return false;
            }
        }

        // 4. Filtrar por esquema horario del usuario y régimen del sitio
        if (user.workSchedule && day) {
            const userSchedule = user.workSchedule[day];
            const regime = workSite.regime;

            // Si el régimen es matutino, solo usuarios con esquema Mañana o Variable
            if (regime === 'matutino' && userSchedule !== 'Mañana' && userSchedule !== 'Variable') {
                return false;
            }

            // Si el régimen es vespertino, solo usuarios con esquema Tarde o Variable
            if (regime === 'vespertino' && userSchedule !== 'Tarde' && userSchedule !== 'Variable') {
                return false;
            }

            // Si el régimen es largo, solo usuarios con esquema Variable
            if (regime === 'largo' && userSchedule !== 'Variable') {
                return false;
            }
        }

        return true;
    });
}

/**
 * Construye un mapa de usuarios ya asignados por día basado en savedValues
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
function buildAssignedUsersMap(savedValues) {
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

    // Procesar savedValues para construir el mapa
    // Guardamos qué usuarios están asignados a cada día/régimen
    Object.entries(savedValues).forEach(([selectId, data]) => {
        const userId = data.userId;
        if (userId) {
            const day = data.day;
            const regime = data.regime;

            assignedMap[day][regime].add(userId);

            // Si es turno largo, también bloquear para matutino y vespertino
            // (porque largo = todo el día)
            if (regime === 'largo') {
                assignedMap[day].matutino.add(userId);
                assignedMap[day].vespertino.add(userId);
            }
        }
    });

    // Segunda pasada: Si alguien tiene matutino Y vespertino (en diferentes worksites), bloquear largo
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

function buildScheduleTable(weekType, savedValues = {}) {
    const tbody = document.getElementById(`schedule-body-${weekType}`);

    // Si no se proporcionaron savedValues, guardar los valores actuales antes de limpiar
    if (Object.keys(savedValues).length === 0) {
        document.querySelectorAll(`#schedule-body-${weekType} select.user-assignment-select`).forEach(select => {
            if (select.value) {
                savedValues[select.id] = {
                    userId: select.value,
                    day: select.dataset.day,
                    regime: select.dataset.regime
                };
            }
        });
    }

    tbody.innerHTML = '';

    // Construir mapa de usuarios asignados basado en savedValues
    const assignedUsersMap = buildAssignedUsersMap(savedValues);

    let isFirstInstitution = true;

    workSitesData.forEach(institutionGroup => {
        // Agregar separador entre instituciones
        if (!isFirstInstitution) {
            const separatorRow = document.createElement('tr');
            separatorRow.innerHTML = '<td class="separator-institution" colspan="6"></td>';
            tbody.appendChild(separatorRow);
        }
        isFirstInstitution = false;

        const institution = institutionGroup.institution;
        const workSites = institutionGroup.workSites;

        // Contar sitios de trabajo únicos
        const uniqueSites = new Set();
        workSites.forEach(site => uniqueSites.add(site.abbreviation));
        const hasOnlyOneSite = uniqueSites.size === 1;

        // Agrupar por sitio de trabajo (mismo abbreviation)
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

        // Renderizar cada grupo de sitios de trabajo
        groupedByWorkSite.forEach((workSiteGroup, groupIndex) => {
            workSiteGroup.regimes.forEach((site, regimeIndex) => {
                const row = document.createElement('tr');

                // Determinar el nombre del sitio de trabajo
                let workSiteName = institution.name;

                if (!hasOnlyOneSite) {
                    workSiteName += ' ' + site.abbreviation;
                }

                // Agregar régimen
                const regimeLabel = site.regime === 'matutino' ? ' Matutino' :
                                  site.regime === 'vespertino' ? ' Vespertino' : ' Largo';
                workSiteName += regimeLabel;

                // Crear celdas para cada día de la semana
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

                let rowHTML = `<td class="work-site">${workSiteName}</td>`;

                days.forEach((day) => {
                    // Filtrar usuarios válidos para este sitio de trabajo, día y régimen específicos
                    let validUsers = filterUsersByWorkSite(site, institution, day) || [];

                    // Obtener usuarios ya asignados en este día y régimen
                    const assignedUsers = assignedUsersMap[day]?.[site.regime] || new Set();

                    // Obtener el usuario actualmente asignado a este select (desde savedValues)
                    // IMPORTANTE: Incluir régimen en el ID para hacerlo único
                    const currentSelectId = `select-${weekType}-${site._id}-${site.regime}-${day}`;
                    const currentUserId = savedValues[currentSelectId]?.userId || null;

                    // Excluir usuarios ya asignados en este día/régimen (excepto el usuario de este select)
                    validUsers = validUsers.filter(user => {
                        // Permitir el usuario actualmente asignado a este select
                        if (user._id === currentUserId) {
                            return true;
                        }
                        // Excluir usuarios ya asignados en otro worksite del mismo día/régimen
                        return !assignedUsers.has(user._id);
                    });

                    // Crear select con lista de usuarios filtrados por día
                    // IMPORTANTE: Incluir régimen en el ID para hacerlo único
                    const selectId = `select-${weekType}-${site._id}-${site.regime}-${day}`;
                    const userOptions = validUsers.map(user => {
                        if (!user || !user._id || !user.username) {
                            return '';
                        }
                        return `<option value="${user._id}">${user.username}</option>`;
                    }).join('');

                    rowHTML += `
                        <td class="droppable">
                            <select class="user-assignment-select"
                                    id="${selectId}"
                                    data-worksite-id="${site._id}"
                                    data-regime="${site.regime}"
                                    data-day="${day}"
                                    data-week-type="${weekType}">
                                <option value="">Sin asignar</option>
                                ${userOptions}
                            </select>
                        </td>
                    `;
                });

                row.innerHTML = rowHTML;
                tbody.appendChild(row);

                // Separador delgado entre regímenes del mismo sitio
                if (regimeIndex < workSiteGroup.regimes.length - 1) {
                    const thinSeparatorRow = document.createElement('tr');
                    thinSeparatorRow.innerHTML = '<td class="separator-thin" colspan="6"></td>';
                    tbody.appendChild(thinSeparatorRow);
                }
            });

            // Separador grueso entre diferentes sitios de trabajo
            if (groupIndex < groupedByWorkSite.length - 1) {
                const thickSeparatorRow = document.createElement('tr');
                thickSeparatorRow.innerHTML = '<td class="separator-thick" colspan="6"></td>';
                tbody.appendChild(thickSeparatorRow);
            }
        });
    });

    // Restaurar valores en los selects
    Object.keys(savedValues).forEach(selectId => {
        const select = tbody.querySelector(`#${selectId}`);
        if (select && savedValues[selectId].userId) {
            select.value = savedValues[selectId].userId;
        }
    });

    // Agregar event listeners a todos los selects para reconstruir cuando cambien
    tbody.querySelectorAll('select.user-assignment-select').forEach(select => {
        select.addEventListener('change', () => handleAssignmentChange(weekType));
    });
}

function handleAssignmentChange(weekType) {
    // Guardar el valor actual del filtro
    const userFilter = document.getElementById('user-filter');
    const selectedFilterUser = userFilter ? userFilter.value : '';

    // Reconstruir la tabla (buildScheduleTable guardará automáticamente los valores actuales)
    buildScheduleTable(weekType);

    // Restaurar el filtro
    if (selectedFilterUser && userFilter) {
        userFilter.value = selectedFilterUser;
        highlightUserAssignments();
    }
}

function setupEventListeners() {
    const oddWeekTab = document.getElementById('odd-week-tab');
    const evenWeekTab = document.getElementById('even-week-tab');
    const saveButton = document.getElementById('save-assignments');
    const clearButton = document.getElementById('clear-assignments');
    const userFilter = document.getElementById('user-filter');
    const clearFilterButton = document.getElementById('clear-filter');

    oddWeekTab.addEventListener('click', () => switchWeekTab('odd'));
    evenWeekTab.addEventListener('click', () => switchWeekTab('even'));
    saveButton.addEventListener('click', saveAllDefaultAssignments);
    clearButton.addEventListener('click', clearAllAssignments);

    // Agregar listeners para el filtro de usuario
    if (userFilter) {
        userFilter.addEventListener('change', highlightUserAssignments);
    }

    if (clearFilterButton) {
        clearFilterButton.addEventListener('click', clearUserFilter);
    }
}

function highlightUserAssignments() {
    const userFilter = document.getElementById('user-filter');
    const selectedUserId = userFilter.value;

    // Limpiar todos los resaltados
    document.querySelectorAll('.user-assignment-select').forEach(select => {
        select.classList.remove('highlighted');
    });

    // Si se seleccionó un usuario, resaltar sus asignaciones
    if (selectedUserId) {
        document.querySelectorAll('.user-assignment-select').forEach(select => {
            if (select.value === selectedUserId) {
                select.classList.add('highlighted');
            }
        });
    }
}

function clearUserFilter() {
    const userFilter = document.getElementById('user-filter');
    userFilter.value = '';
    highlightUserAssignments();
}

function switchWeekTab(weekType) {
    currentWeekType = weekType;

    // Actualizar tabs
    document.getElementById('odd-week-tab').classList.toggle('active', weekType === 'odd');
    document.getElementById('even-week-tab').classList.toggle('active', weekType === 'even');

    // Mostrar/ocultar contenedores
    document.getElementById('odd-week-container').style.display = weekType === 'odd' ? 'block' : 'none';
    document.getElementById('even-week-container').style.display = weekType === 'even' ? 'block' : 'none';

    // Reaplica el resaltado de usuario si hay uno seleccionado
    highlightUserAssignments();
}

async function loadAllDefaultAssignments() {
    try {
        // Recorrer cada usuario y cargar sus asignaciones
        users.forEach(user => {
            if (user.defaultAssignments) {
                const { oddWeeks, evenWeeks } = user.defaultAssignments;

                // Cargar semanas impares
                loadAssignmentsForWeek(user._id, oddWeeks, 'odd');

                // Cargar semanas pares
                loadAssignmentsForWeek(user._id, evenWeeks, 'even');
            }
        });

    } catch (error) {
        console.error('Error loading default assignments:', error);
    }
}

function loadAssignmentsForWeek(userId, weekData, weekType) {
    if (!weekData) return;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    days.forEach(day => {
        if (weekData[day] && Array.isArray(weekData[day])) {
            weekData[day].forEach(assignment => {
                // IMPORTANTE: Incluir régimen en el ID para que coincida con el select correcto
                const selectId = `select-${weekType}-${assignment.workSiteId}-${assignment.regime}-${day}`;
                const select = document.getElementById(selectId);

                if (select) {
                    // Verificar que el userId existe como opción en el select
                    const option = select.querySelector(`option[value="${userId}"]`);
                    if (option) {
                        select.value = userId;
                    } else {
                        select.value = ""; // Asegurar que quede en "Sin asignar"
                    }
                } else {
                    console.warn(`Select not found: ${selectId}`);
                }
            });
        }
    });
}

async function saveAllDefaultAssignments() {
    try {
        showSpinner();

        // Recolectar todas las asignaciones por usuario
        const userAssignments = {};

        // Inicializar estructura para cada usuario
        users.forEach(user => {
            userAssignments[user._id] = {
                useAlternatingWeeks: true, // Siempre true ahora
                oddWeeks: {
                    monday: [],
                    tuesday: [],
                    wednesday: [],
                    thursday: [],
                    friday: []
                },
                evenWeeks: {
                    monday: [],
                    tuesday: [],
                    wednesday: [],
                    thursday: [],
                    friday: []
                }
            };
        });

        // Recolectar asignaciones de ambas semanas
        ['odd', 'even'].forEach(weekType => {
            const weekKey = weekType === 'odd' ? 'oddWeeks' : 'evenWeeks';
            const selects = document.querySelectorAll(`.user-assignment-select[data-week-type="${weekType}"]`);

            selects.forEach(select => {
                const userId = select.value;
                if (!userId) return; // Skip si no hay usuario asignado

                const day = select.dataset.day;
                const workSiteId = select.dataset.worksiteId;
                const regime = select.dataset.regime;

                if (userAssignments[userId]) {
                    userAssignments[userId][weekKey][day].push({
                        workSiteId,
                        regime
                    });
                }
            });
        });

        // Guardar para cada usuario que tenga asignaciones
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const savePromises = [];

        for (const userId in userAssignments) {
            const assignments = userAssignments[userId];

            // Solo guardar si tiene al menos una asignación
            const hasAssignments = Object.values(assignments.oddWeeks).some(arr => arr.length > 0) ||
                                  Object.values(assignments.evenWeeks).some(arr => arr.length > 0);

            if (hasAssignments || users.find(u => u._id === userId)?.defaultAssignments) {
                const promise = fetch(`${apiUrl}/auth/user/${userId}/default-assignments`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ defaultAssignments: assignments })
                });

                savePromises.push(promise);
            }
        }

        const responses = await Promise.all(savePromises);

        // Verificar que todas las respuestas sean exitosas
        const allSuccess = await Promise.all(
            responses.map(async response => {
                const result = await response.json();
                return result.success;
            })
        );

        if (allSuccess.every(success => success)) {
            toast.success('Todas las asignaciones por defecto han sido guardadas exitosamente');

            // Recargar usuarios para actualizar datos locales
            await loadUsers();
            await loadAllDefaultAssignments();
        } else {
            throw new Error('Algunas asignaciones no se pudieron guardar');
        }

    } catch (error) {
        console.error('Error saving default assignments:', error);
        toast.error('Error al guardar asignaciones: ' + error.message);
    } finally {
        hideSpinner();
    }
}

function clearAllAssignments() {
    toast.confirm('¿Estás seguro de que quieres limpiar TODAS las asignaciones por defecto de TODOS los usuarios?', () => {
        // Limpiar todos los selects
        document.querySelectorAll('.user-assignment-select').forEach(select => {
            select.value = '';
        });

        toast.success('Todas las asignaciones han sido limpiadas. Haz clic en "Guardar" para confirmar los cambios.');
    });
}
