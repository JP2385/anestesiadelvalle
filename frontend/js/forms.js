document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adv-37d5b772f5fd.herokuapp.com';
    // Login form submission
    const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value.toLowerCase();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        try {
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                if (rememberMe) {
                    localStorage.setItem('token', data.token);
                } else {
                    sessionStorage.setItem('token', data.token);
                }
                alert('Inicio de sesión exitoso');
                window.location.href = 'index.html';
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            alert('Hubo un problema con la solicitud: ' + error.message);
        }
    });
}

    // Register form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                alert('Las contraseñas no coinciden.');
                return;
            }

            // Deshabilitar el botón para prevenir envíos múltiples
            const submitButton = registerForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;

            try {
                const response = await fetch(`${apiUrl}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });

                if (response.ok) {
                    alert('Registro exitoso, ahora puedes loguearte!');
                    window.location.href = 'login.html'; // Redirigir al usuario a la página de inicio de sesión
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message}`);
                }
            } catch (error) {
                alert('Hubo un problema con la solicitud: ' + error.message);
            } finally {
                // Rehabilitar el botón
                submitButton.disabled = false;
            }
        });
    }
    
    // Profile form submission
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        window.toggleChangePassword = function() {
            if (changePasswordForm.style.display === 'none' || changePasswordForm.style.display === '') {
                changePasswordForm.style.display = 'block';
            } else {
                changePasswordForm.style.display = 'none';
            }
        };

        window.confirmChangePassword = async function() {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                alert('Las nuevas contraseñas no coinciden.');
                return;
            }

            try {
                const response = await fetch(`${apiUrl}/auth/change-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                if (response.ok) {
                    alert('Contraseña cambiada exitosamente.');
                    toggleChangePassword();
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message}`);
                }
            } catch (error) {
                alert('Hubo un problema con la solicitud: ' + error.message);
            }
        };
    }

    // Recover password form submission
    const recoverForm = document.getElementById('recover-form');
    if (recoverForm) {
        recoverForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;

            try {
                const response = await fetch(`${apiUrl}/auth/recover-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                if (response.ok) {
                    alert('Correo de recuperación enviado. Revisa tu bandeja de entrada.');
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message}`);
                }
            } catch (error) {
                alert('Hubo un problema con la solicitud: ' + error.message);
            }
        });
    }

    // Reset password form submission
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                alert('Las nuevas contraseñas no coinciden.');
                return;
            }

            try {
                const response = await fetch(`${apiUrl}/auth/reset-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token, newPassword })
                });

                if (response.ok) {
                    alert('Contraseña restablecida exitosamente.');
                    window.location.href = 'login.html';
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message}`);
                }
            } catch (error) {
                alert('Hubo un problema con la solicitud: ' + error.message);
            }
        });
    }

    // Obtener y mostrar los datos del perfil del usuario
    const profileInfo = document.getElementById('profile-info');
    if (profileInfo) {
    
        fetch(`${apiUrl}/auth/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(`Error: ${data.message}`);
                window.location.href = 'login.html';
            } else {
                document.getElementById('profile-name').textContent = data.username;
                document.getElementById('profile-email').textContent = data.email;
                document.getElementById('doesCardio').textContent = data.doesCardio ? 'Sí' : 'No';
                document.getElementById('doesPediatrics').textContent = data.doesPediatrics ? 'Sí' : 'No';
                document.getElementById('doesRNM').textContent = data.doesRNM ? 'Sí' : 'No';
                document.getElementById('worksInPublicNeuquen').textContent = data.worksInPublicNeuquen ? 'Sí' : 'No';
                document.getElementById('worksInPrivateNeuquen').textContent = data.worksInPrivateNeuquen ? 'Sí' : 'No';
                document.getElementById('worksInPublicRioNegro').textContent = data.worksInPublicRioNegro ? 'Sí' : 'No';
                document.getElementById('worksInPrivateRioNegro').textContent = data.worksInPrivateRioNegro ? 'Sí' : 'No';
                document.getElementById('worksInCmacOnly').textContent = data.worksInCmacOnly ? 'Sí' : 'No';
                document.getElementById('workSchedule-monday').textContent = data.workSchedule.monday;
                document.getElementById('workSchedule-tuesday').textContent = data.workSchedule.tuesday;
                document.getElementById('workSchedule-wednesday').textContent = data.workSchedule.wednesday;
                document.getElementById('workSchedule-thursday').textContent = data.workSchedule.thursday;
                document.getElementById('workSchedule-friday').textContent = data.workSchedule.friday;
    
                // Llenar el formulario de vacaciones
                const vacationList = document.getElementById('vacation-list');
                vacationList.innerHTML = '';
                data.vacations.forEach(vacation => {
                    const li = document.createElement('li');
                    li.textContent = `Del ${vacation.startDate.split('T')[0]} al ${vacation.endDate.split('T')[0]}`;
                    vacationList.appendChild(li);
                });
            }
        })
        .catch(error => {
            alert('Hubo un problema con la solicitud: ' + error.message);
            window.location.href = 'login.html';
        });
    }
    

    // Toggle password visibility
    window.togglePasswordVisibility = function(inputId) {
        const passwordInput = document.getElementById(inputId);
        const passwordIcon = passwordInput.nextElementSibling;
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordIcon.textContent = '👁‍🗨';
        } else {
            passwordInput.type = 'password';
            passwordIcon.textContent = '👁️';
        }
    };

    // Function to go to main menu
    window.goToMainMenu = function() {
        window.location.href = 'index.html';
    };
});
