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

            // Hacer una solicitud para obtener la disponibilidad
            fetch(`${apiUrl}/availability`)
                .then(response => response.json())
                .then(availability => {
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

                    // Poblar la tabla con los assignments y availability
                    populateAssignments(assignments, summaryTable, availability);

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
                    console.error('Error fetching availability:', error);
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

function populateAssignments(assignments, table, availability) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.getElementsByTagName('tr'));

    rows.forEach(row => {
        const workSiteCell = row.querySelector('.work-site');
        const workSite = workSiteCell.textContent.trim();

        // Iterar sobre cada día de la semana
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day, index) => {
            const cell = row.getElementsByTagName('td')[index + 1]; // Saltar la primera celda (work-site)
            const assignment = assignments[day]?.find(a => a.workSite === workSite);

            // Hacer la celda editable
            cell.setAttribute('contenteditable', 'true');

            // Asignar el nombre del usuario y color de fondo
            if (assignment && assignment.user !== 'Select user') {
                cell.textContent = assignment.user;

                // Obtener el usuario en la disponibilidad para aplicar la clase CSS correspondiente
                const user = availability[day]?.find(u => u._id === assignment.user || u.username === assignment.user);

                if (user) {
                    // Asignar la clase CSS correspondiente al horario de trabajo
                    if (user.workSchedule[day] === 'Mañana') {
                        cell.classList.add('option-morning');
                    } else if (user.workSchedule[day] === 'Tarde') {
                        cell.classList.add('option-afternoon');
                    } else if (user.workSchedule[day] === 'Variable') {
                        cell.classList.add('option-long');
                    }
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
    html2canvas(container).then(canvas => {
        const link = document.createElement('a');
        link.download = 'programacion-semanal.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}
