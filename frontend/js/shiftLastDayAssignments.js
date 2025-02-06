// Obtener el último día del mes anterior
            function getLastDayOfPreviousMonth(selectedYear, selectedMonth) {
                const date = new Date(selectedYear, selectedMonth, 0); // Día 0 del mes actual es el último del anterior
                return date.toISOString().slice(0, 10); // Formato YYYY-MM-DD
            }

            // Función para obtener las asignaciones del último día del mes anterior
               export async function fetchLastDayAssignments(selectedYear, selectedMonth) {
                const lastDay = getLastDayOfPreviousMonth(selectedYear, selectedMonth);
                const previousYearMonth = `${lastDay.split('-')[0]}-${lastDay.split('-')[1]}`; // Formato YYYY-MM

                const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://https://advalle-46fc1873b63d.herokuapp.com';

                try {
                    // Cargar el horario del mes completo
                    const response = await fetch(`${apiUrl}/shift-schedule/${previousYearMonth}`);
                    if (response.ok) {
                        const scheduleData = await response.json();
                        
                        // Filtrar solo las asignaciones del último día del mes
                        const lastDayAssignments = scheduleData.selectConfig.filter(entry => entry.day === lastDay);
                        console.log(`Asignaciones para el último día del mes anterior (${lastDay}):`, lastDayAssignments);
                        
                        return lastDayAssignments;
                    } else {
                        console.error('Error al cargar el horario del mes anterior:', response.statusText);
                        return null;
                    }
                } catch (error) {
                    console.error('Error en la solicitud de asignaciones del último día:', error);
                    return null;
                }
            }