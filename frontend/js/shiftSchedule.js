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

    // Función para obtener el número de días de un mes y año
    function getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

// Función para poblar los selects basados en las reglas del usuario
function populateShiftSelect(selectElement, user, isSaturday) {
    // Agregar la opción vacía para todos los selects
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '  ';
    selectElement.appendChild(emptyOption);

    // Si el usuario no hace guardias
    if (!user.doesShifts) {
        selectElement.disabled = !isSaturday;  // Deshabilitar los selects excepto los de los sábados

        if (isSaturday) {
            // Solo agregar P1 para los sábados si el usuario no hace guardias
            const option = document.createElement('option');
            option.value = 'P1';
            option.textContent = 'P1';
            selectElement.appendChild(option);
        }
        return;  // Salir de la función si no hace guardias
    }

    // Para usuarios que hacen guardias, poblar como los días normales
    if (isSaturday) {
        // Para los sábados, poblar como los días normales si hace guardias
        populateRegularSites(selectElement, user);
    } else {
        // Poblar los días normales
        populateRegularSites(selectElement, user);
    }
}

// Función auxiliar para poblar los sitios regulares según el perfil del usuario
function populateRegularSites(selectElement, user) {
    if (user.worksInPublicNeuquen) {
        guardSites.publicNeuquen.forEach(site => {
            const option = document.createElement('option');
            option.value = site;
            option.textContent = site;
            selectElement.appendChild(option);
        });
    }

    if (user.worksInPrivateNeuquen) {
        guardSites.privateNeuquen.forEach(site => {
            const option = document.createElement('option');
            option.value = site;
            option.textContent = site;
            selectElement.appendChild(option);
        });
    }

    if (user.worksInPrivateRioNegro) {
        guardSites.privateRioNegro.forEach(site => {
            const option = document.createElement('option');
            option.value = site;
            option.textContent = site;
            selectElement.appendChild(option);
        });
    }

    if (user.worksInPublicRioNegro) {
        guardSites.publicRioNegro.forEach(site => {
            const option = document.createElement('option');
            option.value = site;
            option.textContent = site;
            selectElement.appendChild(option);
        });
    }
}



    // Función para generar la tabla dinámica con usuarios
    function generateTable(users) {
        const year = parseInt(yearSelect.value);
        const month = parseInt(monthSelect.value);

        // Limpiamos el contenido anterior
        daysHeader.innerHTML = '<th>Anestesiólogo</th>';
        usersBody.innerHTML = '';

        // Obtenemos el número de días en el mes seleccionado
        const daysInMonth = getDaysInMonth(year, month);

        // Generamos los encabezados con los días del mes y sus abreviaturas de día de la semana
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day); // Creamos una fecha para cada día
            const dayOfWeek = date.getDay(); // Obtenemos el día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
            const th = document.createElement('th');
            th.textContent = `${dayAbbreviations[dayOfWeek]} ${day}`; // Ejemplo: "1 Lun"
            daysHeader.appendChild(th);
        }

        // Generamos las filas por cada usuario
        users.forEach(user => {
            const row = document.createElement('tr');
            const userCell = document.createElement('td');
            userCell.textContent = user.username;
            row.appendChild(userCell);
        
            for (let day = 1; day <= daysInMonth; day++) {
                const cell = document.createElement('td');
                const select = document.createElement('select');
                select.classList.add('shift-select');
        
                const date = new Date(year, month, day);
                const isSaturday = date.getDay() === 6;
        
                // Formato de la fecha como 'YYYY-MM-DD' para la comparación
                const dayString = date.toISOString().slice(0, 10);
        
                if (user.vacations.some(vacation => vacation.startDate <= dayString && vacation.endDate >= dayString)) {
                    // Si está de vacaciones, añadimos una opción con la letra "V"
                    const vacationOption = document.createElement('option');
                    vacationOption.value = 'V';
                    vacationOption.textContent = 'V';
                    select.appendChild(vacationOption);
        
                    // Desactivar el select
                    select.disabled = true;
                } else {
                    // Solo poblar el select si el usuario no está de vacaciones
                    populateShiftSelect(select, user, isSaturday, date);
                }
        
                cell.appendChild(select);
                row.appendChild(cell);
            }
        
            usersBody.appendChild(row);
        });
        
    }

    // Función para obtener los usuarios desde la API
    function fetchUsers() {
        fetch(`${apiUrl}/auth/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        })
        .then(response => response.json())
        .then(users => {
            // Excluimos el usuario con username "montes_esposito"
            const filteredUsers = users.filter(user => user.username !== 'montes_esposito');

            // Ordenamos los usuarios alfabéticamente por nombre de usuario
            filteredUsers.sort((a, b) => a.username.localeCompare(b.username));
            
            // Generamos la tabla con los usuarios filtrados
            generateTable(filteredUsers);
        })
        .catch(error => {
            console.error('Hubo un problema al obtener la lista de usuarios: ', error.message);
        });
    }

    // Función para obtener los usuarios desde AvailabilityController
    function fetchUsersAvailability() {
        fetch(`${apiUrl}/availability`, {  // Cambia la ruta a /availability
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        })
        .then(response => response.json())
        .then(usersAvailability => {
            // Procesamos la disponibilidad de los usuarios
            const filteredUsers = usersAvailability.filter(user => user.username !== 'montes_esposito');
            filteredUsers.sort((a, b) => a.username.localeCompare(b.username));
            generateTable(filteredUsers);
        })
        .catch(error => {
            console.error('Hubo un problema al obtener la lista de usuarios: ', error.message);
        });
    }

    // Escuchamos los cambios en el año y mes
    yearSelect.addEventListener('change', fetchUsers);
    monthSelect.addEventListener('change', fetchUsers);

    // Obtenemos la tabla de usuarios al cargar la página
    fetchUsers();
});
