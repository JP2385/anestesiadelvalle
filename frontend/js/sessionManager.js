import { jwtDecode } from 'jwt-decode';

document.addEventListener('DOMContentLoaded', function() {
    const maxIdleTimePC = 10 * 60 * 1000; // 2 horas en milisegundos
    let idleTime = 0;

    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    const maxIdleTime = isMobileDevice() ? Infinity : maxIdleTimePC;

    function resetIdleTimer() {
        if (maxIdleTime !== Infinity) { // Solo reiniciar el temporizador en PC
            idleTime = 0;
            sessionStorage.setItem('sessionExpiry', Date.now() + maxIdleTime);
        }
    }

    function checkIdleTime() {
        if (maxIdleTime !== Infinity) { // Solo verificar el tiempo de inactividad en PC
            idleTime += 1000;
            if (idleTime >= maxIdleTime) {
                alert('Sesión expirada por inactividad.');
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('sessionExpiry');
                window.location.href = 'login.html';
                return;
            }
        }
    }

    function isTokenExpired(token) {
        try {
            const decodedToken = jwtDecode(token);
            const currentTime = Date.now() / 1000;
            return decodedToken.exp < currentTime;
        } catch (error) {
            console.error('Failed to decode token:', error.message);
            console.error('Token:', token); // Agregar detalles del token para depuración
            return true; // Consider the token expired if it cannot be decoded
        }
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!token) {
        alert('No has iniciado sesión.');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('sessionExpiry');
        window.location.href = 'login.html';
    } else if (isTokenExpired(token)) {
        alert('Tu sesión ha expirado.');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('sessionExpiry');
        window.location.href = 'login.html';
    } else {
        const sessionExpiry = sessionStorage.getItem('sessionExpiry');

        if (sessionExpiry && Date.now() > sessionExpiry) {
            alert('Sesión expirada por inactividad.');
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('sessionExpiry');
            window.location.href = 'login.html';
        } else {
            resetIdleTimer();
        }
    }

    if (maxIdleTime !== Infinity) {
        window.onload = resetIdleTimer;
        document.onmousemove = resetIdleTimer;
        document.onkeypress = resetIdleTimer;
        document.onclick = resetIdleTimer;
        document.onscroll = resetIdleTimer;
        document.onkeydown = resetIdleTimer;
        setInterval(checkIdleTime, 1000);
    }
});
