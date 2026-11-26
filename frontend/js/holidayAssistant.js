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
    const excludedUsers = ["montes_esposito", "rconsigli", "mgioja", "ggudiño", "lespinosa"];

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
    
                for (let i = 0; i < 5; i++) {
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
    

    // 🔹 Ajuste manual de conteo por usuario (para quienes se incorporaron tarde)
    function getOffset(username) {
        const user = allUsers.find(u => u.username === username);
        return user?.holidayCountOffset || 0;
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

            // 📌 El total incluye el ajuste manual. Se muestra "8 (+2)" para que
            // quede claro que el número que usa el reparto no es solo el histórico.
            // Importante: el total ajustado va primero, porque assignHolidaysButton
            // lee esta celda con parseInt() para sembrar userCounters.
            const offset = getOffset(username);
            const totalCell = document.createElement("td");
            totalCell.textContent = offset
                ? `${total + offset} (${offset > 0 ? "+" : ""}${offset})`
                : `${total}`;
            row.appendChild(totalCell);
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

    // 🔹 Pareja que debe trabajar junta en los feriados largos. Ojo: en las
    // guardias diarias el resto de la app valida lo contrario (ver
    // shiftValidationUtils.js), acá se asignan juntos a propósito.
    const pairings = { "mquiroga": "lharriague", "lharriague": "mquiroga" };

    // 🔹 Cada feriado largo se cubre con 3 personas: un rionegrino que haga
    // cardio y dos neuquinos. Quien trabaja en ambas provincias puede ocupar
    // cualquiera de los dos tipos de cupo.
    const CUPOS = [
        { tipo: "rn-cardio", cumple: u => u?.worksInPrivateRioNegro && u?.doesCardio },
        { tipo: "nqn",       cumple: u => u?.worksInPrivateNeuquen },
        { tipo: "nqn",       cumple: u => u?.worksInPrivateNeuquen }
    ];

    assignHolidaysButton.addEventListener("click", () => {
        const holidayRows = document.querySelectorAll("#holiday-table tbody tr");
        const userCounters = {}; // 📌 Contador de asignaciones por usuario
        const faltantes = []; // 📌 Cupos que no se pudieron cubrir, para avisar al final

        // 📌 Obtener conteo total acumulado desde la tabla.
        // La celda puede venir como "8" o "8 (+2)" cuando hay ajuste manual; en
        // ambos casos el primer número ya es el total ajustado que debe usar el
        // reparto, así que se toma solo ese.
        document.querySelectorAll("#user-holiday-count-table tbody tr").forEach(row => {
            const username = row.cells[0].textContent.trim();
            const total = parseInt(row.lastElementChild.textContent.match(/-?\d+/)?.[0]) || 0;
            const user = allUsers.find(u => u.username === username);
            if (user) {
                userCounters[user._id] = total;
            }
        });
        
    
        holidayRows.forEach(row => {
            const selects = row.querySelectorAll("select");
            const holidayName = row.cells[0]?.textContent.trim() || "feriado";
            const assignedUsers = new Set(); // 📌 Usuarios ya asignados a este feriado

            // 📌 Candidatos de este feriado: las opciones del select ya vienen
            // filtradas por vacaciones y licencias en loadHolidays().
            const candidatos = Array.from(selects[0].options)
                .map(option => option.value)
                .filter(Boolean);

            const datos = id => allUsers.find(u => u._id === id);
            const nombre = id => datos(id)?.username || id;

            // 📌 Elige al candidato que cumple el cupo con menos feriados
            // acumulados. El desempate es al azar para que dos personas con el
            // mismo conteo no queden siempre en el mismo orden.
            const elegirPara = cupo => {
                const maxAssignments = Math.max(...Object.values(userCounters), 0);
                const aptos = candidatos
                    .filter(id => !assignedUsers.has(id) && cupo.cumple(datos(id)));

                // Se intenta primero entre quienes están por debajo del máximo
                // (equidad) y, si no hay nadie, se abre al resto de los aptos.
                const porDebajo = aptos.filter(id => userCounters[id] < maxAssignments);
                const pool = porDebajo.length > 0 ? porDebajo : aptos;
                if (pool.length === 0) return null;

                const minimo = Math.min(...pool.map(id => userCounters[id] ?? 0));
                const empatados = pool.filter(id => (userCounters[id] ?? 0) === minimo);
                return empatados[Math.floor(Math.random() * empatados.length)];
            };

            const asignar = id => {
                assignedUsers.add(id);
                userCounters[id] = (userCounters[id] ?? 0) + 1;
            };

            // 📌 Paso 1: Cubrir los cupos del feriado (1 rionegrino con cardio
            // + 2 neuquinos). Se ordena por cantidad de candidatos aptos para
            // resolver primero el cupo más difícil: así quien trabaja en ambas
            // provincias no se gasta en el cupo fácil y deja el otro vacío.
            const cuposOrdenados = [...CUPOS].sort((a, b) =>
                candidatos.filter(id => a.cumple(datos(id))).length -
                candidatos.filter(id => b.cumple(datos(id))).length
            );

            cuposOrdenados.forEach(cupo => {
                const elegido = elegirPara(cupo);
                if (elegido) {
                    asignar(elegido);
                } else {
                    faltantes.push(`${holidayName}: falta ${cupo.tipo === "rn-cardio" ? "un rionegrino que haga cardio" : "un neuquino"}`);
                }
            });

            // 📌 Paso 2: Si alguno de los asignados tiene pareja, sumarla en un
            // puesto extra. La pareja se agrega además de los cupos, no en
            // lugar de ellos, para no descubrir una provincia.
            Array.from(assignedUsers).forEach(id => {
                const parejaDe = pairings[nombre(id)];
                if (!parejaDe) return;

                const pareja = allUsers.find(u => u.username === parejaDe);
                if (!pareja || assignedUsers.has(pareja._id)) return;

                // Sólo si sigue siendo candidato (no está de vacaciones ni de licencia)
                if (!candidatos.includes(pareja._id)) {
                    faltantes.push(`${holidayName}: ${nombre(id)} quedó sin ${parejaDe}`);
                    return;
                }
                asignar(pareja._id);
            });

            // 📌 Paso 3: Volcar las asignaciones a los selects de la fila
            const finales = Array.from(assignedUsers);
            if (finales.length > selects.length) {
                faltantes.push(`${holidayName}: ${finales.length} asignados y sólo ${selects.length} lugares`);
            }
            selects.forEach((select, i) => {
                select.value = finales[i] || "";
            });

            console.log(`📌 ${holidayName}:`, finales.map(nombre).join(", "));
        });

        // 📌 Log del contador de asignaciones con usernames
        const userCounterWithNames = {};
        Object.keys(userCounters).forEach(userId => {
            userCounterWithNames[allUsers.find(u => u._id === userId)?.username || userId] = userCounters[userId];
        });
        console.log("📌 Contador de asignaciones finalizado:", userCounterWithNames);

        updateUserHolidayCountFromDOM();

        // 📌 Avisar de los cupos que quedaron sin cubrir, en lugar de dejar
        // selects vacíos sin explicación.
        if (faltantes.length > 0) {
            console.warn("⚠️ Cupos sin cubrir:", faltantes);
            toast.warning(`Quedaron asignaciones incompletas:\n${faltantes.join("\n")}`);
        }
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
