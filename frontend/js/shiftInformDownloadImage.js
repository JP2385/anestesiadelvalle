export function downloadTableAsImage() {
    const container = document.getElementById('schedule-for-print');
    const downloadButton = document.getElementById('download-button');
    
    // Oculta el botón de descarga si está dentro del contenedor a capturar
    if (downloadButton) downloadButton.style.display = 'none';

    // Crear un clon del contenedor de impresión
    const containerClone = container.cloneNode(true);
    containerClone.style.width = '1290px';
    containerClone.style.paddingRight = '20px';
    containerClone.style.display = 'block';
    containerClone.style.overflow = 'visible';
    containerClone.style.boxSizing = 'border-box';

    // Crear un div temporal y agregar el clon al DOM para captura
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.opacity = '0'; // Ocultar visualmente
    tempDiv.style.pointerEvents = 'none'; // Desactivar la interacción
    tempDiv.appendChild(containerClone);
    document.body.appendChild(tempDiv);

    // Usa html2canvas para capturar el contenedor clonado
    html2canvas(containerClone, { width: 1290, scrollX: 0, scrollY: 0, scale: 3 }).then(canvas => {
        // Remueve el clon temporal después de la captura
        document.body.removeChild(tempDiv);

        // Restaura la visibilidad del botón de descarga
        if (downloadButton) downloadButton.style.display = 'block';

        // Crear un enlace para descargar la imagen
        const link = document.createElement('a');
        link.download = 'programacion-mensual.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}
