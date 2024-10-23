export function assignIm(rows, headerIndex, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedFnUser, getUsernameFromRow) {
    let assignedImUser = null;

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

    // Asignación a Im
    if (!assignedImUser) {
        console.log(`Buscando asignación a Im...`); // Log inicial para la asignación a Im

        // Paso 2: Verificación de Asignación a Fn
        if (assignedFnUser) {
            const isFnUserCardio = assignedFnUser.dataset.cardio === 'true'; // Verificamos si el usuario asignado a Fn hace Cardio
            console.log(`Verificando asignación a Im: assignedFnUser: ${assignedFnUser ? getUsernameFromRow(assignedFnUser) : 'Ninguno'}, isFnUserCardio: ${isFnUserCardio}`);

            // Paso 4A: Si el usuario asignado a Fn hace Cardio
            if (isFnUserCardio) {
                console.log(`El usuario asignado a Fn ${getUsernameFromRow(assignedFnUser)} hace cardio. Comenzando a buscar asignaciones a Im.`); // Log adicional

                // Asignar Im a un usuario disponible sin importar si hace cardio o no, verificando mquiroga y lharriague
                for (const row of rows) {
                    const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                    if (selects.length > headerIndex - 1) {
                        const select = selects[headerIndex - 1];
                        const imOption = Array.from(select.options).find(option => option.value === 'Im');

                        console.log(`Verificando fila para el usuario: ${getUsernameFromRow(row)}`);
                        console.log(`Select encontrado para ${getUsernameFromRow(row)}: ${select.value}, disabled: ${select.disabled}`);
                        console.log(`Opción "Im" disponible: ${imOption ? 'Sí' : 'No'}`);

                        if (select && !select.disabled && select.value === '' && imOption) {
                            console.log(`Select habilitado y vacío para ${getUsernameFromRow(row)}. Verificando condiciones de exclusión...`);

                            // Si lharriague tiene guardia, evitar asignar a mquiroga
                            if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
                                console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
                                continue; // Saltar la asignación
                            } else {
                                console.log(`mquiroga NO tiene guardia en este día.`); // Log de verificación
                            }

                            // Si mquiroga tiene guardia, evitar asignar a lharriague
                            if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
                                console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
                                continue; // Saltar la asignación
                            } else {
                                console.log(`lharriague NO tiene guardia en este día.`); // Log de verificación
                            }

                            select.value = 'Im';  // Asignar guardia de Im
                            assignedImUser = row; // Guardar usuario asignado
                            console.log(`Asignando Im a ${getUsernameFromRow(row)}`); // Log de asignación
                            break;  // Salimos del bucle, ya hemos asignado
                        } else {
                            console.log(`Condiciones no cumplidas para ${getUsernameFromRow(row)}. Select no asignado.`); // Log de condiciones no cumplidas
                        }
                    } else {
                        console.log(`No hay selects disponibles para ${getUsernameFromRow(row)} en esta fila.`); // Log si no hay selects
                    }
                }
            } 
            // Paso 4B: Si el usuario asignado a Fn no hace Cardio
            else {
                console.log(`El usuario asignado a Fn ${getUsernameFromRow(assignedFnUser)} no hace cardio. Buscando asignaciones a Im que hagan cardio.`);

                for (const row of rows) {
                    const selects = row.querySelectorAll('td select');
                    if (selects.length > headerIndex - 1) {
                        const select = selects[headerIndex - 1];
                        const imOption = Array.from(select.options).find(option => option.value === 'Im');
                        const isCardioUser = row.dataset.cardio === 'true'; // Verificar si el usuario hace Cardio

                        if (select && !select.disabled && select.value === '' && isCardioUser && imOption) {
                            // Si lharriague tiene guardia, evitar asignar a mquiroga
                            if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
                                console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
                                continue; // Saltar la asignación
                            }
                            // Si mquiroga tiene guardia, evitar asignar a lharriague
                            if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
                                console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
                                continue; // Saltar la asignación
                            }
                            select.value = 'Im'; // Asignar guardia de Im
                            assignedImUser = row; // Guardar usuario asignado
                            console.log(`Asignando Im a ${getUsernameFromRow(row)}`); // Log de asignación
                            break; // Salimos del bucle, ya hemos asignado
                        }
                    }
                }
            }
        } 
        // Si no hay usuario asignado a Fn, simplemente asignar Im
        else {
            console.log(`No hay usuario asignado a Fn. Procediendo a asignar Im.`);

            for (const row of rows) {
                const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                if (selects.length > headerIndex - 1) {
                    const select = selects[headerIndex - 1];
                    const imOption = Array.from(select.options).find(option => option.value === 'Im');
                    if (select && !select.disabled && select.value === '' && imOption) {
                        // Si lharriague tiene guardia, evitar asignar a mquiroga
                        if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
                            console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
                            continue; // Saltar la asignación
                        }
                        // Si mquiroga tiene guardia, evitar asignar a lharriague
                        if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
                            console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
                            continue; // Saltar la asignación
                        }
                        select.value = 'Im';  // Asignar guardia de Im
                        assignedImUser = row; // Guardar usuario asignado
                        console.log(`Asignando Im a ${getUsernameFromRow(row)}`); // Log de asignación
                        break; // Salimos del bucle, ya hemos asignado
                    }
                }
            }
        }
    }

    return assignedImUser; // Retornamos el usuario asignado a Im
}

export function assignFn(rows, headerIndex, isLharriagueAssignedToday, isMquirogaAssignedToday, assignedImUser, getUsernameFromRow) {
    let assignedFnUser = null;

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

    // Asignación a Fn
    if (!assignedFnUser) {
        console.log(`Buscando asignación a Fn...`); // Log inicial para la asignación a Fn

        // Paso 2: Verificación de Asignación a Im
        if (assignedImUser) {
            const isImUserCardio = assignedImUser.dataset.cardio === 'true'; // Verificamos si el usuario asignado a Im hace Cardio
            console.log(`Verificando asignación a Fn: assignedImUser: ${assignedImUser ? getUsernameFromRow(assignedImUser) : 'Ninguno'}, isImUserCardio: ${isImUserCardio}`);

            // Paso 4A: Si el usuario asignado a Im hace Cardio
            if (isImUserCardio) {
                console.log(`El usuario asignado a Im ${getUsernameFromRow(assignedImUser)} hace cardio. Comenzando a buscar asignaciones a Fn.`); // Log adicional

                // Asignar Fn a un usuario disponible sin importar si hace Cardio
                for (const row of rows) {
                    const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                    if (selects.length > headerIndex - 1) {
                        const select = selects[headerIndex - 1];
                        const fnOption = Array.from(select.options).find(option => option.value === 'Fn');

                        console.log(`Verificando fila para el usuario: ${getUsernameFromRow(row)}`);
                        console.log(`Select encontrado para ${getUsernameFromRow(row)}: ${select.value}, disabled: ${select.disabled}`);
                        console.log(`Opción "Fn" disponible: ${fnOption ? 'Sí' : 'No'}`);

                        if (select && !select.disabled && select.value === '' && fnOption) {
                            // Si lharriague tiene guardia, evitar asignar a mquiroga
                            if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
                                console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
                                continue; // Saltar la asignación
                            } else {
                                console.log(`mquiroga NO tiene guardia en este día.`); // Log de verificación
                            }

                            // Si mquiroga tiene guardia, evitar asignar a lharriague
                            if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
                                console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
                                continue; // Saltar la asignación
                            } else {
                                console.log(`lharriague NO tiene guardia en este día.`); // Log de verificación
                            }

                            select.value = 'Fn'; // Asignar guardia de Fn
                            assignedFnUser = row; // Guardar usuario asignado
                            console.log(`Asignando Fn a ${getUsernameFromRow(row)} (Con Cardio)`); // Log de asignación
                            break; // Salimos del bucle, ya hemos asignado
                        } else {
                            console.log(`Condiciones no cumplidas para ${getUsernameFromRow(row)}. Select no asignado.`); // Log de condiciones no cumplidas
                        }
                    } else {
                        console.log(`No hay selects disponibles para ${getUsernameFromRow(row)} en esta fila.`); // Log si no hay selects
                    }
                }
            } 
            // Paso 4B: Si el usuario asignado a Im no hace Cardio
            else {
                console.log(`El usuario asignado a Im ${getUsernameFromRow(assignedImUser)} no hace cardio. Buscando asignaciones a Fn que hagan cardio.`);

                for (const row of rows) {
                    const selects = row.querySelectorAll('td select');
                    if (selects.length > headerIndex - 1) {
                        const select = selects[headerIndex - 1];
                        const fnOption = Array.from(select.options).find(option => option.value === 'Fn');
                        const isCardioUser = row.dataset.cardio === 'true'; // Verificar si el usuario hace Cardio

                        if (select && !select.disabled && select.value === '' && isCardioUser && fnOption) {
                            // Si lharriague tiene guardia, evitar asignar a mquiroga
                            if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
                                console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
                                continue; // Saltar la asignación
                            }
                            // Si mquiroga tiene guardia, evitar asignar a lharriague
                            if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
                                console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
                                continue; // Saltar la asignación
                            }
                            select.value = 'Fn'; // Asignar guardia de Fn
                            assignedFnUser = row; // Guardar usuario asignado
                            console.log(`Asignando Fn a ${getUsernameFromRow(row)} (Cardio)`); // Log de asignación
                            break; // Salimos del bucle, ya hemos asignado
                        }
                    }
                }
            }
        } 
        // Si no hay usuario asignado a Im, simplemente asignar Fn
        else {
            console.log(`No hay usuario asignado a Im. Procediendo a asignar Fn.`);

            for (const row of rows) {
                const selects = row.querySelectorAll('td select'); // Obtenemos todos los selects de la fila
                if (selects.length > headerIndex - 1) {
                    const select = selects[headerIndex - 1];
                    const fnOption = Array.from(select.options).find(option => option.value === 'Fn');
                    if (select && !select.disabled && select.value === '' && fnOption) {
                        // Si lharriague tiene guardia, evitar asignar a mquiroga
                        if (isLharriagueAssignedToday && getUsernameFromRow(row) === 'mquiroga') {
                            console.log(`No se asignará a mquiroga porque lharriague tiene guardia en este día.`); // Log
                            continue; // Saltar la asignación
                        }
                        // Si mquiroga tiene guardia, evitar asignar a lharriague
                        if (isMquirogaAssignedToday && getUsernameFromRow(row) === 'lharriague') {
                            console.log(`No se asignará a lharriague porque mquiroga tiene guardia en este día.`); // Log
                            continue; // Saltar la asignación
                        }
                        select.value = 'Fn';  // Asignar guardia de Fn
                        assignedFnUser = row; // Guardar usuario asignado
                        console.log(`Asignando Fn a ${getUsernameFromRow(row)} (Sin Im)`); // Log de asignación
                        break; // Salimos del bucle, ya hemos asignado
                    }
                }
            }
        }
    }

    return assignedFnUser; // Retornamos el usuario asignado a Fn
}