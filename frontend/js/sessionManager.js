import { jwtDecode } from 'jwt-decode';

document.addEventListener('DOMContentLoaded', function() {
    const maxIdleTimePC = 2 * 60 * 60 * 1000; // 2 horas para PC
    let idleTime = 0;

    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    const maxIdleTime = isMobileDevice() ? Infinity : maxIdleTimePC;

    function resetIdleTimer() {
        if (maxIdleTime !== Infinity) {
            idleTime = 0;
            const sessionExpiry = Date.now() + maxIdleTime;
            sessionStorage.setItem('sessionExpiry', sessionExpiry);
            // console.log(`Idle timer reset. Session expiry set to: ${new Date(sessionExpiry).toUTCString()}`);
        }
    }

    function checkIdleTime() {
        if (maxIdleTime !== Infinity) {
            idleTime += 1000;
            const sessionExpiry = sessionStorage.getItem('sessionExpiry');
            // console.log(`Idle time incremented: ${idleTime}, sessionExpiry: ${sessionExpiry}`);
            if (idleTime >= maxIdleTime || (sessionExpiry && Date.now() > sessionExpiry)) {
                alert('Sesión expirada por inactividad.');
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
            // console.log(`Token expiry time: ${new Date(decodedToken.exp * 1000).toUTCString()}, Current time: ${new Date(currentTime * 1000).toUTCString()}`);
            return decodedToken.exp < currentTime;
        } catch (error) {
            console.error('Failed to decode token:', error.message);
            return true; // Si no se puede decodificar, se considera expirado
        }
    }

    // Verificar si el token está presente
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    // console.log('Token found:', token);

    if (!token) {
        alert('No has iniciado sesión.');
        window.location.href = 'login.html';
    } else if (isTokenExpired(token)) {
        alert('Tu sesión ha expirado.');
        window.location.href = 'login.html';
    } else {
        const sessionExpiry = sessionStorage.getItem('sessionExpiry');
        // console.log(`Initial session expiry from storage: ${sessionExpiry}`);
        if (sessionExpiry && Date.now() > sessionExpiry) {
            alert('Sesión expirada por inactividad.');
            window.location.href = 'login.html';
        } else {
            resetIdleTimer(); // Reiniciar el temporizador si todo está bien
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
