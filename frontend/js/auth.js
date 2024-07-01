document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!token) {
        // Redirigir al login si no está autenticado
        window.location.href = 'login.html';
    } else {
        // Verificar si el token en sessionStorage ha expirado (para sesiones en PC)
        const sessionExpiry = sessionStorage.getItem('sessionExpiry');
        if (sessionExpiry && Date.now() > sessionExpiry) {
            // Token expirado
            alert('Sesión expirada por inactividad.');
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('sessionExpiry');
            window.location.href = 'login.html';
        } else {
            // Actualizar el tiempo de expiración de la sesión en sessionStorage
            sessionStorage.setItem('sessionExpiry', Date.now() + 3 * 60 * 60 * 1000); // 3 horas
        }
    }
});
