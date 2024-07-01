(function() {
    let idleTime = 0;
    const maxIdleTime = 3 * 60 * 60 * 1000; // 3 horas en milisegundos

    function resetIdleTimer() {
        idleTime = 0;
        // Actualizar el tiempo de expiración de la sesión en sessionStorage
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
})();
