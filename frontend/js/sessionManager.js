import { jwtDecode } from 'jwt-decode';
import toast from './toast.js';

document.addEventListener('DOMContentLoaded', function() {
    const maxIdleTimePC = 3 * 60 * 60 * 1000; // 3 horas para PC
    let idleTime = 0;

    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    // Verificar si el token está en sessionStorage (sin "mantener sesión")
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const isTemporarySession = !localStorage.getItem('token') && sessionStorage.getItem('token');
    
    // Solo aplicar timeout si es sesión temporal y en PC
    const maxIdleTime = (isMobileDevice() || !isTemporarySession) ? Infinity : maxIdleTimePC;

    function resetIdleTimer() {
        if (maxIdleTime !== Infinity) {
            idleTime = 0; // Reinicia el temporizador de inactividad
            const sessionExpiry = Date.now() + maxIdleTime; // Define el tiempo de expiración
            sessionStorage.setItem('sessionExpiry', sessionExpiry);
            // console.log(`Idle timer reset. Session expiry set to: ${new Date(sessionExpiry).toUTCString()}`);
        }
    }

    function checkIdleTime() {
        if (maxIdleTime !== Infinity) {
            idleTime += 1000; // Incrementar cada segundo
            const sessionExpiry = sessionStorage.getItem('sessionExpiry');
            // console.log('Idle time:', idleTime, 'Session expiry:', new Date(parseInt(sessionExpiry)).toUTCString());
            if (idleTime >= maxIdleTime || (sessionExpiry && Date.now() > sessionExpiry)) {
                toast.warning('Sesión expirada por inactividad.');
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('sessionExpiry');
                setTimeout(() => window.location.href = 'login.html', 1500);
                return;
            }
        }
    }

    function isTokenExpired(token) {
        try {
            const decodedToken = jwtDecode(token);
            const currentTime = Date.now() / 1000;
            // console.log(`Token expiry time: ${decodedToken.exp}, Current time: ${currentTime}`);
            return decodedToken.exp < currentTime;
        } catch (error) {
            console.error('Failed to decode token:', error.message);
            return true; // Si no se puede decodificar, se considera expirado
        }
    }

    // Verificar si el token está presente
    if (!token) {
        // Si no hay token, redirigir sin toast
        window.location.href = 'login.html';
        return;
    } else if (isTokenExpired(token)) {
        // Si el token expiró, limpiar y redirigir sin toast
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('sessionExpiry');
        window.location.href = 'login.html';
        return;
    } else {
        const sessionExpiry = sessionStorage.getItem('sessionExpiry');
        const currentTime = Date.now();

        if (sessionExpiry && currentTime > sessionExpiry) {
            toast.warning('Sesión expirada por inactividad.');
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('sessionExpiry');
            setTimeout(() => window.location.href = 'login.html', 1500);
        } else {
            resetIdleTimer(); // Reiniciar el temporizador si todo está bien
        }
    }

    // Eventos que reinician el temporizador de inactividad
    if (maxIdleTime !== Infinity) {
        window.onload = resetIdleTimer;
        document.onmousemove = resetIdleTimer;
        document.onkeypress = resetIdleTimer;
        document.onclick = resetIdleTimer;
        document.onscroll = resetIdleTimer;
        document.onkeydown = resetIdleTimer;
        setInterval(checkIdleTime, 1000); // Comprobación cada segundo
    }
});
