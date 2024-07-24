import { fetchAvailability } from './assignUtils.js';
import { countAssignmentsByDay } from './autoAssignFunctions.js';

export async function compareAvailabilities() {
    try {
        const serverAvailability = await fetchAvailability();
        const { contents: clientAvailability } = await countAssignmentsByDay();

         // Log arrays to console
         console.log('Server Availability:', serverAvailability);
         console.log('Client Availability:', clientAvailability);

        const differences = compareUserAvailability(serverAvailability, clientAvailability);

        // Actualizar el DOM con las diferencias encontradas
        updateDOMWithDifferences(differences);
    } catch (error) {
        console.error('Error comparing availabilities:', error);
    }
}

function compareUserAvailability(serverData, clientData) {
    const differences = {};

    // Iterar sobre cada día de la semana en serverData
    for (const day in serverData) {
        if (serverData.hasOwnProperty(day) && clientData.hasOwnProperty(day)) {
            const serverArray = serverData[day];
            const clientArray = clientData[day];

            // Encontrar usuarios que están en serverArray pero no en clientArray
            const onlyInServer = serverArray.filter(user => !clientArray.includes(user));

            // Encontrar usuarios que están en clientArray pero no en serverArray
            const onlyInClient = clientArray.filter(user => !serverArray.includes(user));

            differences[day] = {
                onlyInServer,
                onlyInClient
            };
        }
    }

    return differences;
}

function updateDOMWithDifferences(differences) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    days.forEach(day => {
        const element = document.getElementById(`${day}-compare`);
        const { onlyInServer, onlyInClient } = differences[day];

        // Crear el contenido HTML para mostrar las diferencias
        let htmlContent = '';

        if (onlyInServer.length > 0) {
            htmlContent += `${onlyInServer.join(', ')}<br>`;
        }

        // Si no hay diferencias, agregar un mensaje indicando que no hay diferencias
        if (onlyInServer.length === 0 && onlyInClient.length === 0) {
            htmlContent += 'Todos los anestesiólogos fueron asignados.<br>';
        }

        // Actualizar el contenido del elemento del DOM
        element.innerHTML = htmlContent;
    });
}

