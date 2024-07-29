document.addEventListener('DOMContentLoaded', function() {
    const maxIdleTime = 3 * 60 * 60 * 1000; // 3 horas en milisegundos
    let idleTime = 0;

    function resetIdleTimer() {
        idleTime = 0;
        sessionStorage.setItem('sessionExpiry', Date.now() + maxIdleTime);
    }

    function checkIdleTime() {
        idleTime += 1000;
        if (idleTime >= maxIdleTime) {
            alert('Sesión expirada por inactividad.');
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('sessionExpiry');
            window.location.href = 'login.html';
            return; // Asegúrate de que el script no continúe ejecutándose
        }
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!token) {
        alert('No has iniciado sesión.');
        localStorage.removeItem('token');  // Asegúrate de limpiar cualquier token residual
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('sessionExpiry');
        window.location.href = 'login.html';
        return; // Asegúrate de que el script no continúe ejecutándose
    } else {
        const sessionExpiry = sessionStorage.getItem('sessionExpiry');
        if (sessionExpiry && Date.now() > sessionExpiry) {
            alert('Sesión expirada por inactividad.');
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('sessionExpiry');
            window.location.href = 'login.html';
            return; // Asegúrate de que el script no continúe ejecutándose
        } else {
            resetIdleTimer(); // Inicializar el tiempo de expiración de la sesión
        }
    }

    // Eventos para reiniciar el temporizador de inactividad
    window.onload = resetIdleTimer;
    document.onmousemove = resetIdleTimer;
    document.onkeypress = resetIdleTimer;
    document.onclick = resetIdleTimer;
    document.onscroll = resetIdleTimer;
    document.onkeydown = resetIdleTimer;

    // Verificar el tiempo de inactividad cada segundo
    setInterval(checkIdleTime, 1000);
});
