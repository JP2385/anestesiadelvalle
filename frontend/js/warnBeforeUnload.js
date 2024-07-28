// Define la variable global
let shouldWarn = true;

function warnBeforeUnload(event) {
    if (!shouldWarn) return; // Si shouldWarn es falso, no mostrar el mensaje

    const message = "Si cierra el asistente sin imprimir la programación perderá los cambios. Está seguro?";
    event.preventDefault(); // Para navegadores que soportan event.preventDefault()
    event.returnValue = message; // Para la mayoría de los navegadores modernos
    return message; // Para algunas versiones antiguas de Firefox
}

// Attach the event listener
window.addEventListener('beforeunload', warnBeforeUnload);

// Evento de click para el botón de imprimir
const printButton = document.getElementById('print-schedule');
printButton.addEventListener('click', () => {
    shouldWarn = false; // Desactivar la advertencia antes de imprimir
});
