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

            // Limpiar los encabezados de cualquier símbolo de actualización
            const cleanedDayHeaders = {
                monday: dayHeaders.monday.replace(/🔄/g, ''),
                tuesday: dayHeaders.tuesday.replace(/🔄/g, ''),
                wednesday: dayHeaders.wednesday.replace(/🔄/g, ''),
                thursday: dayHeaders.thursday.replace(/🔄/g, ''),
                friday: dayHeaders.friday.replace(/🔄/g, '')
            };

            // Generar la tabla de resumen
            let summaryTable = generateSummaryTable(assignments, cleanedDayHeaders);

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

function generateSummaryTable(assignments, dayHeaders) {
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

    // Crear las filas del cuerpo de la tabla basadas en las asignaciones
    const workSites = [...new Set(Object.values(assignments).flat().map(a => a.workSite))];

    workSites.forEach(workSite => {
        // Verificar si hay asignaciones para este sitio de trabajo en cualquier día de la semana
        const hasAssignments = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].some(day => 
            assignments[day]?.some(a => a.workSite === workSite && a.user !== 'Select user')
        );

        if (hasAssignments) {
            const row = document.createElement('tr');
            const workSiteCell = document.createElement('td');
            workSiteCell.className = 'work-site';  // Añadir la clase 'work-site'
            workSiteCell.textContent = workSite;
            row.appendChild(workSiteCell);

            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                const cell = document.createElement('td');
                const assignment = assignments[day]?.find(a => a.workSite === workSite);
                if (assignment && assignment.user !== 'Select user') {
                    cell.textContent = assignment.user;
                    cell.style.backgroundColor = 'rgb(248, 240, 184)';
                } else {
                    cell.textContent = '';
                }
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        }
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    return table;
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
                    const separatorRow = document.createElement('tr');
                    const separatorCell = document.createElement('td');
                    separatorCell.className = 'separator-thick';
                    separatorCell.colSpan = 6;
                    separatorRow.appendChild(separatorCell);
                    tbody.insertBefore(separatorRow, rows[i]);
                } else if (secondWord !== previousSecondWord) {
                    // Insertar separador thin cuando cambia solo la segunda palabra
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
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${dayName} ${day} de ${month} de ${year} a las ${hours}:${minutes} hs.`;
}

function downloadTableAsImage(container) {
    html2canvas(container).then(canvas => {
        const link = document.createElement('a');
        link.download = 'programacion-semanal.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}
