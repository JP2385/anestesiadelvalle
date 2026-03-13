import toast from './toast.js';

document.addEventListener("DOMContentLoaded", () => {
    // 🔹 Variables globales (declaradas una sola vez)
    const yearFilter = document.getElementById("year-filter");
    const holidayTableBody = document.querySelector("#holiday-table tbody");
    const assignHolidaysButton = document.getElementById("assign-holidays");
    const userHolidayCountTable = document.getElementById("user-holiday-count-table");
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    const printHolidaysButton = document.getElementById("print-holidays");
    const clearAssignmentsButton = document.getElementById("clear-assignments");

    let allUsers = []; // Almacena la lista de usuarios en memoria
    let allHolidays = []; // Almacena la lista de feriados en memoria
    const excludedUsers = ["montes_esposito", "rconsigli", "mgioja", "ggudiño", "lespinosa", "jbo", "ecesar", "bvalenti"];

    // 🔹 Cargar los últimos 5 años y el siguiente en el select
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        yearFilter.appendChild(option);
    }
    yearFilter.value = currentYear;

    // 🔹 Función para obtener todos los datos en un solo fetch
    async function fetchInitialData() {
        try {
            const [usersResponse, holidaysResponse] = await Promise.all([
                fetch(`${apiUrl}/auth/users`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("token") || sessionStorage.getItem("token")) }
                }),
                fetch(`${apiUrl}/holidays`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("token") || sessionStorage.getItem("token")) }
                })
            ]);

            if (!usersResponse.ok || !holidaysResponse.ok) throw new Error("Error al obtener datos.");

            allUsers = await usersResponse.json();
            allHolidays = await holidaysResponse.json();

            loadHolidays(yearFilter.value);
            updateUserHolidayCount();

        } catch (error) {
            console.error("❌ Error al obtener datos iniciales:", error);
            toast.error("Hubo un problema al cargar la información.");
        }
    }

    fetchInitialData(); // Ejecutar al cargar la página

    // 🔹 Cargar los feriados largos del año seleccionado
    function loadHolidays(year) {
        try {
            const filteredHolidays = allHolidays.filter(h => 
                new Date(h.startDate).getUTCFullYear() === parseInt(year)
            );
            const longHolidays = filteredHolidays.filter(h => 
                (new Date(h.endDate) - new Date(h.startDate)) / (1000 * 60 * 60 * 24) + 1 > 2
            );
    
            holidayTableBody.innerHTML = "";
    
            longHolidays.forEach(holiday => {
                const row = document.createElement("tr");
                row.setAttribute("data-holiday-id", holiday._id); // 📌 Se agrega el ID del feriado
    
                // 📌 Nombre del feriado
                const holidayNameCell = document.createElement("td");
                holidayNameCell.textContent = holiday.name;
    
                // 📌 Fechas del feriado con ajuste de zona horaria
                const holidayDatesCell = document.createElement("td");
    
                const startDate = new Date(holiday.startDate);
                const endDate = new Date(holiday.endDate);
    
                startDate.setUTCHours(3, 0, 0, 0); // Ajusta a Argentina (UTC-3)
                endDate.setUTCHours(3, 0, 0, 0);
    
                holidayDatesCell.textContent = `${startDate.toLocaleDateString("es-ES")} - ${endDate.toLocaleDateString("es-ES")}`;
    
                // 📌 Asignación de usuarios
                const userAssignmentCell = document.createElement("td");
                const assignedUsers = holiday.users.map(user => user._id);
    
                for (let i = 0; i < 4; i++) {
                    const userSelect = document.createElement("select");
                    userSelect.innerHTML = `<option value="">Seleccionar usuario</option>`;
    
                    allUsers.forEach(user => {
                        if (excludedUsers.includes(user.username)) return;
                        const isOnVacation = user.vacations?.some(v =>
                            new Date(holiday.startDate) <= new Date(v.endDate) &&
                            new Date(holiday.endDate) >= new Date(v.startDate)
                        );
                        if (isOnVacation) return;

                        const isOnOtherLeave = user.otherLeaves?.some(leave =>
                            new Date(holiday.startDate) <= new Date(leave.endDate) &&
                            new Date(holiday.endDate) >= new Date(leave.startDate)
                        );
                        if (isOnOtherLeave) return;

                        const option = document.createElement("option");
                        option.value = user._id;
                        option.textContent = user.username;
                        userSelect.appendChild(option);
                    });
    
                    if (assignedUsers[i]) {
                        userSelect.value = assignedUsers[i];
                    }
    
                    userAssignmentCell.appendChild(userSelect);
                }
    
                row.appendChild(holidayNameCell);
                row.appendChild(holidayDatesCell);
                row.appendChild(userAssignmentCell);
                holidayTableBody.appendChild(row);
            });
    
            updateUserHolidayCount();
        } catch (error) {
            console.error("❌ Error en loadHolidays:", error);
            toast.error("Hubo un problema al obtener los feriados.");
        }
    }
    
    

    // 🔹 Contar feriados largos asignados a cada usuario
    function updateUserHolidayCount() {
        try {
            const filteredUsers = allUsers.filter(user => !excludedUsers.includes(user.username));
            let holidayCount = {};
            filteredUsers.forEach(user => holidayCount[user.username] = {});

            let years = new Set();

            allHolidays.forEach(holiday => {
                const year = new Date(holiday.startDate).getFullYear();
                years.add(year);

                holiday.users.forEach(user => {
                    const userData = allUsers.find(u => u._id === user._id);
                    if (userData && !excludedUsers.includes(userData.username)) {
                        holidayCount[userData.username][year] = (holidayCount[userData.username][year] || 0) + 1;
                    }
                });
            });

            years = Array.from(years).sort((a, b) => b - a);
            renderUserHolidayCountTable(holidayCount, years);
        } catch (error) {
            console.error("❌ Error en updateUserHolidayCount:", error);
        }
    }

    function updateUserHolidayCountFromDOM() {
        const selectedYear = parseInt(yearFilter.value);
    
        // 📌 Obtener los años existentes en la tabla antes de modificarla
        let existingYears = Array.from(document.querySelectorAll("#user-holiday-count-table thead th"))
            .map(th => parseInt(th.textContent))
            .filter(year => !isNaN(year)); // Filtrar solo los años válidos
    
        // 📌 Mantener los años que ya estaban en la tabla
        if (!existingYears.includes(selectedYear)) existingYears.push(selectedYear);
    
        // 📌 Estructura para mantener el histórico de conteo
        let holidayCount = {};
    
        // 🔹 Recuperar datos actuales de la tabla (evita eliminar otros años)
        document.querySelectorAll("#user-holiday-count-table tbody tr").forEach(row => {
            const username = row.cells[0].textContent.trim();
            holidayCount[username] = {};
    
            // Guardar el conteo actual de cada año
            existingYears.forEach((year, index) => {
                holidayCount[username][year] = parseInt(row.cells[index + 1]?.textContent) || 0;
            });
        });
    
        // 🔹 Reiniciar solo el conteo del año seleccionado
        Object.keys(holidayCount).forEach(username => {
            holidayCount[username][selectedYear] = 0;
        });
    
        // 📌 Contar las asignaciones actuales del DOM para el año seleccionado
        document.querySelectorAll("#holiday-table tbody tr").forEach(row => {
            const assignedUsers = Array.from(row.querySelectorAll("select"))
                .map(select => select.value)
                .filter(userId => userId);
    
            assignedUsers.forEach(userId => {
                const user = allUsers.find(u => u._id === userId);
                if (user && !excludedUsers.includes(user.username)) {
                    if (!holidayCount[user.username]) holidayCount[user.username] = {};
                    holidayCount[user.username][selectedYear] = (holidayCount[user.username][selectedYear] || 0) + 1;
                }
            });
        });
    
        // 📌 Renderizar la tabla SIN borrar otros años
        renderUserHolidayCountTable(holidayCount, existingYears);
    }
    

    // 🔹 Renderizar la tabla de conteo de feriados largos
    function renderUserHolidayCountTable(holidayCount, years) {
        const thead = userHolidayCountTable.querySelector("thead");
        const tbody = userHolidayCountTable.querySelector("tbody");

        thead.innerHTML = "";
        tbody.innerHTML = "";

        years.sort((a, b) => b - a);

        const headerRow = document.createElement("tr");
        headerRow.appendChild(document.createElement("th")).textContent = "Usuario";

        years.forEach(year => {
            const th = document.createElement("th");
            th.textContent = year;
            headerRow.appendChild(th);
        });

        const totalTh = document.createElement("th");
        totalTh.textContent = "Total";
        headerRow.appendChild(totalTh);
        thead.appendChild(headerRow);

        Object.entries(holidayCount).forEach(([username, yearlyData]) => {
            const row = document.createElement("tr");
            row.appendChild(document.createElement("td")).textContent = username;

            let total = 0;
            years.forEach(year => {
                const count = yearlyData[year] || 0;
                total += count;
                row.appendChild(document.createElement("td")).textContent = count;
            });

            row.appendChild(document.createElement("td")).textContent = total;
            tbody.appendChild(row);
        });
    }

    // 🔹 Escuchar cambios manuales en los selects
    holidayTableBody.addEventListener("change", (event) => {
        if (event.target.tagName === "SELECT") {
            updateUserHolidayCountFromDOM(); // Llamar al cambiar manualmente un select
        }
    });

    // 🔹 Recargar datos al cambiar el año seleccionado
    yearFilter.addEventListener("change", () => loadHolidays(yearFilter.value));

    assignHolidaysButton.addEventListener("click", () => {
        const holidayRows = document.querySelectorAll("#holiday-table tbody tr");
        const userCounters = {}; // 📌 Contador de asignaciones por usuario

        // 📌 Obtener conteo total acumulado desde la tabla
        document.querySelectorAll("#user-holiday-count-table tbody tr").forEach(row => {
            const username = row.cells[0].textContent.trim();
            const total = parseInt(row.lastElementChild.textContent) || 0; // 📌 Última celda es el total acumulado
            const user = allUsers.find(u => u.username === username);
            if (user) {
                userCounters[user._id] = total;
            }
        });
        
    
        holidayRows.forEach(row => {
            const selects = row.querySelectorAll("select");
            let assignedUsers = new Set(); // 📌 Usuarios ya asignados a este feriado
    
            // 📌 Obtener la cantidad máxima de asignaciones actual
            let maxAssignments = Math.max(...Object.values(userCounters), 0);
    
            // 📌 Paso 1: Asignar usuario al azar al primer select
            let availableUsers = Array.from(selects[0].options)
                .filter(option => option.value && 
                    !assignedUsers.has(option.value) &&
                    !["msalvarezza"].includes(allUsers.find(u => u._id === option.value)?.username) &&
                    userCounters[option.value] < maxAssignments // 🔹 EXCLUIR USUARIOS CON EL MÁXIMO DE ASIGNACIONES
                )
                .map(option => option.value);
    
            // Si todos tienen el máximo de asignaciones, permitir usuarios con `maxAssignments`
            if (availableUsers.length === 0) {
                availableUsers = Array.from(selects[0].options)
                    .filter(option => option.value && 
                        !assignedUsers.has(option.value) &&
                        !["msalvarezza"].includes(allUsers.find(u => u._id === option.value)?.username) &&
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
                let firstUserData = allUsers.find(u => u._id === firstUser);
                let excludeUsers = ["msalvarezza"];

                // 📌 Si el usuario asignado en el primer select NO trabaja en privado Neuquén, excluir a mmelo y ltotis
                if (firstUserData && firstUserData.worksInPrivateNeuquen === false) {
                    excludeUsers.push("mmelo", "ltotis");
                }

                availableUsers = Array.from(selects[1].options)
                    .filter(option => option.value &&
                        !assignedUsers.has(option.value) &&
                        !excludeUsers.includes(allUsers.find(u => u._id === option.value)?.username) &&
                        userCounters[option.value] < maxAssignments // 🔹 Aplicar el filtro de equidad
                    )
                    .map(option => option.value);

                if (availableUsers.length === 0) {
                    availableUsers = Array.from(selects[1].options)
                        .filter(option => option.value &&
                            !assignedUsers.has(option.value) &&
                            !excludeUsers.includes(allUsers.find(u => u._id === option.value)?.username) &&
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

            // 📌 Obtener datos de los usuarios asignados en primer y segundo lugar
            let firstUserData = allUsers.find(u => u._id === firstUser);
            let secondUserData = allUsers.find(u => u._id === secondUser);

            // 📌 Si ambos usuarios NO trabajan en privado Neuquén, excluir a quienes tampoco trabajan en privado Neuquén
            let excludePrivateNeuquen = (firstUserData?.worksInPrivateNeuquen === false && secondUserData?.worksInPrivateNeuquen === false);

            // 📌 Si ambos usuarios NO trabajan en privado Río Negro, excluir a quienes tampoco trabajan en privado Río Negro
            let excludePrivateRioNegro = (firstUserData?.worksInPrivateRioNegro === false && secondUserData?.worksInPrivateRioNegro === false);

            if (!thirdUser) {
                availableUsers = Array.from(selects[2].options)
                    .filter(option => {
                        let userData = allUsers.find(u => u._id === option.value);
                        return option.value &&
                            !assignedUsers.has(option.value) &&
                            !["mquiroga", "lharriague", "mmelo", "ltotis", "msalvarezza"].includes(userData?.username) &&
                            userCounters[option.value] < maxAssignments &&
                            (!excludePrivateNeuquen || userData?.worksInPrivateNeuquen) &&
                            (!excludePrivateRioNegro || userData?.worksInPrivateRioNegro);
                    })
                    .map(option => option.value);

                // 📌 Segundo intento: Permitir usuarios que no superen `maxAssignments`
                if (availableUsers.length === 0) {
                    availableUsers = Array.from(selects[2].options)
                        .filter(option => {
                            let userData = allUsers.find(u => u._id === option.value);
                            return option.value &&
                                !assignedUsers.has(option.value) &&
                                !["mquiroga", "lharriague", "mmelo", "ltotis", "msalvarezza"].includes(userData?.username) &&
                                userCounters[option.value] <= maxAssignments &&
                                (!excludePrivateNeuquen || userData?.worksInPrivateNeuquen) &&
                                (!excludePrivateRioNegro || userData?.worksInPrivateRioNegro);
                        })
                        .map(option => option.value);
                }

                // 📌 Último intento: Seleccionar al usuario con menos asignaciones, aunque supere `maxAssignments`
                if (availableUsers.length === 0) {
                    availableUsers = Array.from(selects[2].options)
                        .filter(option => {
                            let userData = allUsers.find(u => u._id === option.value);
                            return option.value &&
                                !assignedUsers.has(option.value) &&
                                !["mquiroga", "lharriague", "mmelo", "ltotis", "msalvarezza"].includes(userData?.username) &&
                                (!excludePrivateNeuquen || userData?.worksInPrivateNeuquen) &&
                                (!excludePrivateRioNegro || userData?.worksInPrivateRioNegro);
                        })
                        .map(option => option.value)
                        .sort((a, b) => userCounters[a] - userCounters[b]); // Ordenar por menor cantidad de asignaciones
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


    
        // 📌 Log del contador de asignaciones con usernames
        let userCounterWithNames = {};
        Object.keys(userCounters).forEach(userId => {
            let username = allUsers.find(u => u._id === userId)?.username || userId;
            userCounterWithNames[username] = userCounters[userId];
        });
    
        console.log("📌 Contador de asignaciones finalizado:", userCounterWithNames);
        updateUserHolidayCountFromDOM();
    });

    });

    clearAssignmentsButton.addEventListener("click", () => {
        toast.confirm("¿Estás seguro de que deseas limpiar todas las asignaciones del año seleccionado?", () => {
            // Limpiar todos los selects de la tabla de feriados
            const holidayRows = document.querySelectorAll("#holiday-table tbody tr");

            holidayRows.forEach(row => {
                const selects = row.querySelectorAll("select");
                selects.forEach(select => {
                    select.value = ""; // Resetear a la opción vacía
                });
            });

            // Actualizar el conteo de feriados para reflejar que no hay asignaciones
            updateUserHolidayCountFromDOM();

            toast.success("Todas las asignaciones han sido limpiadas.");
        });
    });

    printHolidaysButton.addEventListener("click", async () => {
        try {
            const holidayRows = document.querySelectorAll("#holiday-table tbody tr");
    
            if (holidayRows.length === 0) {
                toast.warning("No hay feriados asignados para guardar.");
                return;
            }
    
            for (const row of holidayRows) {
                const holidayId = row.getAttribute("data-holiday-id");
    
                if (!holidayId) {
                    console.error("❌ No se encontró el ID del feriado en la tabla.");
                    toast.error("⚠️ No se encontró un ID válido para un feriado. Asegúrate de que los datos están bien cargados.");
                    continue;
                }
    
                const name = row.children[0].textContent.trim();
                const dates = row.children[1].textContent.trim().split(" - ");
                
                let startDate = new Date(dates[0].split("/").reverse().join("-")); // Convertir DD/MM/YYYY → YYYY-MM-DD
                let endDate = new Date(dates[1].split("/").reverse().join("-"));
    
                // ✅ Ajustar las fechas a medianoche en UTC para evitar desfasajes
                startDate.setUTCHours(3, 0, 0, 0);
                endDate.setUTCHours(3, 0, 0, 0);
    
                // ✅ Convertir a formato ISO para evitar problemas de zona horaria en la API
                const holidayData = {
                    name,
                    startDate: startDate.toISOString().split("T")[0], // Enviar solo la fecha YYYY-MM-DD
                    endDate: endDate.toISOString().split("T")[0],
                    users: Array.from(row.querySelectorAll("select"))
                        .map(select => select.value)
                        .filter(userId => userId)
                };
    
                const response = await fetch(`${apiUrl}/holidays/${holidayId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + (localStorage.getItem("token") || sessionStorage.getItem("token"))
                    },
                    body: JSON.stringify(holidayData)
                });
    
                const result = await response.json();
    
                if (!response.ok) {
                    console.error("❌ Error al actualizar feriado:", result);
                    throw new Error(result.message || "Error al actualizar el feriado.");
                }
            }
    
            toast.success("Feriados actualizados exitosamente.");
            setTimeout(() => window.location.href = "holidayInform.html", 1500);
    
        } catch (error) {
            console.error("❌ Error al actualizar feriados:", error);
            toast.error(error.message || "Hubo un problema al actualizar los feriados.");
        }
    });
    
    
     
});
