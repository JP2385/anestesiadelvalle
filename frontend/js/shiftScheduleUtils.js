// Función auxiliar para obtener el número de días de un mes y año
export function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

export function generateTable(users, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader) {
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
            const dayOfWeek = date.toLocaleString('es-ES', { weekday: 'short' }); // Obtenemos el día de la semana abreviado
            const isSaturday = date.getDay() === 6;

            // Poblar el select con las opciones regulares o especiales (como P1 para sábados)
            populateShiftSelect(select, user, isSaturday, guardSites, dayOfWeek, user.username);

            // Ahora aplicamos la lógica de vacaciones
            const dayString = date.toISOString().slice(0, 10); // Convertir fecha a 'YYYY-MM-DD' para la comparación
            if (user.vacations.some(vacation => vacation.startDate <= dayString && vacation.endDate >= dayString)) {
                // Si está de vacaciones, deshabilitar el select y añadir la opción con "V"
                select.innerHTML = ''; // Limpiar el select antes de agregar la opción de vacaciones
                const vacationOption = document.createElement('option');
                vacationOption.value = 'V';
                vacationOption.textContent = 'V';
                select.appendChild(vacationOption);

                select.disabled = true;
            }

            cell.appendChild(select);
            row.appendChild(cell);
        }

        usersBody.appendChild(row);
    });

    // Después de generar la tabla, aplicar las asignaciones por defecto
    applyDefaultAssignments(usersBody, daysHeader);
}

// Función para obtener los usuarios desde la API
export function fetchUsers(apiUrl, generateTable, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader) {
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
        generateTable(filteredUsers, yearSelect, monthSelect, dayAbbreviations, guardSites, usersBody, daysHeader);

        // Agregamos el atributo data-cardio a cada fila
        const rows = document.querySelectorAll('#users-body tr');
        rows.forEach((row, index) => {
            const user = filteredUsers[index];
            row.setAttribute('data-cardio', user.doesCardio);
        });
    })
    .catch(error => {
        console.error('Hubo un problema al obtener la lista de usuarios: ', error.message);
    });
}


// Función para asignar automáticamente las guardias de lunes a jueves con lógica de Cardio
export function assignWeekShiftsWithCardio(users) {
    const headers = document.querySelectorAll('#days-header th'); // Seleccionamos todos los headers
    const daysOfWeek = ['Lun', 'Mar', 'Mie', 'Jue']; // Días de lunes a jueves

    // Recorremos cada día de la semana
    daysOfWeek.forEach(day => {
        const headerIndices = [];
        headers.forEach((header, index) => {
            if (header.textContent.includes(day)) {
                headerIndices.push(index);  // Guardamos el índice del header
            }
        });

        if (headerIndices.length === 0) {
            return;
        }

        // Procesamos cada columna que corresponde al día actual
        headerIndices.forEach(headerIndex => {
            const rows = document.querySelectorAll('#users-body tr'); // Seleccionamos todas las filas de la tabla de usuarios
            let assignedImUser = null;  // Guardamos el usuario asignado para 'Im'
            let assignedFnUser = null;  // Guardamos el usuario asignado para 'Fn'

            // Paso 1: Verificar si hay alguien asignado a Im
            for (const row of rows) {
                const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                if (selects.length > headerIndex - 1) {
                    const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna

                    if (select && !select.disabled && select.value === 'Im') {
                        assignedImUser = row;  // Si hay un usuario con Im asignado, guardamos el usuario
                        break;  // Salimos del bucle, ya hay un asignado
                    }
                }
            }

            // Paso 2: Verificar si hay alguien asignado a Fn
            for (const row of rows) {
                const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                if (selects.length > headerIndex - 1) {
                    const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna

                    if (select && !select.disabled && select.value === 'Fn') {
                        assignedFnUser = row;  // Si hay un usuario con Fn asignado, guardamos el usuario
                        break;  // Salimos del bucle, ya hay un asignado
                    }
                }
            }

            // Paso 3: Asignar a Im si no está asignado
            if (!assignedImUser) {
                // Verificar si hay asignación previa a Fn
                if (assignedFnUser) {
                    const isFnUserCardio = assignedFnUser.dataset.cardio === 'true'; // Verificamos si el usuario asignado a Fn hace Cardio

                    if (isFnUserCardio) {
                        // Asignar Im a un usuario disponible sin importar si hace Cardio
                        for (const row of rows) {
                            const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                            if (selects.length > headerIndex - 1) {
                                const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna
                                const imOption = Array.from(select.options).find(option => option.value === 'Im');

                                if (select && !select.disabled && select.value === '' && imOption) {
                                    select.value = 'Im';  // Asignar guardia de Im
                                    assignedImUser = row; // Guardar usuario asignado
                                    break;  // Salimos del bucle, ya hemos asignado
                                }
                            }
                        }
                    } else {
                        // Si el usuario asignado a Fn no hace Cardio, asignar Im a un usuario que sí lo haga
                        for (const row of rows) {
                            const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                            if (selects.length > headerIndex - 1) {
                                const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna
                                const isCardioUser = row.dataset.cardio === 'true'; // Verificar si el usuario hace Cardio


                                if (select && !select.disabled && select.value === '' && isCardioUser) {
                                    select.value = 'Im'; // Asignar guardia de Im
                                    assignedImUser = row; // Guardar usuario asignado
                                    break; // Salimos del bucle, ya hemos asignado
                                }
                            }
                        }
                    }
                } else {
                    // Si no hay usuario asignado a Fn, simplemente asignar Im
                    for (const row of rows) {
                        const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                        if (selects.length > headerIndex - 1) {
                            const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna
                            const imOption = Array.from(select.options).find(option => option.value === 'Im');

                            if (select && !select.disabled && select.value === '' && imOption) {
                                select.value = 'Im';  // Asignar guardia de Im
                                assignedImUser = row; // Guardar usuario asignado
                                break;  // Salimos del bucle, ya hemos asignado
                            }
                        }
                    }
                }
            }

            // Paso 4: Asignar a Fn si no está asignado
            if (!assignedFnUser) {
                // Asignación a Fn
                if (assignedImUser) {
                    const isImUserCardio = assignedImUser.dataset.cardio === 'true'; // Verificamos si el usuario asignado a Im hace Cardio

                    if (isImUserCardio) {
                        // Si el usuario asignado a Im hace Cardio, asignar Fn a un usuario disponible sin importar si hace Cardio
                        for (const row of rows) {
                            const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                            if (selects.length > headerIndex - 1) {
                                const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna
                                const fnOption = Array.from(select.options).find(option => option.value === 'Fn');

                                if (select && !select.disabled && select.value === '' && fnOption) {
                                    select.value = 'Fn'; // Asignar guardia de Fn
                                    assignedFnUser = row; // Guardar usuario asignado
                                    break; // Salimos del bucle, ya hemos asignado
                                }
                            }
                        }
                    } else {
                        // Si el usuario asignado a Im no hace Cardio, asignar Fn a un usuario que sí lo haga
                        for (const row of rows) {
                            const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                            if (selects.length > headerIndex - 1) {
                                const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna
                                const isCardioUser = row.dataset.cardio === 'true'; // Verificar si el usuario hace Cardio
                                const fnOption = Array.from(select.options).find(option => option.value === 'Fn');

                                if (select && !select.disabled && select.value === '' && fnOption && isCardioUser) {
                                    select.value = 'Fn'; // Asignar guardia de Fn
                                    assignedFnUser = row; // Guardar usuario asignado
                                    break; // Salimos del bucle, ya hemos asignado
                                }
                            }
                        }
                    }
                }
            }
        });
    });
}





// Función para poblar los selects basados en las reglas del usuario
function populateShiftSelect(selectElement, user, isSaturday, guardSites, dayOfWeek, username) {
    // Deshabilitar select si se cumplen las condiciones basadas en username y día
    if (shouldDisableSelect(username, dayOfWeek)) {
        selectElement.disabled = true;
        return;
    }

    // Agregar la opción vacía para todos los selects
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '';
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
    populateRegularSites(selectElement, user, guardSites);
}


// Función auxiliar para poblar los sitios regulares según el perfil del usuario
function populateRegularSites(selectElement, user, guardSites) {
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

function shouldDisableSelect(username, dayOfWeek) {
    // Convertir dayOfWeek a minúsculas para asegurar que las comparaciones sean consistentes
    const day = dayOfWeek.toLowerCase();

    // Reglas para deshabilitar días específicos según el usuario
    const disableRules = {
        mschvartzman: ['lun'],
        mmelo: ['lun', 'mar', 'jue'],
        ltotis: ['lun', 'jue'],
        ngrande: ['lun', 'mar'],
        nvela: ['jue'],
        msalvarezza: ['jue'],
    };

    if (disableRules[username] && disableRules[username].includes(day)) {
        return true;
    }

    return false;
}

function applyDefaultAssignments(usersBody, daysHeader) {
    const defaultAssignments = {
        'lburgueño': { day: 'Mar', value: 'Al' },
        'sdegreef': { day: 'Mie', value: 'Ce' },
        'lalvarez': { day: 'Lun', value: 'Cp' }
    };

    // Recorrer cada fila (usuario) de la tabla
    usersBody.querySelectorAll('tr').forEach(row => {
        const username = row.querySelector('td').textContent.trim(); // Obtener el nombre de usuario de la primera celda

        if (defaultAssignments[username]) {
            const assignment = defaultAssignments[username];
            
            // Recorrer todos los headers para encontrar cada día que coincida con el asignado
            Array.from(daysHeader.querySelectorAll('th')).forEach((th, dayIndex) => {
                if (th.textContent.includes(assignment.day)) {
                    const select = row.querySelectorAll('td select')[dayIndex - 1]; // El índice de la columna corresponde a los días (desplazado por el th inicial)
                    
                    // Verificar si el select está habilitado y tiene la opción
                    if (!select.disabled && Array.from(select.options).some(option => option.value === assignment.value)) {
                        select.value = assignment.value; // Asignar el valor por defecto
                    }
                }
            });
        }
    });
}




