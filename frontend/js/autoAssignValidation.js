// validateAssignmentForDay.js

import { fetchAvailability } from './assignUtils.js';
import { countEnabledSelectsByDay } from './autoAssignFunctions.js';

// Mapeo de los nombres de los días en inglés a español
const daysMapping = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes'
};

// Función para obtener los sitios habilitados de los elementos en el DOM
function getSiteCounts() {
    return {
        monday: parseInt(document.getElementById('monday-sites').textContent) || 0,
        tuesday: parseInt(document.getElementById('tuesday-sites').textContent) || 0,
        wednesday: parseInt(document.getElementById('wednesday-sites').textContent) || 0,
        thursday: parseInt(document.getElementById('thursday-sites').textContent) || 0,
        friday: parseInt(document.getElementById('friday-sites').textContent) || 0,
    };
}

export async function validateAssignmentForDay(dayIndex) {
    // Ejecutar y extraer los datos de availabilityCount
    const availabilityData = await fetchAvailability();
    const availabilityCount = {
        monday: availabilityData.monday.length,
        tuesday: availabilityData.tuesday.length,
        wednesday: availabilityData.wednesday.length,
        thursday: availabilityData.thursday.length,
        friday: availabilityData.friday.length
    };
    console.log('Availability count:', availabilityCount);

    // Ejecutar countEnabledSelectsByDay y extraer los datos
    await countEnabledSelectsByDay(); // Asegurarse de que el DOM esté listo
    const siteCounts = getSiteCounts();
    console.log('Site counts:', siteCounts);

    // Verificar las condiciones para el día específico
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const day = days[dayIndex];
    
    if (!day || siteCounts[day] === undefined || availabilityCount[day] === undefined) {
        console.error(`Error: invalid day or counts. Day: ${day}, Sites: ${siteCounts[day]}, Availability: ${availabilityCount[day]}`);
        return false;
    }

    console.log(`Comparing sites and availability for ${day}`);
    console.log(`Sites: ${siteCounts[day]}, Availability: ${availabilityCount[day]}`);

    if (siteCounts[day] > availabilityCount[day]) {
        const dayNameInSpanish = daysMapping[day];
        alert(`El ${dayNameInSpanish} tiene más sitios de trabajo que anestesiólogos disponibles. Por favor, corrija y vuelva a intentar.`);
        return false;
    }

    return true;
}

export async function validateAllDays() {
    // Ejecutar y extraer los datos de availabilityCount
    const availabilityData = await fetchAvailability();
    const availabilityCount = {
        monday: availabilityData.monday.length,
        tuesday: availabilityData.tuesday.length,
        wednesday: availabilityData.wednesday.length,
        thursday: availabilityData.thursday.length,
        friday: availabilityData.friday.length
    };
    console.log('Availability count:', availabilityCount);

    // Ejecutar countEnabledSelectsByDay y extraer los datos
    await countEnabledSelectsByDay(); // Asegurarse de que el DOM esté listo
    const siteCounts = getSiteCounts();
    console.log('Site counts:', siteCounts);

    // Verificar las condiciones para todos los días
    let daysWithIssues = [];

    Object.keys(siteCounts).forEach(day => {
        if (siteCounts[day] > availabilityCount[day.toLowerCase()]) {
            console.log(`Issue found for day: ${day}`);
            daysWithIssues.push(daysMapping[day.toLowerCase()]);
        }
    });

    if (daysWithIssues.length > 0) {
        if (daysWithIssues.length === 1) {
            alert(`El día ${daysWithIssues[0]} tiene más lugares de trabajo que anestesiólogos disponibles. Por favor, corrija y vuelva a intentar.`);
        } else {
            alert(`Los días ${daysWithIssues.join(', ')} tienen más lugares de trabajo que anestesiólogos disponibles. Por favor, corrija y vuelva a intentar.`);
        }
        return false;
    }

    return true;
}