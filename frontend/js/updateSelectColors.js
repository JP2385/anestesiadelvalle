import { getMortalCombatMode, getDailyMortalCombatMode } from './weekly-schedule-utils.js';

// Usuarios que mantienen sus restricciones incluso en modo Mortal Combat
const SPECIAL_USERS = ['bvalenti', 'jbo', 'montes_esposito'];

export function updateSelectColors(dayIndex, availability) {
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayName = dayNames[dayIndex];
    const scheduleBody = document.getElementById('schedule-body');
    const rows = scheduleBody.getElementsByTagName('tr');

    for (let row of rows) {
        const select = row.querySelectorAll('select')[dayIndex];
        if (select) {
            const selectedUserId = select.value;
            // Eliminar clases previas para evitar acumulación
            select.className = '';
    
            if (selectedUserId !== '') {
                // Obtener el horario de trabajo del usuario seleccionado
                const user = availability[dayName].find(user => user._id === selectedUserId || user.username === selectedUserId);
    
                // Agregar la clase assigned para usuarios asignados
                select.classList.add('assigned');
                
                // Asignar la clase CSS correspondiente al horario de trabajo
                if (user) {
                    const mortalCombatMode = getMortalCombatMode();
                    const isDailyMortalCombat = getDailyMortalCombatMode(dayName);
                    const isAnyMortalCombat = mortalCombatMode || isDailyMortalCombat;
                    const isSpecialUser = SPECIAL_USERS.includes(user.username);
                    
                    if (isAnyMortalCombat && !isSpecialUser) {
                        // En modo Mortal Combat (global o diario), usuarios normales usan el estilo de variable
                        select.classList.add('option-long');
                    } else {
                        // Usuarios especiales o modo normal mantienen sus estilos originales
                        if (user.workSchedule[dayName] === 'Mañana') {
                            select.classList.add('option-morning');
                        } else if (user.workSchedule[dayName] === 'Tarde') {
                            select.classList.add('option-afternoon');
                        } else if (user.workSchedule[dayName] === 'Variable') {
                            select.classList.add('option-long');
                        }
                    }
                }
            } else {
                // Si no hay usuario seleccionado, asignar la clase por defecto
                select.classList.add('default');
            }
        }
    }
}