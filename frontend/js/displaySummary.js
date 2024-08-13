document.addEventListener('DOMContentLoaded', () => {
    const summaryContainer = document.getElementById('summary-container');
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    // Hacer una solicitud al backend para obtener el último schedule
    fetch(`${apiUrl}/schedule/last-schedule`)
        .then(response => response.json())
        .then(data => {
            const assignments = data.assignments;
            const dayHeaders = data.dayHeaders;
            const timestamp = data.timestamp;
            const selectConfig = data.selectConfig; // Obtener selectConfig

            // Limpiar los encabezados de cualquier símbolo de actualización
            const cleanedDayHeaders = {
                monday: dayHeaders.monday.replace(/🔄/g, ''),
                tuesday: dayHeaders.tuesday.replace(/🔄/g, ''),
                wednesday: dayHeaders.wednesday.replace(/🔄/g, ''),
                thursday: dayHeaders.thursday.replace(/🔄/g, ''),
                friday: dayHeaders.friday.replace(/🔄/g, '')
            };

            // Generar la tabla de resumen basada en selectConfig
            let summaryTable = generateSummaryTable(cleanedDayHeaders, selectConfig.monday);

            // Poblar la tabla con los assignments
            populateAssignments(assignments, summaryTable);

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
            timestampElement.textContent = `Programación generada el ${formattedTimestamp}`;
            timestampElement.className = 'timestamp';

            // Añadir el elemento de fecha al div de la fecha
            timestampDiv.appendChild(timestampElement);

            // Crear el botón de descarga
            const downloadButton = document.createElement('button');
            downloadButton.id = 'download-button';
            downloadButton.textContent = 'Descargar como imagen'; // Texto del botón de descarga
            downloadButton.className = 'download-button';

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
            console.error('Error fetching schedule:', error);
        });
});

function generateSummaryTable(dayHeaders, selectConfig) {
    const table = document.createElement('table');
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

    selectConfig.forEach(config => {
        const workSite = config.workSite;
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

function populateAssignments(assignments, table) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.getElementsByTagName('tr'));

    rows.forEach(row => {
        const workSiteCell = row.querySelector('.work-site');
        const workSite = workSiteCell.textContent.trim();

        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day, index) => {
            const cell = row.getElementsByTagName('td')[index + 1]; // Saltar la primera celda (work-site)
            const assignment = assignments[day]?.find(a => a.workSite === workSite);
            if (assignment && assignment.user !== 'Select user') {
                cell.textContent = assignment.user;
                cell.style.backgroundColor = 'rgb(248, 240, 184)';
            }
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

                    // Insertar separador thick cuando cambia la primera palabra
                    console.log(`Comparando: ${firstWord} con ${previousFirstWord}`);
                    console.log('Insertando separador thick');
                    const separatorRow = document.createElement('tr');
                    const separatorCell = document.createElement('td');
                    separatorCell.className = 'separator-thick';
                    separatorCell.colSpan = 6;
                    separatorRow.appendChild(separatorCell);
                    tbody.insertBefore(separatorRow, rows[i]);
                } else if (secondWord !== previousSecondWord) {
                    // Insertar separador thin cuando cambia solo la segunda palabra
                    console.log(`Comparando: ${firstWord} con ${previousFirstWord}`);
                    console.log('Insertando separador thin');
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

// Función para formatear la fecha y hora
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let formattedDate = date.toLocaleDateString('es-ES', options);
    
    // Eliminar la coma después del día de la semana
    formattedDate = formattedDate.replace(/,\s/, ' ');

    // Formato 24 horas
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${formattedDate} a las ${hours}:${minutes} hs.`;
}

function downloadTableAsImage(container) {
    html2canvas(container).then(canvas => {
        const link = document.createElement('a');
        link.download = 'programacion-semanal.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}
