import { assignFn, assignIm } from './shiftAssignmentsWeekdays.js';


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

    // Realizar el recuento de guardias asignadas después de aplicar las asignaciones por defecto
    const shiftCounts = countWeekdayShifts();
    console.log('Conteo de guardias asignadas:', shiftCounts);
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
// export function assignWeekShiftsWithCardio(users) {
//     const headers = document.querySelectorAll('#days-header th'); // Seleccionamos todos los headers
//     const daysOfWeek = ['Lun', 'Mar', 'Mie', 'Jue']; // Días de lunes a jueves

//     // Recorremos cada día de la semana
//     daysOfWeek.forEach(day => {
//         const headerIndices = [];
//         headers.forEach((header, index) => {
//             if (header.textContent.includes(day)) {
//                 headerIndices.push(index);  // Guardamos el índice del header
//             }
//         });

//         if (headerIndices.length === 0) {
//             return;
//         }

//         // Procesamos cada columna que corresponde al día actual
//         headerIndices.forEach(headerIndex => {
//             const rows = document.querySelectorAll('#users-body tr'); // Seleccionamos todas las filas de la tabla de usuarios
//             let assignedImUser = null;  // Guardamos el usuario asignado para 'Im'
//             let assignedFnUser = null;  // Guardamos el usuario asignado para 'Fn'

//             // Paso 1: Verificar si hay alguien asignado a Im
//             for (const row of rows) {
//                 const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
//                 if (selects.length > headerIndex - 1) {
//                     const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna

//                     if (select && !select.disabled && select.value === 'Im') {
//                         assignedImUser = row;  // Si hay un usuario con Im asignado, guardamos el usuario
//                         break;  // Salimos del bucle, ya hay un asignado
//                     }
//                 }
//             }

//             // Paso 2: Verificar si hay alguien asignado a Fn
//             for (const row of rows) {
//                 const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
//                 if (selects.length > headerIndex - 1) {
//                     const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna

//                     if (select && !select.disabled && select.value === 'Fn') {
//                         assignedFnUser = row;  // Si hay un usuario con Fn asignado, guardamos el usuario
//                         break;  // Salimos del bucle, ya hay un asignado
//                     }
//                 }
//             }

//             // Obtener el nombre de usuario en la primera celda de la fila
//             const getUsernameFromRow = (row) => row.cells[0].textContent.trim();

//             // Verificar guardias de lharriague y mquiroga para el día actual
//             const isLharriagueAssignedToday = [...rows].some(row => {
//                 const selects = row.querySelectorAll('td select');
//                 const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna actual
//                 return getUsernameFromRow(row) === 'lharriague' && select.value !== '' && !select.disabled;
//             });

//             const isMquirogaAssignedToday = [...rows].some(row => {
//                 const selects = row.querySelectorAll('td select');
//                 const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna actual
//                 return getUsernameFromRow(row) === 'mquiroga' && select.value !== '' && !select.disabled;
//             });

//             console.log(`Día: ${day} (Número del Día: ${headerIndex}), lharriague tiene guardia: ${isLharriagueAssignedToday}, mquiroga tiene guardia: ${isMquirogaAssignedToday}`); // Log de verificación


//             // Asignación a Im
//             if (!assignedImUser) {
//                 console.log(`Buscando asignación a Im...`); // Log inicial para la asignación a Im

//                 // Paso 2: Verificación de Asignación a Fn
//                 if (assignedFnUser) {
//                     const isFnUserCardio = assignedFnUser.dataset.cardio === 'true'; // Verificamos si el usuario asignado a Fn hace Cardio
//                     console.log(`Verificando asignación a Im: assignedFnUser: ${assignedFnUser ? getUsernameFromRow(assignedFnUser) : 'Ninguno'}, isFnUserCardio: ${isFnUserCardio}`);

//                     // Paso 4A: Si el usuario asignado a Fn hace Cardio
//                     if (isFnUserCardio) {
//                         console.log(`El usuario asignado a Fn ${getUsernameFromRow(assignedFnUser)} hace cardio. Comenzando a buscar asignaciones a Im.`); // Log adicional

//                         // Asignar Im a un usuario disponible sin importar si hace cardio o no, verificando mquiroga y lharriague
//                         for (const row of rows) {
//                             const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
//                             if (selects.length > headerIndex - 1) {
//                                 const select = selects[headerIndex - 1];
//                                 // Verificar si la opción "Im" está disponible
//                                 const imOption = Array.from(select.options).find(option => option.value === 'Im');

//                                 console.log(`Verificando fila para el usuario: ${getUsernameFromRow(row)}`);
//                                 console.log(`Select encontrado para ${getUsernameFromRow(row)}: ${select.value}, disabled: ${select.disabled}`);
//                                 console.log(`Opción "Im" disponible: ${imOption ? 'Sí' : 'No'}`);

//                                 if (select && !select.disabled && select.value === '' && imOption) {
//                                     console.log(`Select habilitado y vacío para ${getUsernameFromRow(row)}. Verificando condiciones de exclusión...`);

//                                     // Si lharriague tiene guardia, evitar asignar a mquiroga
//                                     if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
//                                         console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
//                                         continue; // Saltar la asignación
//                                     } else {
//                                         console.log(`mquiroga NO tiene guardia en este día.`); // Log de verificación
//                                     }

//                                     // Si mquiroga tiene guardia, evitar asignar a lharriague
//                                     if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
//                                         console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
//                                         continue; // Saltar la asignación
//                                     } else {
//                                         console.log(`lharriague NO tiene guardia en este día.`); // Log de verificación
//                                     }

//                                     select.value = 'Im';  // Asignar guardia de Im
//                                     assignedImUser = row; // Guardar usuario asignado
//                                     console.log(`Asignando Im a ${getUsernameFromRow(row)}`); // Log de asignación
//                                     break;  // Salimos del bucle, ya hemos asignado
//                                 } else {
//                                     console.log(`Condiciones no cumplidas para ${getUsernameFromRow(row)}. Select no asignado.`); // Log de condiciones no cumplidas
//                                 }
//                             } else {
//                                 console.log(`No hay selects disponibles para ${getUsernameFromRow(row)} en esta fila.`); // Log si no hay selects
//                             }
//                         }
//                     } 
//                     // Paso 4B: Si el usuario asignado a Fn no hace Cardio
//                     else {
//                         console.log(`El usuario asignado a Fn ${getUsernameFromRow(assignedFnUser)} no hace cardio. Buscando asignaciones a Im que hagan cardio.`);

//                         // Asignar Im a un usuario que haga Cardio, verificando mquiroga y lharriague
//                         for (const row of rows) {
//                             const selects = row.querySelectorAll('td select');
//                             if (selects.length > headerIndex - 1) {
//                                 const select = selects[headerIndex - 1];
//                                 // Verificar si la opción "Im" está disponible
//                                 const imOption = Array.from(select.options).find(option => option.value === 'Im');
//                                 const isCardioUser = row.dataset.cardio === 'true'; // Verificar si el usuario hace Cardio
//                                 console.log(`Verificando fila para el usuario: ${getUsernameFromRow(row)}`);
//                                 console.log(`Select encontrado para ${getUsernameFromRow(row)}: ${select.value}, disabled: ${select.disabled}`);
//                                 console.log(`Opción "Im" disponible: ${imOption ? 'Sí' : 'No'}`);

//                                 if (select && !select.disabled && select.value === '' && isCardioUser && imOption) {
//                                     // Si lharriague tiene guardia, evitar asignar a mquiroga
//                                     if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
//                                         console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
//                                         continue; // Saltar la asignación
//                                     }
//                                     // Si mquiroga tiene guardia, evitar asignar a lharriague
//                                     if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
//                                         console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
//                                         continue; // Saltar la asignación
//                                     }
//                                     select.value = 'Im'; // Asignar guardia de Im
//                                     assignedImUser = row; // Guardar usuario asignado
//                                     console.log(`Asignando Im a ${getUsernameFromRow(row)}`); // Log de asignación
//                                     break; // Salimos del bucle, ya hemos asignado
//                                 }
//                             }
//                         }
//                     }
//                 } 
//                 // Si no hay usuario asignado a Fn, simplemente asignar Im
//                 else {
//                     console.log(`No hay usuario asignado a Fn. Procediendo a asignar Im.`);

//                     for (const row of rows) {
//                         const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
//                         if (selects.length > headerIndex - 1) {
//                             const select = selects[headerIndex - 1];
//                             // Verificar si la opción "Im" está disponible
//                             const imOption = Array.from(select.options).find(option => option.value === 'Im');
//                             if (select && !select.disabled && select.value === '' && imOption) {
//                                 // Si lharriague tiene guardia, evitar asignar a mquiroga
//                                 if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
//                                     console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
//                                     continue; // Saltar la asignación
//                                 }
//                                 // Si mquiroga tiene guardia, evitar asignar a lharriague
//                                 if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
//                                     console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
//                                     continue; // Saltar la asignación
//                                 }
//                                 select.value = 'Im';  // Asignar guardia de Im
//                                 assignedImUser = row; // Guardar usuario asignado
//                                 console.log(`Asignando Im a ${getUsernameFromRow(row)}`); // Log de asignación
//                                 break; // Salimos del bucle, ya hemos asignado
//                             }
//                         }
//                     }
//                 }
//             }


//             // Asignación a Fn
//             if (!assignedFnUser) {
//                 console.log(`Buscando asignación a Fn...`); // Log inicial para la asignación a Fn

//                 // Paso 2: Verificación de Asignación a Im
//                 if (assignedImUser) {
//                     const isImUserCardio = assignedImUser.dataset.cardio === 'true'; // Verificamos si el usuario asignado a Im hace Cardio
//                     console.log(`Verificando asignación a Fn: assignedImUser: ${assignedImUser ? getUsernameFromRow(assignedImUser) : 'Ninguno'}, isImUserCardio: ${isImUserCardio}`);

//                     // Paso 4A: Si el usuario asignado a Im hace Cardio
//                     if (isImUserCardio) {
//                         console.log(`El usuario asignado a Im ${getUsernameFromRow(assignedImUser)} hace cardio. Comenzando a buscar asignaciones a Fn.`); // Log adicional

//                         // Asignar Fn a un usuario disponible sin importar si hace Cardio
//                         for (const row of rows) {
//                             const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
//                             if (selects.length > headerIndex - 1) {
//                                 const select = selects[headerIndex - 1];
//                                 if (select && !select.disabled && select.value === '') {
//                                     // Verificar si la opción "Fn" está disponible
//                                     const fnOption = Array.from(select.options).find(option => option.value === 'Fn');

//                                     console.log(`Verificando fila para el usuario: ${getUsernameFromRow(row)}`);
//                                     console.log(`Select encontrado para ${getUsernameFromRow(row)}: ${select.value}, disabled: ${select.disabled}`);
//                                     console.log(`Opción "Fn" disponible: ${fnOption ? 'Sí' : 'No'}`);

//                                     if (fnOption) {
//                                         // Si lharriague tiene guardia, evitar asignar a mquiroga
//                                         if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
//                                             console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
//                                             continue; // Saltar la asignación
//                                         } else {
//                                             console.log(`mquiroga NO tiene guardia en este día.`); // Log de verificación
//                                         }

//                                         // Si mquiroga tiene guardia, evitar asignar a lharriague
//                                         if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
//                                             console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
//                                             continue; // Saltar la asignación
//                                         } else {
//                                             console.log(`lharriague NO tiene guardia en este día.`); // Log de verificación
//                                         }

//                                         select.value = 'Fn'; // Asignar guardia de Fn
//                                         assignedFnUser = row; // Guardar usuario asignado
//                                         console.log(`Asignando Fn a ${getUsernameFromRow(row)} (Con Cardio)`); // Log de asignación
//                                         break; // Salimos del bucle, ya hemos asignado
//                                     } else {
//                                         console.log(`Condiciones no cumplidas para ${getUsernameFromRow(row)}. Select no asignado.`); // Log de condiciones no cumplidas
//                                     }
//                                 } else {
//                                     console.log(`Select no habilitado o no vacío para ${getUsernameFromRow(row)}.`); // Log si el select no está disponible
//                                 }
//                             } else {
//                                 console.log(`No hay selects disponibles para ${getUsernameFromRow(row)} en esta fila.`); // Log si no hay selects
//                             }
//                         }
//                     } 
//                     // Paso 4B: Si el usuario asignado a Im no hace Cardio
//                     else {
//                         console.log(`El usuario asignado a Im ${getUsernameFromRow(assignedImUser)} no hace cardio. Buscando asignaciones a Fn que hagan cardio.`);

//                         // Asignar Fn a un usuario que haga Cardio, verificando mquiroga y lharriague
//                         for (const row of rows) {
//                             const selects = row.querySelectorAll('td select');
//                             if (selects.length > headerIndex - 1) {
//                                 const select = selects[headerIndex - 1];
//                                 // Verificar si la opción "Fn" está disponible
//                                 const fnOption = Array.from(select.options).find(option => option.value === 'Fn');
//                                 const isCardioUser = row.dataset.cardio === 'true'; // Verificar si el usuario hace Cardio
//                                 console.log(`Verificando fila para el usuario: ${getUsernameFromRow(row)}`);
//                                 console.log(`Select encontrado para ${getUsernameFromRow(row)}: ${select.value}, disabled: ${select.disabled}`);
//                                 console.log(`Opción "Fn" disponible: ${fnOption ? 'Sí' : 'No'}`);

//                                 if (select && !select.disabled && select.value === '' && isCardioUser && fnOption) {
//                                     // Si lharriague tiene guardia, evitar asignar a mquiroga
//                                     if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
//                                         console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
//                                         continue; // Saltar la asignación
//                                     }
//                                     // Si mquiroga tiene guardia, evitar asignar a lharriague
//                                     if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
//                                         console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
//                                         continue; // Saltar la asignación
//                                     }
//                                     console.log(`Asignando Fn a ${getUsernameFromRow(row)} (Cardio)`); // Log de asignación
//                                     select.value = 'Fn'; // Asignar guardia de Fn
//                                     assignedFnUser = row; // Guardar usuario asignado
//                                     break; // Salimos del bucle, ya hemos asignado
//                                 }
//                             }
//                         }
//                     }
//                 } 
//                 // Si no hay usuario asignado a Im, simplemente asignar Fn
//                 else {
//                     console.log(`No hay usuario asignado a Im. Procediendo a asignar Fn.`);

//                     for (const row of rows) {
//                         const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
//                         if (selects.length > headerIndex - 1) {
//                             const select = selects[headerIndex - 1];
//                             if (select && !select.disabled && select.value === '') {
//                                 // Si lharriague tiene guardia, evitar asignar a mquiroga
//                                 if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
//                                     console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
//                                     continue; // Saltar la asignación
//                                 }
//                                 // Si mquiroga tiene guardia, evitar asignar a lharriague
//                                 if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
//                                     console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
//                                     continue; // Saltar la asignación
//                                 }
//                                 const fnOption = Array.from(select.options).find(option => option.value === 'Fn');
//                                 if (fnOption) {
//                                     console.log(`Asignando Fn a ${getUsernameFromRow(row)} (Sin Im)`); // Log de asignación
//                                     select.value = 'Fn'; // Asignar guardia de Fn
//                                     assignedFnUser = row; // Guardar usuario asignado
//                                     break; // Salimos del bucle, ya hemos asignado
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
            
//         });
//     });
// }

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

            // Obtener el nombre de usuario en la primera celda de la fila
            const getUsernameFromRow = (row) => row.cells[0].textContent.trim();

            // Verificar guardias de lharriague y mquiroga para el día actual
            const isLharriagueAssignedToday = [...rows].some(row => {
                const selects = row.querySelectorAll('td select');
                const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna actual
                return getUsernameFromRow(row) === 'lharriague' && select.value !== '' && !select.disabled;
            });

            const isMquirogaAssignedToday = [...rows].some(row => {
                const selects = row.querySelectorAll('td select');
                const select = selects[headerIndex - 1]; // Seleccionamos el select correspondiente a la columna actual
                return getUsernameFromRow(row) === 'mquiroga' && select.value !== '' && !select.disabled;
            });

            console.log(`Día: ${day} (Número del Día: ${headerIndex}), lharriague tiene guardia: ${isLharriagueAssignedToday}, mquiroga tiene guardia: ${isMquirogaAssignedToday}`); // Log de verificación

            // Llamada a la función para asignar Im
            assignedImUser = assignIm(rows, headerIndex, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, getUsernameFromRow);

            // Llamada a la función para asignar Fn
            assignFn(rows, headerIndex, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, getUsernameFromRow);
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

    // Agregar la opción "ND" para todos los selects
    const ndOption = document.createElement('option');
    ndOption.value = 'ND';
    ndOption.textContent = 'ND';
    selectElement.appendChild(ndOption);

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

// Función para contar las guardias asignadas a cada usuario en días de semana
export function countWeekdayShifts() {
    const userShiftCounts = {}; // Objeto para almacenar las guardias por usuario

    // Seleccionamos todas las filas de la tabla de usuarios
    const rows = document.querySelectorAll('#users-body tr');

    // Recorremos cada fila de la tabla de usuarios
    rows.forEach(row => {
        const username = row.cells[0].textContent.trim(); // Obtener el nombre de usuario de la primera celda
        const selects = row.querySelectorAll('td select'); // Obtener todos los selects de la fila

        // Inicializar el conteo de guardias para el usuario si no existe
        if (!userShiftCounts[username]) {
            userShiftCounts[username] = 0;
        }

        // Recorremos cada select en la fila (que corresponde a los días de semana)
        selects.forEach(select => {
            if (!select.disabled && select.value !== '' && select.value !== 'ND') {
                // Si el select está habilitado y tiene una asignación válida (no vacío y no "ND")
                userShiftCounts[username]++; // Incrementar el conteo de guardias para el usuario
            }
        });
    });

    return userShiftCounts; // Retornar el objeto con los conteos de guardias por usuario
}



