import { updateSelectColors } from './updateSelectColors.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - Inicio');
    
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    // Hacer una solicitud al backend para obtener el último schedule
    console.log('Fetching last schedule...');
    fetch(`${apiUrl}/schedule/last-schedule`)
        .then(response => {
            console.log('Response recibida');
            return response.json();
        })
        .then(schedule => {
            console.log('Schedule obtenido:', schedule);
            const assignments = schedule.assignments;
            const selectConfig = schedule.selectConfig;
            const longDaysInform = schedule.longDaysInform;
            const scheduleBody = document.getElementById('schedule-body');
            const rows = scheduleBody.getElementsByTagName('tr');

            const longDaysSpan = document.getElementById('long-days-inform');
            if (longDaysSpan && longDaysInform) {
                console.log('Actualizando longDaysInform');
                
                // Dividir el contenido de longDaysInform por los guiones " - "
                const items = longDaysInform.split('.').map(item => item.trim()).filter(item => item.length > 0);

                // Crear el elemento ul
                const ul = document.createElement('ul');

                // Crear los elementos li y agregarlos a la ul
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item.trim(); // Añadir el texto de cada ítem
                    ul.appendChild(li);
                });

                // Limpiar el contenido previo del span y añadir la nueva ul
                longDaysSpan.innerHTML = ''; // Limpiar el contenido previo
                longDaysSpan.appendChild(ul); // Insertar la lista
            }

            for (let row of rows) {
                const workSiteElement = row.querySelector('.work-site');
                if (workSiteElement) {
                    const workSite = workSiteElement.textContent.trim();
                    console.log(`Procesando workSite: ${workSite}`);
                    
                    const selects = row.querySelectorAll('select');

                    selects.forEach((select, index) => {
                        const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index];
                        const assignment = assignments[day]?.find(a => a.workSite === workSite);
                        const config = selectConfig[day]?.find(c => c.workSite === workSite);

                        if (assignment && assignment.user !== 'Select user') {
                            console.log(`Asignando usuario ${assignment.user} para el día ${day} en ${workSite}`);
                            
                            // Crear y seleccionar la opción correcta en el select
                            const option = document.createElement('option');
                            option.value = assignment.userId; // Asigna el ID del usuario
                            option.textContent = assignment.user;
                            option.setAttribute('data-username', assignment.username); // Asigna el username como data-attribute
                            option.selected = true;
                            select.appendChild(option);
                        }

                        if (config) {
                            console.log(`Aplicando configuración para ${workSite} en ${day}`);
                            select.disabled = config.disabled; // Aplicar configuración de enabled/disabled
                        }
                    });

                    // Llamar a updateSelectColors para cada día de la semana
                    console.log('Actualizando colores de selectores');
                    for (let i = 0; i < 5; i++) {
                        console.log(`Actualizando colores para el día ${['lunes', 'martes', 'miércoles', 'jueves', 'viernes'][i]}`);
                        updateSelectColors(i, assignments); // Asegúrate de que `assignments` está disponible
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
        });
});
