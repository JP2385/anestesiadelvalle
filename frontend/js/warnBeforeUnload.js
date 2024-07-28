function warnBeforeUnload(event) {
    const message = "Si cierra el asistente sin imprimir la programación perderá los cambios. Está seguro?";
    event.preventDefault(); // Para navegadores que soportan event.preventDefault()
    event.returnValue = message; // Para la mayoría de los navegadores modernos
    return message; // Para algunas versiones antiguas de Firefox
}

// Attach the event listener
window.addEventListener('beforeunload', warnBeforeUnload);
