document.addEventListener('DOMContentLoaded', function() {
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(event) {
            event.preventDefault();
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('sessionExpiry');
            window.location.href = 'login.html';
        });
    }
});
