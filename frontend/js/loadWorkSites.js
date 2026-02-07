// Módulo para cargar dinámicamente los sitios de trabajo desde la base de datos
import toast from './toast.js';
import { buildWorkSiteName } from './workSiteNameUtils.js';

const apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://anestesiadelvalle.ar';

/**
 * Carga los sitios de trabajo desde la API y construye la tabla dinámicamente
 */
export async function loadWorkSitesTable() {
    try {
        const response = await fetch(`${apiUrl}/work-sites/schedule/data`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar sitios de trabajo');
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Error al obtener datos');
        }

        return buildScheduleTable(result.data);
    } catch (error) {
        console.error('Error cargando sitios de trabajo:', error);
        toast.error('Hubo un problema al cargar los sitios de trabajo: ' + error.message);
        return null;
    }
}

/**
 * Construye la tabla de programación a partir de los datos de la API
 * @param {Array} scheduleData - Datos agrupados por institución
 * @returns {HTMLElement} - Elemento tbody con todas las filas
 */
function buildScheduleTable(scheduleData) {
    const tbody = document.createElement('tbody');
    tbody.id = 'schedule-body';

    let isFirstInstitution = true;

    scheduleData.forEach(institutionGroup => {
        // Agregar separador entre instituciones (excepto antes de la primera)
        if (!isFirstInstitution) {
            const separatorRow = document.createElement('tr');
            separatorRow.innerHTML = '<td class="separator-institution" colspan="6"></td>';
            tbody.appendChild(separatorRow);
        }
        isFirstInstitution = false;

        const institution = institutionGroup.institution;
        const workSites = institutionGroup.workSites;

        // Contar sitios de trabajo únicos (sin contar regímenes)
        const uniqueSites = new Set();
        workSites.forEach(site => {
            uniqueSites.add(site.abbreviation);
        });
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

                // Crear ID único para cada select basado en el displayName
                const baseId = site.displayName
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
                    .replace(/\s+/g, '-'); // Reemplazar espacios por guiones

                const regimeSuffix = site.regime === 'matutino' ? 'short' :
                                   site.regime === 'vespertino' ? 'short' : 'long';

                // Construir nombre usando la utilidad compartida
                // Nota: hasMultipleRegimes siempre true aquí porque en loadWorkSites
                // cada régimen se carga por separado, entonces siempre mostramos el régimen
                const workSiteName = buildWorkSiteName(
                    site,
                    institution,
                    site.regime,
                    !hasOnlyOneSite, // Mostrar abreviatura solo si tiene múltiples sitios
                    true // Siempre mostrar régimen en weekly-schedule
                );

                // Crear celdas para cada día de la semana
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                const dayNames = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

                let rowHTML = `<td class="work-site">${workSiteName}</td>`;

                days.forEach((day, dayIndex) => {
                    const selectId = `${baseId}-${dayNames[dayIndex]}-${regimeSuffix}`;
                    const isDisabled = !site.weeklySchedule[day];
                    const disabledAttr = isDisabled ? ' disabled' : '';

                    // IMPORTANTE: Agregar data-worksite-id y data-regime para mapeo en carga de cronogramas
                    rowHTML += `
                        <td class="droppable">
                            <select id="${selectId}" data-worksite-id="${site._id}" data-regime="${site.regime}"${disabledAttr}></select>
                        </td>
                    `;
                });

                row.innerHTML = rowHTML;
                tbody.appendChild(row);

                // Separador delgado entre regímenes del mismo sitio (excepto el último régimen)
                if (regimeIndex < workSiteGroup.regimes.length - 1) {
                    const thinSeparatorRow = document.createElement('tr');
                    thinSeparatorRow.innerHTML = '<td class="separator-thin" colspan="6"></td>';
                    tbody.appendChild(thinSeparatorRow);
                }
            });

            // Separador grueso entre diferentes sitios de trabajo (excepto el último sitio)
            if (groupIndex < groupedByWorkSite.length - 1) {
                const thickSeparatorRow = document.createElement('tr');
                thickSeparatorRow.innerHTML = '<td class="separator-thick" colspan="6"></td>';
                tbody.appendChild(thickSeparatorRow);
            }
        });
    });

    return tbody;
}

/**
 * Reemplaza la tabla hardcodeada por la tabla dinámica
 */
export async function initializeScheduleTable() {
    const scheduleTable = document.getElementById('schedule-assistant');

    if (!scheduleTable) {
        console.error('No se encontró la tabla schedule-assistant');
        return false;
    }

    // Mostrar spinner mientras carga
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.style.display = 'block';

    try {
        const newTbody = await loadWorkSitesTable();

        if (!newTbody) {
            throw new Error('No se pudo construir la tabla');
        }

        // Reemplazar el tbody existente
        const oldTbody = scheduleTable.querySelector('tbody');
        if (oldTbody) {
            scheduleTable.replaceChild(newTbody, oldTbody);
        } else {
            scheduleTable.appendChild(newTbody);
        }

        console.log('✓ Tabla de sitios de trabajo cargada dinámicamente');
        return true;
    } catch (error) {
        console.error('Error inicializando tabla:', error);
        return false;
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}
