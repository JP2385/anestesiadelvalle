import { generateTable, fetchUsers, assignWeekShifts } from './shiftScheduleUtils.js';

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
    // Llamar a la función cuando se presione el botón
    assignButton.addEventListener('click', assignWeekShifts);

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
    yearSelect.addEventListener('change', () => fetchUsers(apiUrl, generateTable, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader));
    monthSelect.addEventListener('change', () => fetchUsers(apiUrl, generateTable, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader));

    // Obtenemos la tabla de usuarios al cargar la página
    fetchUsers(apiUrl, generateTable, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader);
});
