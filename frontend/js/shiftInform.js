import { shiftAssignmentLabels } from './shiftLabels.js';
import { userRealNames } from './userLabels.js'; // Importar nombres reales
import { downloadTableAsImage } from './shiftInformDownloadImage.js';

let userPhoneNumbers = {};

document.addEventListener('DOMContentLoaded', async () => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adelvalle-88dd0d34d7bd.herokuapp.com/';
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const siteSelect = document.getElementById('site-select');
    const scheduleTable = document.getElementById('schedule-table');
    const titleElement = document.getElementById('dynamic-title');

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Array de nombres de meses reutilizable
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Obtener los parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const yearParam = urlParams.get('year');
    const monthParam = urlParams.get('month');
    const siteParam = urlParams.get('site') || 'all';

    // Fetch de usuarios para obtener números de teléfono
    try {
        const response = await fetch(`${apiUrl}/public/public-users`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const users = await response.json();
        users.forEach(user => {
            userPhoneNumbers[user.username] = user.phoneNumber || 'No phone';
        });
        console.log("Public user data loaded:", userPhoneNumbers);
    } catch (error) {
        console.error('Error al obtener datos públicos de usuarios:', error);
    }

    // Llenar el select del año
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // Llenar el select del mes
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    // Agregar opciones de sitios al selector de sitios de guardia
    Object.entries(shiftAssignmentLabels).forEach(([key, value]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value;
        siteSelect.appendChild(option);
    });
    
    // Extraer el año y el mes del parámetro `month` si está en el formato `YYYY-MM`
    const [extractedYear, extractedMonth] = monthParam && monthParam.includes('-') 
        ? monthParam.split('-') 
        : [yearParam, monthParam];

    // Ajustar el valor de `yearSelect` y `monthSelect` usando el mes extraído
    yearSelect.value = extractedYear || currentYear;
    monthSelect.value = extractedMonth ? (parseInt(extractedMonth, 10) - 1).toString() : currentMonth.toString();
    siteSelect.value = siteParam;

    // Llama a fetchAndDisplaySchedule para cargar el cronograma en función del año, mes y sitio seleccionados
    fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);

    // Función para actualizar el título dinámico
    function updateTitle() {
        const selectedYear = yearSelect.value;
        const selectedMonth = months[parseInt(monthSelect.value)];
        const selectedSite = siteSelect.options[siteSelect.selectedIndex].text;
    
        titleElement.textContent = `Guardias de Anestesia de ${selectedSite} del mes de ${selectedMonth} de ${selectedYear}`;
    }

    // Agrega eventos para actualizar el título cuando se cambian los valores
    yearSelect.addEventListener('change', () => {
        updateTitle();
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });
    monthSelect.addEventListener('change', () => {
        updateTitle();
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });
    siteSelect.addEventListener('change', () => {
        updateTitle();
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });

    // Inicializar el título al cargar la página
    updateTitle();

    function fetchAndDisplaySchedule(year, month, site) {
        const formattedMonth = `${year}-${String(Number(month) + 1).padStart(2, '0')}`;
        console.log(`Fetching schedule for ${formattedMonth} and site ${site}`);  

        // Actualizar la URL con los nuevos parámetros
        const newUrl = `${window.location.pathname}?year=${year}&month=${Number(month) + 1}&site=${site}`;
        window.history.replaceState(null, '', newUrl);

        // Obtener las asignaciones de la base de datos
        fetch(`${apiUrl}/shift-schedule/${formattedMonth}`)
            .then(response => response.json())
            .then(schedule => {
                const shiftSchedule = schedule.shiftSchedule || [];
                generateCalendar(year, month, site, shiftSchedule);
            })
            .catch(error => {
                console.error('Hubo un problema al obtener el cronograma de guardias:', error);
            });
    }

    function generateCalendar(year, month, site, shiftSchedule) {
        scheduleTable.innerHTML = ''; // Limpiar tabla
        const startDate = new Date(year, month, 1);
        const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();
        const firstDayOfWeek = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;
        
        const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        let currentRow, currentContentRow;
        let dayCount = 1;
    
        // Generar las filas semana a semana hasta completar el mes
        while (dayCount <= daysInMonth) {
            currentRow = scheduleTable.insertRow();
            currentRow.classList.add('date-row');
    
            currentContentRow = scheduleTable.insertRow();
            currentContentRow.classList.add('content-row');
    
            for (let i = 0; i < 7; i++) {
                const headerCell = currentRow.insertCell();
                const contentCell = currentContentRow.insertCell();
                
                if (dayCount > daysInMonth || (dayCount === 1 && i < firstDayOfWeek)) {
                    headerCell.classList.add('empty-cell');
                    contentCell.classList.add('empty-cell');
                } else {
                    const date = `${year}-${String(Number(month) + 1).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`;
    
                    headerCell.textContent = `${daysOfWeek[i]} ${dayCount}`;
                    headerCell.classList.add('date-header');
    
                    const assignmentsForDay = shiftSchedule
                        .flatMap(user => 
                            user.shifts
                                .filter(shift => 
                                    shift.day === date && 
                                    (site === 'all' && shift.assignment !== 'V' || shift.assignment === site)
                                )
                                .map(shift => ({
                                    username: user.username,
                                    assignment: shiftAssignmentLabels[shift.assignment] || shift.assignment
                                }))
                        );
    
                    const assignmentsDiv = document.createElement('div');
                    assignmentsDiv.classList.add('assignments');
                    assignmentsForDay.forEach(assignment => {
                        const assignmentText = document.createElement('p');
                        const phoneNumber = userPhoneNumbers[assignment.username] || 'No phone';
                        const realName = userRealNames[assignment.username] || assignment.username;
                        
                        assignmentText.textContent = site === 'all'
                            ? `${realName} Tel: ${phoneNumber} - ${assignment.assignment}`
                            : `${realName} Tel: ${phoneNumber}`;
                        
                        assignmentsDiv.appendChild(assignmentText);
                    });
                    contentCell.appendChild(assignmentsDiv);
    
                    dayCount++;
                }
            }
        }
    }


    yearSelect.addEventListener('change', () => {
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });
    monthSelect.addEventListener('change', () => {
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });
    siteSelect.addEventListener('change', () => {
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    }); 

    function generateCalendar(year, month, site, shiftSchedule) {
        scheduleTable.innerHTML = ''; // Limpiar tabla
        const startDate = new Date(year, month, 1);
        const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();
        const firstDayOfWeek = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;
        
        const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        let currentRow, currentContentRow;
        let dayCount = 1;
    
        // Generar las filas semana a semana hasta completar el mes
        while (dayCount <= daysInMonth) {
            // Fila de encabezados de fechas
            currentRow = scheduleTable.insertRow();
            currentRow.classList.add('date-row'); // Clase para estilos de fecha
    
            // Fila de contenido de asignaciones
            currentContentRow = scheduleTable.insertRow();
            currentContentRow.classList.add('content-row'); // Clase para estilos de contenido
    
            // Insertar celdas para cada día de la semana
            for (let i = 0; i < 7; i++) {
                const headerCell = currentRow.insertCell();
                const contentCell = currentContentRow.insertCell();
                
                // Verificar si es un día válido del mes
                if (dayCount > daysInMonth || (dayCount === 1 && i < firstDayOfWeek)) {
                    headerCell.classList.add('empty-cell'); // Clase para días vacíos
                    contentCell.classList.add('empty-cell'); // Clase para celdas vacías
                } else {
                    const date = `${year}-${String(Number(month) + 1).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`;
    
                    // Configurar encabezado de fecha
                    headerCell.textContent = `${daysOfWeek[i]} ${dayCount}`;
                    headerCell.classList.add('date-header');
    
                    // Asignaciones para el día actual
                    const assignmentsForDay = shiftSchedule
                        .flatMap(user => 
                            user.shifts
                                .filter(shift => 
                                    shift.day === date && 
                                    (site === 'all' 
                                        ? shift.assignment !== 'V' && shift.assignment !== 'ND' 
                                        : shift.assignment === site)
                                )
                                .map(shift => ({
                                    username: user.username,
                                    assignment: shiftAssignmentLabels[shift.assignment] || shift.assignment
                                }))
                        );
    
                    // Mostrar asignaciones en la celda de contenido
                    const assignmentsDiv = document.createElement('div');
                    assignmentsDiv.classList.add('assignments');
                    assignmentsForDay.forEach(assignment => {
                        const assignmentText = document.createElement('p');
                        const phoneNumber = userPhoneNumbers[assignment.username] || 'No phone';
                        const realName = userRealNames[assignment.username] || assignment.username;
                        
                        assignmentText.textContent = site === 'all'
                            ? `${realName} Tel: ${phoneNumber} - ${assignment.assignment}`
                            : `${realName} Tel: ${phoneNumber}`;
                        
                        assignmentsDiv.appendChild(assignmentText);
                    });
                    contentCell.appendChild(assignmentsDiv);
    
                    dayCount++; // Incrementar el contador de días solo si se insertó un día válido
                }
            }
        }
    }

    // Escuchar cambios en los selects
    yearSelect.addEventListener('change', () => {
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });
    monthSelect.addEventListener('change', () => {
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });
    siteSelect.addEventListener('change', () => {
        fetchAndDisplaySchedule(yearSelect.value, monthSelect.value, siteSelect.value);
    });
    // Agregar evento de clic al botón de descarga para iniciar la captura
    document.getElementById('download-button').addEventListener('click', downloadTableAsImage);
});
