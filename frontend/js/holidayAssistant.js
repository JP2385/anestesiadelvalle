document.addEventListener("DOMContentLoaded", () => {
    const yearFilter = document.getElementById("year-filter");
    const holidayTableBody = document.querySelector("#holiday-table tbody");
    const assignHolidaysButton = document.getElementById("assign-holidays");

    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';

    // Cargar los últimos 5 años y el siguiente en el select
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        yearFilter.appendChild(option);
    }
    yearFilter.value = currentYear; // Seleccionar el año actual por defecto

    // Función para cargar los feriados largos del año seleccionado
    async function loadHolidays(year) {
        try {
            const response = await fetch(`${apiUrl}/holidays`, {  // ✅ Quitamos el `?year=${year}`, traemos todos
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                }
            });
    
            if (!response.ok) throw new Error("Error al obtener los feriados.");
    
            const holidays = await response.json();
            const allUsers = await fetchUsers(); // ✅ Obtener todos los usuarios de la base de datos
    
            console.log("📌 Feriados obtenidos:", holidays); // ✅ Verificar qué feriados trae el backend
    
            // ✅ Filtrar solo los feriados del año seleccionado
            const filteredHolidays = holidays.filter(h => {
                const startUTC = new Date(h.startDate);
                startUTC.setUTCHours(0, 0, 0, 0); // ✅ Asegurar que se compara en UTC
    
                return startUTC.getFullYear() === parseInt(year); // ✅ Comparar con el año seleccionado
            });
    
            console.log("📌 Feriados después del filtro por año:", filteredHolidays);
    
            // ✅ Filtrar solo feriados largos (más de 2 días)
            const longHolidays = filteredHolidays.filter(h => {
                const startUTC = new Date(h.startDate);
                const endUTC = new Date(h.endDate);
    
                startUTC.setUTCHours(0, 0, 0, 0);
                endUTC.setUTCHours(0, 0, 0, 0);
    
                const diffDays = (endUTC - startUTC) / (1000 * 60 * 60 * 24) + 1;
    
                console.log(`📌 Analizando feriado: ${h.name}`);
                console.log(`   - Fecha inicio UTC: ${startUTC.toISOString().split("T")[0]}`);
                console.log(`   - Fecha fin UTC: ${endUTC.toISOString().split("T")[0]}`);
                console.log(`   - Días de duración: ${diffDays}`);
    
                return diffDays > 2; // ✅ Solo incluir si dura más de 2 días
            });
    
            console.log("📌 Feriados largos filtrados:", longHolidays); // ✅ Verificar qué feriados cumplen la condición
    
            holidayTableBody.innerHTML = ""; // Limpiar la tabla antes de agregar nuevas filas
    
            longHolidays.forEach(holiday => {
                const row = document.createElement("tr");
    
                // Primera columna: Nombre del feriado
                const holidayNameCell = document.createElement("td");
                holidayNameCell.textContent = holiday.name;
    
                // Segunda columna: Fechas del feriado (agregar el día previo)
                const startUTC = new Date(holiday.startDate);
                const endUTC = new Date(holiday.endDate);
    
                startUTC.setDate(startUTC.getDate() - 1);
                startUTC.setUTCHours(0, 0, 0, 0);
                endUTC.setUTCHours(0, 0, 0, 0);
    
                const holidayDatesCell = document.createElement("td");
                holidayDatesCell.textContent = `${startUTC.toLocaleDateString("es-ES", { timeZone: "UTC" })} - ${endUTC.toLocaleDateString("es-ES", { timeZone: "UTC" })}`;
    
                // Tercera columna: Selects de asignación de usuarios
                const userAssignmentCell = document.createElement("td");
    
                // ✅ Lista de usuarios ya asignados al feriado
                const assignedUsers = holiday.users.map(user => user._id);
    
                for (let i = 0; i < 4; i++) {
                    const userSelect = document.createElement("select");
                    userSelect.innerHTML = `<option value="">Seleccionar usuario</option>`;
    
                // ✅ Poblar el select con todos los usuarios disponibles, excluyendo ciertos usuarios
                const excludedUsers = ["rconsigli", "mgioja", "ggudiño", "montes_esposito", "lalvarez", "lespinosa"];

                allUsers.forEach(user => {
                    if (excludedUsers.includes(user.username)) return; // ❌ Omitir usuarios excluidos

                    const option = document.createElement("option");
                    option.value = user._id;
                    option.textContent = user.username;
                    userSelect.appendChild(option);
                });
    
                    // ✅ Si hay un usuario asignado para este select, marcarlo como seleccionado
                    if (assignedUsers[i]) {
                        userSelect.value = assignedUsers[i];
                    }
    
                    userAssignmentCell.appendChild(userSelect);
                }
    
                // Agregar las columnas a la fila
                row.appendChild(holidayNameCell);
                row.appendChild(holidayDatesCell);
                row.appendChild(userAssignmentCell);
    
                holidayTableBody.appendChild(row);
            });
    
        } catch (error) {
            console.error("❌ Error en loadHolidays:", error);
            alert("Hubo un problema al obtener los feriados: " + error.message);
        }
    }
    
    
    // ✅ Función para obtener todos los usuarios
    let allUsers = []; // Definir allUsers en el ámbito global

    async function fetchUsers() {
        try {
            const response = await fetch(`${apiUrl}/auth/users`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                }
            });
    
            if (!response.ok) throw new Error("Error al obtener la lista de usuarios.");
    
            allUsers = await response.json(); // ✅ Guardar los usuarios en la variable global
            return allUsers;
        } catch (error) {
            console.error("Error al obtener usuarios:", error);
            return [];
        }
    }
    
    // ✅ Cargar usuarios antes de asignar feriados
    fetchUsers().then(() => console.log("📌 Usuarios cargados:", allUsers));
    

    // Cargar feriados largos al cambiar de año
    yearFilter.addEventListener("change", () => loadHolidays(yearFilter.value));

    // Cargar feriados largos al inicio
    loadHolidays(currentYear);

    assignHolidaysButton.addEventListener("click", () => {
        const holidayRows = document.querySelectorAll("#holiday-table tbody tr");
        const userCounters = {}; // 📌 Contador de asignaciones por usuario
    
        // Inicializar contador de usuarios
        allUsers.forEach(user => userCounters[user._id] = 0);
    
        holidayRows.forEach(row => {
            const selects = row.querySelectorAll("select");
            let assignedUsers = new Set(); // 📌 Usuarios ya asignados a este feriado
    
            // 📌 Obtener la cantidad máxima de asignaciones actual
            let maxAssignments = Math.max(...Object.values(userCounters), 0);
    
            // 📌 Paso 1: Asignar usuario al azar al primer select
            let availableUsers = Array.from(selects[0].options)
                .filter(option => option.value && 
                    !assignedUsers.has(option.value) &&
                    !["nvela", "msalvarezza","lburgueño"].includes(allUsers.find(u => u._id === option.value)?.username) &&
                    userCounters[option.value] < maxAssignments // 🔹 EXCLUIR USUARIOS CON EL MÁXIMO DE ASIGNACIONES
                )
                .map(option => option.value);
    
            // Si todos tienen el máximo de asignaciones, permitir usuarios con `maxAssignments`
            if (availableUsers.length === 0) {
                availableUsers = Array.from(selects[0].options)
                    .filter(option => option.value && 
                        !assignedUsers.has(option.value) &&
                        !["nvela", "msalvarezza","lburgueño"].includes(allUsers.find(u => u._id === option.value)?.username) &&
                        userCounters[option.value] <= maxAssignments // 🔹 PERMITIR SOLO A QUIENES NO LO SUPERAN
                    )
                    .map(option => option.value);
            }
    
            if (availableUsers.length === 0) return; // Si no hay usuarios disponibles, continuar con el siguiente feriado
    
            let firstUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
            selects[0].value = firstUser;
            assignedUsers.add(firstUser);
            userCounters[firstUser]++;
    
            let firstUsername = allUsers.find(u => u._id === firstUser)?.username || firstUser;
            console.log(`📌 Asignado primer usuario: ${firstUsername}`);
    
            // 📌 Paso 2: Asignación emparejada (validando que no haya sido ya asignado)
            let secondUser = null;
            const pairings = { "ltotis": "mmelo", "mmelo": "ltotis", "mquiroga": "lharriague", "lharriague": "mquiroga" };
    
            if (pairings[firstUsername]) {
                let pairedUser = allUsers.find(u => u.username === pairings[firstUsername]);
    
                // ⚠️ Asegurar que el usuario emparejado NO esté ya asignado a este feriado
                if (pairedUser && !assignedUsers.has(pairedUser._id) &&
                    Array.from(selects[1].options).some(option => option.value === pairedUser._id)) {
                    secondUser = pairedUser._id;
                }
            }
    
            // 📌 Paso 3: Si no se pudo asignar la pareja emparejada, elegir otro usuario bajo la misma lógica de equidad
            if (!secondUser) {
                availableUsers = Array.from(selects[1].options)
                    .filter(option => option.value && 
                        !assignedUsers.has(option.value) &&
                        !["nvela", "msalvarezza","lburgueño"].includes(allUsers.find(u => u._id === option.value)?.username) &&
                        userCounters[option.value] < maxAssignments // 🔹 Aplicar el filtro de equidad
                    )
                    .map(option => option.value);
    
                if (availableUsers.length === 0) {
                    availableUsers = Array.from(selects[1].options)
                        .filter(option => option.value && 
                            !assignedUsers.has(option.value) &&
                            !["nvela", "msalvarezza","lburgueño"].includes(allUsers.find(u => u._id === option.value)?.username) &&
                            userCounters[option.value] <= maxAssignments // 🔹 PERMITIR SOLO A QUIENES NO LO SUPERAN
                        )
                        .map(option => option.value);
                }
    
                if (availableUsers.length > 0) {
                    secondUser = availableUsers[0];
                }
            }
    
            if (secondUser) {
                selects[1].value = secondUser;
                assignedUsers.add(secondUser);
                userCounters[secondUser]++;
            }
    
            let secondUsername = allUsers.find(u => u._id === secondUser)?.username || secondUser;
            console.log(`📌 Asignado segundo usuario: ${secondUsername}`);
    
            // 📌 Paso 4: Asignación emparejada del tercer usuario (validando que no haya sido ya asignado)
            let thirdUser = null;
            if (pairings[secondUsername]) {
                let pairedUser = allUsers.find(u => u.username === pairings[secondUsername]);
    
                // ⚠️ Asegurar que el usuario emparejado NO esté ya asignado a este feriado
                if (pairedUser && !assignedUsers.has(pairedUser._id) &&
                    Array.from(selects[2].options).some(option => option.value === pairedUser._id)) {
                    thirdUser = pairedUser._id;
                }
            }
    
            // 📌 Paso 5: Asignar tercer usuario considerando cardio y equidad
            let hasCardio = [firstUser, secondUser].some(user => {
                return allUsers.find(u => u._id === user)?.doesCardio;
            });
    
            if (!thirdUser) {
                availableUsers = Array.from(selects[2].options)
                    .filter(option => option.value && 
                        !assignedUsers.has(option.value) && 
                        !["mquiroga", "lharriague", "mmelo", "ltotis", "nvela", "msalvarezza","lburgueño"].includes(allUsers.find(u => u._id === option.value)?.username) &&
                        userCounters[option.value] < maxAssignments // 🔹 Aplicar el filtro de equidad
                    )
                    .map(option => option.value);
    
                if (availableUsers.length === 0) {
                    availableUsers = Array.from(selects[2].options)
                        .filter(option => option.value && 
                            !assignedUsers.has(option.value) &&
                            !["mquiroga", "lharriague", "mmelo", "ltotis", "nvela", "msalvarezza","lburgueño"].includes(allUsers.find(u => u._id === option.value)?.username) &&
                            userCounters[option.value] <= maxAssignments // 🔹 PERMITIR SOLO A QUIENES NO LO SUPERAN
                        )
                        .map(option => option.value);
                }
    
                if (availableUsers.length > 0) {
                    if (hasCardio) {
                        availableUsers.sort((a, b) => userCounters[a] - userCounters[b]);
                    } else {
                        availableUsers = availableUsers.filter(user => {
                            return allUsers.find(u => u._id === user)?.doesCardio;
                        });
                    }
                    
                    if (availableUsers.length > 0) {
                        thirdUser = availableUsers[0];
                    }
                }
            }
    
            if (thirdUser) {
                selects[2].value = thirdUser;
                assignedUsers.add(thirdUser);
                userCounters[thirdUser]++;
            }
    
            let thirdUsername = allUsers.find(u => u._id === thirdUser)?.username || thirdUser;
            console.log(`📌 Asignado tercer usuario: ${thirdUsername}`);
        });
    
        // 📌 Log del contador de asignaciones con usernames
        let userCounterWithNames = {};
        Object.keys(userCounters).forEach(userId => {
            let username = allUsers.find(u => u._id === userId)?.username || userId;
            userCounterWithNames[username] = userCounters[userId];
        });
    
        console.log("📌 Contador de asignaciones finalizado:", userCounterWithNames);
    });
    
    
    
    
    
    
    
});
