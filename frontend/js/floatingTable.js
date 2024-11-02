export function initializeFloatingTable() {
    const toggleSwitch = document.getElementById('toggle-table');
    const floatingTable = document.getElementById('floating-table');
    const closeButton = document.getElementById('close-table');

    // Mostrar la tabla flotante cuando el switch está activado
    toggleSwitch.addEventListener('change', () => {
        if (toggleSwitch.checked) {
            floatingTable.style.display = 'block';
        } else {
            floatingTable.style.display = 'none';
        }
    });

    // Cerrar la tabla y desactivar el switch al hacer clic en la cruz
    closeButton.addEventListener('click', () => {
        floatingTable.style.display = 'none';
        toggleSwitch.checked = false; // Desactiva el switch
    });
}
