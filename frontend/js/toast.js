// Sistema de notificaciones Toast
class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Crear el contenedor si no existe
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            // Asegurar que el body existe antes de append
            if (document.body) {
                document.body.appendChild(this.container);
            } else {
                // Si el body no existe aún, esperar a que el DOM esté listo
                document.addEventListener('DOMContentLoaded', () => {
                    if (!document.querySelector('.toast-container')) {
                        document.body.appendChild(this.container);
                    }
                });
            }
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    ensureContainer() {
        // Asegurar que el contenedor existe cada vez que se usa
        if (!this.container || !document.body.contains(this.container)) {
            this.init();
        }
    }

    show(message, type = 'info', duration = 4000) {
        this.ensureContainer(); // Verificar contenedor antes de usar
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">${message}</div>
            <button class="toast-close" aria-label="Cerrar">×</button>
        `;

        this.container.appendChild(toast);

        // Cerrar al hacer clic en la X
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.hide(toast));

        // Auto-cerrar después de la duración especificada
        if (duration > 0) {
            setTimeout(() => this.hide(toast), duration);
        }

        return toast;
    }

    hide(toast) {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 4500) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    // Función para reemplazar confirm()
    confirm(message, onConfirm, onCancel) {
        this.ensureContainer(); // Verificar contenedor antes de usar
        
        const toast = document.createElement('div');
        toast.className = 'toast toast-confirm';

        toast.innerHTML = `
            <div class="toast-message">${message}</div>
            <div class="toast-buttons">
                <button class="toast-btn toast-btn-cancel">Cancelar</button>
                <button class="toast-btn toast-btn-confirm">Confirmar</button>
            </div>
        `;

        this.container.appendChild(toast);

        const cancelBtn = toast.querySelector('.toast-btn-cancel');
        const confirmBtn = toast.querySelector('.toast-btn-confirm');

        cancelBtn.addEventListener('click', () => {
            this.hide(toast);
            if (onCancel) onCancel();
        });

        confirmBtn.addEventListener('click', () => {
            this.hide(toast);
            if (onConfirm) onConfirm();
        });

        return toast;
    }
}

// Crear instancia global
const toast = new ToastManager();

// Exportar para uso en módulos
export default toast;
