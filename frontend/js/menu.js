import toast from './toast.js';

document.addEventListener('DOMContentLoaded', function() {
    // Menú hamburguesa
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const dropdownMenu = document.getElementById('dropdown-menu');

    hamburgerMenu.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que el evento se propague al documento
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' || dropdownMenu.style.display === '' ? 'block' : 'none';
    });

    // Cerrar sesión
    const logoutLink = document.getElementById('logout');
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Limpiar todos los datos de sesión
        localStorage.removeItem('token');
        localStorage.removeItem('keepSession');
        sessionStorage.removeItem('sessionExpiry');
        
        // Mensaje opcional para confirmar el logout
        toast.success('Cierre de sesión exitoso.');
        
        // Redirigir al usuario a la página de login
        setTimeout(() => window.location.href = 'login.html', 800);
    });

    // Cerrar menú al hacer clic fuera de él
    document.addEventListener('click', (e) => {
        if (dropdownMenu.style.display === 'block') {
            dropdownMenu.style.display = 'none';
        }
    });

    // Evitar el cierre del menú al hacer clic dentro de él
    dropdownMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});
