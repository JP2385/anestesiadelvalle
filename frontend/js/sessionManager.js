import { jwtDecode } from 'jwt-decode';

document.addEventListener('DOMContentLoaded', function() {
    const maxIdleTimePC = 1 * 60 * 60 * 1000; 
    let idleTime = 0;

    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    const maxIdleTime = isMobileDevice() ? Infinity : maxIdleTimePC;
    console.log(`Max idle time set to: ${maxIdleTime}`);

    function resetIdleTimer() {
        if (maxIdleTime !== Infinity) { // Solo reiniciar el temporizador en PC
            idleTime = 0;
            sessionStorage.setItem('sessionExpiry', Date.now() + maxIdleTime);
            console.log(`Idle timer reset. Session expiry set to: ${Date.now() + maxIdleTime}`);
        }
    }

    function checkIdleTime() {
        if (maxIdleTime !== Infinity) { // Solo verificar el tiempo de inactividad en PC
            idleTime += 1000;
            console.log(`Idle time incremented: ${idleTime}`);
            if (idleTime >= maxIdleTime) {
                alert('Sesión expirada por inactividad.');
                console.log('Session expired due to inactivity.');
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
            const decodedToken = jwtDecode(token); // Usar jwtDecode del paquete
            const currentTime = Date.now() / 1000;
            console.log(`Token expiry time: ${decodedToken.exp}, Current time: ${currentTime}`);
            return decodedToken.exp < currentTime;
        } catch (error) {
            console.error('Failed to decode token:', error.message);
            console.error('Token:', token); // Agregar detalles del token para depuración
            return true; // Consider the token expired if it cannot be decoded
        }
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log('Token found:', token);

    if (!token) {
        alert('No has iniciado sesión.');
        console.log('No token found. Redirecting to login.');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('sessionExpiry');
        window.location.href = 'login.html';
    } else if (isTokenExpired(token)) {
        alert('Tu sesión ha expirado.');
        console.log('Token expired. Redirecting to login.');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('sessionExpiry');
        window.location.href = 'login.html';
    } else {
        const sessionExpiry = sessionStorage.getItem('sessionExpiry');
        console.log(`Session expiry from storage: ${sessionExpiry}`);

        if (sessionExpiry && Date.now() > sessionExpiry) {
            alert('Sesión expirada por inactividad.');
            console.log('Session expired due to inactivity from storage.');
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
