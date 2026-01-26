// shiftReferencesTable.js
import { shiftAssignmentLabels } from './shiftLabels.js';

export function generateShiftReferencesTable() {
    const table = document.getElementById('shift-references');
    if (!table) {
        console.warn("El elemento con ID 'shift-references' no se encontró en el DOM.");
        return;
    }

    table.innerHTML = ''; // Limpia la tabla antes de generarla

    // Crear el encabezado de la tabla
    const headerRow = document.createElement('tr');
    const codeHeader = document.createElement('th');
    codeHeader.textContent = 'Sigla';
    headerRow.appendChild(codeHeader);

    const labelHeader = document.createElement('th');
    labelHeader.textContent = 'Descripción';
    headerRow.appendChild(labelHeader);
    table.appendChild(headerRow);

    // Generar las filas a partir de shiftAssignmentLabels
    Object.entries(shiftAssignmentLabels).forEach(([code, label]) => {
        const row = document.createElement('tr');

        // Columna del código
        const codeCell = document.createElement('td');
        codeCell.textContent = code;
        row.appendChild(codeCell);

        // Columna de la descripción
        const labelCell = document.createElement('td');
        labelCell.textContent = label;
        row.appendChild(labelCell);

        table.appendChild(row);
    });
}
