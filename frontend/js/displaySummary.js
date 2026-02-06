import { buildWorkSiteName, mapWorkSiteRegimes, getInstitutionOrder } from './workSiteNameUtils.js';
import { generateWeekHeaders } from './weekDateFormatter.js';

document.addEventListener('DOMContentLoaded', () => {
    const summaryContainer = document.getElementById('summary-container');
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com';

    // Hacer una solicitud al backend para obtener el último schedule
    fetch(`${apiUrl}/schedule/last-schedule`)
        .then(response => response.json())
        .then(data => {
            if (!data.success || !data.schedule) {
                console.error('No schedule found');
                summaryContainer.innerHTML = '<p>No hay programación disponible para mostrar.</p>';
                return;
            }

            const schedule = data.schedule;

            // Transformar del formato optimizado al formato legacy
            const { assignments, dayHeaders, selectConfig } = transformOptimizedToLegacy(schedule);
            const timestamp = schedule.createdAt;
            const generatedBy = schedule.createdBy?.username || 'Unknown';

            // Hacer una solicitud para obtener la disponibilidad
            fetch(`${apiUrl}/availability`)
                .then(response => response.json())
                .then(availability => {
                    // Limpiar los encabezados de cualquier símbolo de actualización y botones MK
                    const cleanedDayHeaders = {
                        monday: dayHeaders.monday.replace(/🔄/g, '').replace(/MK/g, '').trim(),
                        tuesday: dayHeaders.tuesday.replace(/🔄/g, '').replace(/MK/g, '').trim(),
                        wednesday: dayHeaders.wednesday.replace(/🔄/g, '').replace(/MK/g, '').trim(),
                        thursday: dayHeaders.thursday.replace(/🔄/g, '').replace(/MK/g, '').trim(),
                        friday: dayHeaders.friday.replace(/🔄/g, '').replace(/MK/g, '').trim()
                    };

                    // Generar la tabla de resumen basada en selectConfig (todos los días)
                    let summaryTable = generateSummaryTable(cleanedDayHeaders, selectConfig);

                    // Poblar la tabla con los assignments, availability y selectConfig
                    populateAssignments(assignments, summaryTable, availability, selectConfig);

                    // Eliminar filas vacías
                    removeEmptyRows(summaryTable);

                    // Formatear la fecha de impresión
                    const formattedTimestamp = formatTimestamp(timestamp);

                    // Crear el contenedor para la fecha y el botón de descarga
                    const headerDiv = document.createElement('div');
                    headerDiv.className = 'header-div';

                        // Crear el div para la fecha de impresión
                        const timestampDiv = document.createElement('div');
                        timestampDiv.className = 'timestamp-div';

                        // Crear el elemento de fecha de impresión
                        const timestampElement = document.createElement('p');
                        timestampElement.textContent = `Programación generada el ${formattedTimestamp} por ${generatedBy}`;
                        timestampElement.className = 'timestamp';

                    // Añadir el elemento de fecha al div de la fecha
                    timestampDiv.appendChild(timestampElement);

                    // Crear el botón de descarga
                    const downloadButton = document.createElement('button');
                    downloadButton.id = 'download-button';
                    downloadButton.className = 'download-button';

                    // Agregar el icono SVG de descarga como contenido del botón
                    downloadButton.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-download">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    `;

                    // Añadir el botón al contenedor
                    headerDiv.appendChild(downloadButton);


                    // Añadir la fecha de impresión y el botón al contenedor
                    headerDiv.appendChild(timestampDiv);
                    headerDiv.appendChild(downloadButton);

                    // Añadir el contenedor de la cabecera y la tabla al contenedor principal
                    summaryContainer.appendChild(headerDiv);
                    summaryContainer.appendChild(summaryTable);

                    // Aplicar separadores después de eliminar filas innecesarias
                    summaryTable = applySeparators(summaryTable);

                    // Agregar evento al botón de descarga
                    downloadButton.addEventListener('click', () => {
                        downloadTableAsImage(summaryContainer);
                    });
                })
                .catch(error => {
                    console.error('Error fetching availability:', error);
                });
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
        });
});

function generateSummaryTable(dayHeaders, selectConfig) {
    const table = document.createElement('table');
    table.classList.add('summary-table'); // Añadir la clase específica a la tabla

    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    // Crear la fila de encabezado
    const headerRow = document.createElement('tr');
    const headers = ['Sitio de Trabajo', dayHeaders.monday, dayHeaders.tuesday, dayHeaders.wednesday, dayHeaders.thursday, dayHeaders.friday];
    headers.forEach((headerText, index) => {
        const th = document.createElement('th');
        th.textContent = headerText;
        if (index === 0) {
            th.classList.add('work-site'); // Añadir la clase 'work-site' al primer th
        }
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Recolectar TODOS los workSites únicos de TODOS los días
    const allWorkSites = new Set();
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
        if (selectConfig[day]) {
            selectConfig[day].forEach(config => {
                allWorkSites.add(config.workSite);
            });
        }
    });

    // Convertir a array y ordenar según el orden de instituciones
    const sortedWorkSites = Array.from(allWorkSites).sort((a, b) => {
        const orderA = getInstitutionOrder(a);
        const orderB = getInstitutionOrder(b);

        // Primero ordenar por institución
        if (orderA !== orderB) {
            return orderA - orderB;
        }

        // Si son de la misma institución, ordenar alfabéticamente
        return a.localeCompare(b, 'es');
    });

    // Crear filas para cada workSite único (ordenado)
    sortedWorkSites.forEach(workSite => {
        const row = document.createElement('tr');
        const workSiteCell = document.createElement('td');
        workSiteCell.className = 'work-site';
        workSiteCell.textContent = workSite;
        row.appendChild(workSiteCell);

        // Crear celdas vacías para cada día de la semana
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
            const cell = document.createElement('td');
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    return table;
}


function populateAssignments(assignments, table, availability, selectConfig) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.getElementsByTagName('tr'));

    rows.forEach((row, rowIndex) => {
        const workSiteCell = row.querySelector('.work-site');
        const workSite = workSiteCell.textContent.trim();

        // Iterar sobre cada día de la semana
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day, dayIndex) => {
            const cell = row.getElementsByTagName('td')[dayIndex + 1]; // Saltar la primera celda (work-site)
            const assignment = assignments[day]?.find(a => a.workSite === workSite);

            // Hacer la celda editable
            cell.setAttribute('contenteditable', 'true');

            // Asignar el nombre del usuario y color de fondo
            if (assignment && assignment.user !== 'Select user') {
                cell.textContent = assignment.user;

                // IMPORTANTE: Buscar el usuario correcto considerando usuarios duplicados
                let user = null;
                
                // Primero buscar si hay usuarios duplicados (con originalId)
                const duplicatedUsers = availability[day]?.filter(u => u.originalId === assignment.userId);
                
                if (duplicatedUsers && duplicatedUsers.length > 1) {
                    // Hay usuarios duplicados (mañana y tarde), elegir según el worksite
                    if (workSite.includes('Matutino')) {
                        user = duplicatedUsers.find(u => u.shift === 'Mañana');
                    } else if (workSite.includes('Vespertino') || workSite.includes('Largo')) {
                        user = duplicatedUsers.find(u => u.shift === 'Tarde');
                    }
                } else if (duplicatedUsers && duplicatedUsers.length === 1) {
                    // Solo un usuario duplicado encontrado
                    user = duplicatedUsers[0];
                } else {
                    // No es usuario duplicado, buscar normalmente
                    user = availability[day]?.find(u => u._id === assignment.userId || u.username === assignment.username);
                }

                if (user && user.workSchedule) {
                    // Usar shift si existe (usuario duplicado), sino usar workSchedule normal
                    let scheduleForDay = user.shift ? user.shift : user.workSchedule[day];
                    
                    if (scheduleForDay === 'Mañana') {
                        cell.classList.add('option-morning');
                    } else if (scheduleForDay === 'Tarde') {
                        cell.classList.add('option-afternoon');
                    } else if (scheduleForDay === 'Variable') {
                        cell.classList.add('option-long');
                    }
                } else {
                    console.warn(`No se encontró usuario en availability para ${assignment.user} el ${day}`);
                }
            }

            let initialValue = ''; // Variable para almacenar el valor inicial de la celda

            // Guardar el valor inicial cuando el usuario comienza a editar
            cell.addEventListener('focus', () => {
                initialValue = cell.textContent.trim(); // Guardar el valor inicial antes de cualquier cambio
            });

            // Guardar cambios al perder el foco y cambiar el fondo a rojo si el valor ha cambiado
            cell.addEventListener('blur', () => {
                const newValue = cell.textContent.trim();

                // Solo cambiar el color si el valor ha cambiado
                if (newValue !== initialValue) {
                    cell.style.backgroundColor = 'red';
                }

                // Aquí puedes agregar la lógica para guardar el nuevo valor en el backend si es necesario
                console.log(`Nuevo valor para ${workSite} en ${day}: ${newValue}`);
            });
        });
    });
}


function removeEmptyRows(table) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.getElementsByTagName('tr'));

    rows.forEach(row => {
        const cells = Array.from(row.getElementsByTagName('td')).slice(1); // Excluir la celda work-site
        const hasAssignment = cells.some(cell => cell.textContent.trim() !== '');
        if (!hasAssignment) {
            tbody.removeChild(row);
        }
    });
}

function applySeparators(table) {
    const tbody = table.querySelector('tbody');
    const rows = tbody.getElementsByTagName('tr');

    let previousFirstWord = '';
    let previousSecondWord = '';

    for (let i = 0; i < rows.length; i++) {
        const workSiteCell = rows[i].querySelector('.work-site');
        if (workSiteCell) {
            const workSite = workSiteCell.textContent.trim();
            const [firstWord, secondWord] = workSite.split(' ');

            if (i > 0) {  // Evitar separadores antes de la primera fila
                if (firstWord !== previousFirstWord) {
                    const separatorRow = document.createElement('tr');
                    const separatorCell = document.createElement('td');
                    separatorCell.className = 'separator-thick';
                    separatorCell.colSpan = 6;
                    separatorRow.appendChild(separatorCell);
                    tbody.insertBefore(separatorRow, rows[i]);
                } else if (secondWord !== previousSecondWord) {
                    const separatorRow = document.createElement('tr');
                    const separatorCell = document.createElement('td');
                    separatorCell.className = 'separator-thin';
                    separatorCell.colSpan = 6;
                    separatorRow.appendChild(separatorCell);
                    tbody.insertBefore(separatorRow, rows[i]);
                }
            }

            previousFirstWord = firstWord;
            previousSecondWord = secondWord;
        }
    }

    return table;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let formattedDate = date.toLocaleDateString('es-ES', options);
    formattedDate = formattedDate.replace(/,\s/, ' ');

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${formattedDate} a las ${hours}:${minutes} hs.`;
}

function downloadTableAsImage(container) {
    // Selecciona el botón de descarga y ocúltalo temporalmente
    const downloadButton = container.querySelector('#download-button');
    downloadButton.style.display = 'none';

    // Crear un fragmento de documento
    const fragment = document.createDocumentFragment();

    // Clonar el contenedor y ajustar los estilos
    const containerClone = container.cloneNode(true);
    containerClone.style.width = '1290px'; // 1250px + 20px de padding derecho
    containerClone.style.paddingRight = '20px'; // Mantener el padding derecho
    containerClone.style.display = 'block'; // Evita el recorte
    containerClone.style.overflow = 'visible';
    containerClone.style.boxSizing = 'border-box'; // Asegura que el padding se respete

    // Agregar el clon al fragmento en lugar del DOM visible
    fragment.appendChild(containerClone);

    // Crear un div temporal oculto y agregar el clon
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.opacity = '0'; // Oculto visualmente
    tempDiv.style.pointerEvents = 'none'; // Evita la interacción
    tempDiv.appendChild(fragment);
    document.body.appendChild(tempDiv); // Añadimos el clon temporal al DOM

    // Usar html2canvas en el clon dentro del fragmento
    html2canvas(containerClone, { width: 1290, scrollX: 0, scrollY: 0, scale: 3 }).then(canvas => {
        // Remover el div temporal después de la captura
        document.body.removeChild(tempDiv);

        // Restablecer la visibilidad del botón
        downloadButton.style.display = 'block';

        // Crear un enlace para descargar la imagen
        const link = document.createElement('a');
        link.download = 'programacion-semanal.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

/**
 * Transforma el formato optimizado al formato legacy esperado por el resto del código
 */
function transformOptimizedToLegacy(schedule) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // Generar dayHeaders desde weekStart usando formato corto (Lunes 3)
    const dayHeaders = generateWeekHeaders(schedule.weekStart, false);

    // Paso 1: Identificar workSites con múltiples regímenes usando la utilidad compartida
    const workSiteRegimes = mapWorkSiteRegimes(schedule.assignments);

    // Transformar assignments al formato legacy
    const assignments = {};
    const selectConfigMap = new Map();

    days.forEach(day => {
        assignments[day] = [];

        if (schedule.assignments[day]) {
            schedule.assignments[day].forEach(assignment => {
                const workSiteId = assignment.workSiteId;
                const userId = assignment.userId;
                const regime = assignment.regime;

                // Construir nombre usando la utilidad compartida
                const wsId = workSiteId._id.toString();
                const hasMultipleRegimesForSite = workSiteRegimes.get(wsId)?.size > 1;

                // Nota: hasMultipleSites siempre false aquí porque no tenemos info de cuántos sitios tiene la institución
                // En el futuro se podría pasar desde el backend
                const workSiteName = buildWorkSiteName(
                    workSiteId,
                    workSiteId.institution,
                    regime,
                    true, // Siempre mostrar abreviatura en print view
                    hasMultipleRegimesForSite
                );

                // Agregar assignment en formato legacy
                assignments[day].push({
                    workSite: workSiteName,
                    user: userId.username || userId.firstName || 'Unknown',
                    userId: userId._id,
                    username: userId.username
                });

                // Agregar a selectConfig
                const configKey = `${workSiteName}-${day}`;
                if (!selectConfigMap.has(configKey)) {
                    selectConfigMap.set(configKey, {
                        workSite: workSiteName,
                        day: day,
                        className: getClassNameForRegime(regime)
                    });
                }
            });
        }
    });

    // Construir selectConfig por día
    const selectConfig = {};
    days.forEach(day => {
        selectConfig[day] = [];
        selectConfigMap.forEach((config) => {
            if (config.day === day) {
                selectConfig[day].push({
                    workSite: config.workSite,
                    className: config.className
                });
            }
        });
    });

    return { assignments, dayHeaders, selectConfig };
}

/**
 * Retorna la clase CSS según el régimen
 */
function getClassNameForRegime(regime) {
    if (regime === 'matutino') return 'option-morning';
    if (regime === 'vespertino') return 'option-afternoon';
    if (regime === 'largo') return 'option-long';
    return '';
}
