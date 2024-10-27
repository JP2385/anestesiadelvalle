import { generateTable, fetchUsers, assignWeekShiftsWithCardio } from './shiftScheduleUtils.js';

document.addEventListener('DOMContentLoaded', function () {
    // URL de la API
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    // Inicializamos el año y el mes actuales
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // Retorna de 0 a 11 (0 = Enero, 11 = Diciembre)
    
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const daysHeader = document.getElementById('days-header');
    const usersBody = document.getElementById('users-body');

    // Mapeo de los días de la semana
    const dayAbbreviations = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

    // Sitios de guardia
    const guardSites = {
        publicNeuquen: ['HH', 'Ce', 'CM'],
        privateNeuquen: ['Im'],
        privateRioNegro: ['Fn'],
        publicRioNegro: ['Cp', 'Al', 'Jb'],
        saturday: ['P1']  // Para los días sábado
    };

    const assignButton = document.getElementById('assign-week-shifts');

    // Función para procesar y generar la tabla
    function processAndGenerateTable(users) {
        // Excluimos el usuario con username "montes_esposito"
        const filteredUsers = users.filter(user => user.username !== 'montes_esposito');

        // Ordenamos los usuarios alfabéticamente por nombre de usuario
        filteredUsers.sort((a, b) => a.username.localeCompare(b.username));

        // Generamos la tabla con los usuarios filtrados
        generateTable(filteredUsers, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader);
    }

    // Llamar a la función cuando se presione el botón
    assignButton.addEventListener('click', () => {
        console.log('Botón de asignar presionado');
        fetchUsers(apiUrl, (users) => {
            processAndGenerateTable(users); // Genera la tabla con los datos procesados
            console.log('Usuarios filtrados:', users);
            assignWeekShiftsWithCardio(users); // Llama a la función de asignación de guardias
        });
    });

    // Poblamos el selector de años (desde 2020 hasta 2030 por ejemplo)
    for (let year = 2020; year <= 2030; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true; // Año actual seleccionado por defecto
        yearSelect.appendChild(option);
    }

    // Seleccionamos el mes actual en el select
    monthSelect.value = currentMonth; // Seleccionamos el mes actual por defecto

    // Escuchamos los cambios en el año y mes
    yearSelect.addEventListener('change', () => fetchUsers(apiUrl, processAndGenerateTable));
    monthSelect.addEventListener('change', () => fetchUsers(apiUrl, processAndGenerateTable));

    // Obtenemos la tabla de usuarios al cargar la página
    fetchUsers(apiUrl, processAndGenerateTable);
});
