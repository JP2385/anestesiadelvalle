import { captureAndSave } from './saveCanvasImage.js';

export async function downloadTableAsImage() {
    const container = document.getElementById('schedule-for-print');
    const downloadButton = document.getElementById('download-button');

    if (downloadButton) downloadButton.disabled = true;

    try {
        await captureAndSave(container, 'programacion-mensual.png', {
            // El botón se oculta en el clon, no en la página visible.
            beforeCapture: (clone) => {
                const clonedButton = clone.querySelector('#download-button');
                if (clonedButton) clonedButton.style.display = 'none';
            }
        });
    } catch {
        // captureAndSave ya avisó al usuario.
    } finally {
        if (downloadButton) downloadButton.disabled = false;
    }
}
