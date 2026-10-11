// Captura un contenedor con html2canvas y entrega la imagen al usuario.
// iOS/Safari ignora el atributo `download` y limita el tamaño de canvas, así que
// el guardado se hace por Web Share API o abriendo la imagen en una pestaña.

const IOS_MAX_CANVAS_PIXELS = 16777216; // tope práctico de Safari en iOS (~16.7M px)

function isIOS() {
    // iPadOS 13+ se identifica como Mac, se detecta por soporte táctil
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Baja la escala hasta que el canvas entre en el límite de memoria de iOS
function safeScale(width, height, desiredScale) {
    if (!isIOS()) return desiredScale;

    let scale = desiredScale;
    while (scale > 1 && width * scale * height * scale > IOS_MAX_CANVAS_PIXELS) {
        scale -= 0.5;
    }
    return Math.max(scale, 1);
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        if (canvas.toBlob) {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas vacío')), 'image/png');
        } else {
            reject(new Error('toBlob no soportado'));
        }
    });
}

// Abre la imagen en una pestaña nueva para que el usuario la guarde con long-press.
// La pestaña se abre antes del trabajo asíncrono para no perder el gesto del usuario.
function openInTab(blob, popup) {
    const url = URL.createObjectURL(blob);
    const target = popup && !popup.closed ? popup : window.open('', '_blank');

    if (!target) {
        URL.revokeObjectURL(url);
        return false;
    }

    target.document.write(
        `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>Programación</title>` +
        `<style>body{margin:0;background:#111;color:#fff;font-family:system-ui,sans-serif;text-align:center}` +
        `p{padding:12px;font-size:15px;margin:0}img{max-width:100%;height:auto;display:block}</style>` +
        `<p>Mantené presionada la imagen y elegí “Guardar en Fotos”.</p>` +
        `<img src="${url}">`
    );
    target.document.close();
    return true;
}

/**
 * Captura `container` y ofrece la imagen resultante al usuario.
 *
 * @param {HTMLElement} container        elemento a capturar
 * @param {string}      filename         nombre del archivo
 * @param {object}      [options]
 * @param {number}      [options.width=1290]
 * @param {number}      [options.scale=3]
 * @param {function}    [options.beforeCapture]  recibe el clon antes de capturarlo
 */
export async function captureAndSave(container, filename, options = {}) {
    const { width = 1290, scale = 3, beforeCapture } = options;

    if (typeof html2canvas !== 'function') {
        alert('No se pudo cargar el generador de imágenes. Revisá tu conexión y recargá la página.');
        throw new Error('html2canvas no disponible');
    }

    // En iOS la hoja de compartir y window.open requieren gesto del usuario.
    // Se abre la pestaña ya acá y se rellena después de la captura.
    const needsPopup = isIOS() && typeof navigator.canShare !== 'function';
    const popup = needsPopup ? window.open('', '_blank') : null;

    const containerClone = container.cloneNode(true);
    containerClone.style.width = `${width}px`;
    containerClone.style.paddingRight = '20px';
    containerClone.style.display = 'block';
    containerClone.style.overflow = 'visible';
    containerClone.style.boxSizing = 'border-box';

    if (beforeCapture) beforeCapture(containerClone);

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-10000px';
    tempDiv.style.top = '0';
    tempDiv.style.pointerEvents = 'none';
    tempDiv.appendChild(containerClone);
    document.body.appendChild(tempDiv);

    try {
        const height = containerClone.scrollHeight || containerClone.offsetHeight;
        const canvas = await html2canvas(containerClone, {
            width,
            scrollX: 0,
            scrollY: 0,
            scale: safeScale(width, height, scale),
            backgroundColor: '#ffffff',
            useCORS: true
        });

        const blob = await canvasToBlob(canvas);

        // 1) Web Share API con archivo: abre la hoja nativa de iOS
        //    ("Guardar en Fotos" / "Guardar en Archivos").
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file] });
                if (popup && !popup.closed) popup.close();
                return;
            } catch (err) {
                // El usuario canceló la hoja de compartir: no hay nada más que hacer.
                if (err.name === 'AbortError') {
                    if (popup && !popup.closed) popup.close();
                    return;
                }
                // Cualquier otro error cae al siguiente método.
            }
        }

        // 2) Descarga normal vía blob URL (escritorio y Android).
        const supportsDownload = 'download' in document.createElement('a') && !isIOS();
        if (supportsDownload) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            if (popup && !popup.closed) popup.close();
            return;
        }

        // 3) iOS sin Web Share: mostrar la imagen para guardarla con long-press.
        if (!openInTab(blob, popup)) {
            alert('No se pudo abrir la imagen. Permití las ventanas emergentes para este sitio e intentá de nuevo.');
        }
    } catch (error) {
        if (popup && !popup.closed) popup.close();
        console.error('Error al generar la imagen:', error);
        alert('No se pudo generar la imagen. Intentá de nuevo.');
        throw error;
    } finally {
        if (tempDiv.parentNode) document.body.removeChild(tempDiv);
    }
}
