document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com/';

    // Login form submission
    const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const username = document.getElementById('username').value.toLowerCase();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        // console.log(`Username: ${username}`);
        // console.log(`Remember me is checked: ${rememberMe}`);

        try {
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            // Verificar el tipo de contenido de la respuesta
            const contentType = response.headers.get('content-type');
            
            if (response.ok) {
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    // console.log('Login response:', data);
                    
                    if (rememberMe) {
                        localStorage.setItem('token', data.token); // Solo si selecciona "Recordar"
                        // console.log('Token saved in localStorage:', data.token);
                    } else {
                        sessionStorage.setItem('token', data.token); // Solo para la sesión actual
                        // console.log('Token saved in sessionStorage:', data.token);
                    }

                    alert('Inicio de sesión exitoso');
                    window.location.href = 'index.html';
                } else {
                    alert('Error: El servidor no respondió correctamente');
                }
            } else {
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.log('Error response:', errorData);
                    alert(`Error: ${errorData.message}`);
                } else {
                    alert(`Error: El servidor respondió con estado ${response.status}`);
                }
            }
        } catch (error) {
            console.log('Fetch error:', error.message);
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
                    window.location.href = 'login.html';
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message}`);
                }
            } catch (error) {
                alert('Hubo un problema con la solicitud: ' + error.message);
            } finally {
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
                        'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
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
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            alert('No se encontró el token de autenticación. Por favor, inicie sesión.');
            window.location.href = 'login.html';
            return;
        }

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

                const vacationList = document.getElementById('vacation-list');
                vacationList.innerHTML = '';
                data.vacations.forEach(vacation => {
                    const li = document.createElement('li');
                    li.textContent = `Del ${vacation.startDate.split('T')[0]} al ${vacation.endDate.split('T')[0]}`;
                    vacationList.appendChild(li);
                });

                const otherLeavesList = document.getElementById('other-leaves-list');
                    otherLeavesList.innerHTML = '';
                    (data.otherLeaves || []).forEach(leave => {
                        const li = document.createElement('li');
                        if (leave.startDate && leave.endDate) {
                            li.textContent = `${leave.type ? leave.type + ': ' : ''}Del ${leave.startDate.split('T')[0]} al ${leave.endDate.split('T')[0]}`;
                        } else if (leave.date) {
                            li.textContent = `${leave.type ? leave.type + ': ' : ''}${leave.date.split('T')[0]}`;
                        } else {
                            li.textContent = leave.type || 'Licencia sin fecha especificada';
                        }
                        otherLeavesList.appendChild(li);
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