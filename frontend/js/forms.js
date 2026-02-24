import toast from './toast.js';

document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;

    // Login form submission
    const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const username = document.getElementById('username').value.toLowerCase();
        const password = document.getElementById('password').value;
        const keepSession = document.getElementById('keep-session').checked;

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
                    
                    if (keepSession) {
                        localStorage.setItem('token', data.token); // Persiste después de cerrar el navegador
                    } else {
                        sessionStorage.setItem('token', data.token); // Se elimina al cerrar el navegador
                    }

                    toast.success('Inicio de sesión exitoso');
                    setTimeout(() => window.location.href = 'index.html', 800);
                } else {
                    toast.error('Error: El servidor no respondió correctamente');
                }
            } else {
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.log('Error response:', errorData);
                    toast.error(`Error: ${errorData.message}`);
                } else {
                    toast.error(`Error: El servidor respondió con estado ${response.status}`);
                }
            }
        } catch (error) {
            console.log('Fetch error:', error.message);
            toast.error('Hubo un problema con la solicitud: ' + error.message);
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
                toast.warning('Las contraseñas no coinciden.');
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
                    toast.success('Registro exitoso, ahora puedes loguearte!');
                    setTimeout(() => window.location.href = 'login.html', 1500);
                } else {
                    const errorData = await response.json();
                    toast.error(`Error: ${errorData.message}`);
                }
            } catch (error) {
                toast.error('Hubo un problema con la solicitud: ' + error.message);
            } finally {
                submitButton.disabled = false;
            }
        });
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
                    toast.success('Correo de recuperación enviado. Revisa tu bandeja de entrada.');
                } else {
                    const errorData = await response.json();
                    toast.error(`Error: ${errorData.message}`);
                }
            } catch (error) {
                toast.error('Hubo un problema con la solicitud: ' + error.message);
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
                toast.warning('Las nuevas contraseñas no coinciden.');
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
                    toast.success('Contraseña restablecida exitosamente.');
                    setTimeout(() => window.location.href = 'login.html', 1500);
                } else {
                    const errorData = await response.json();
                    toast.error(`Error: ${errorData.message}`);
                }
            } catch (error) {
                toast.error('Hubo un problema con la solicitud: ' + error.message);
            }
        });
    }

    // Obtener y mostrar los datos del perfil del usuario
    const profileInfo = document.getElementById('profile-info');
    if (profileInfo) {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            toast.warning('No se encontró el token de autenticación. Por favor, inicie sesión.');
            setTimeout(() => window.location.href = 'login.html', 1500);
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
                toast.error(`Error: ${data.message}`);
                setTimeout(() => window.location.href = 'login.html', 1500);
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
            toast.error('Hubo un problema con la solicitud: ' + error.message);
            setTimeout(() => window.location.href = 'login.html', 1500);
        });
    }

    // Toggle password visibility with event delegation (safer approach)
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('toggle-password')) {
            const targetId = event.target.getAttribute('data-target');
            if (targetId) {
                const passwordInput = document.getElementById(targetId);
                if (passwordInput) {
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        event.target.textContent = '👁‍🗨';
                    } else {
                        passwordInput.type = 'password';
                        event.target.textContent = '👁️';
                    }
                }
            }
        }
    });

    // Profile page - Toggle change password form
    const toggleChangePasswordBtn = document.getElementById('toggle-change-password-btn');
    if (toggleChangePasswordBtn) {
        toggleChangePasswordBtn.addEventListener('click', function() {
            const form = document.getElementById('change-password-form');
            if (form) {
                if (form.style.display === 'none' || form.style.display === '') {
                    form.style.display = 'block';
                } else {
                    form.style.display = 'none';
                }
            }
        });
    }

    // Profile page - Confirm change password
    const confirmChangePasswordBtn = document.getElementById('confirm-change-password-btn');
    if (confirmChangePasswordBtn) {
        confirmChangePasswordBtn.addEventListener('click', async function() {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                toast.warning('Las nuevas contraseñas no coinciden.');
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
                    toast.success('Contraseña cambiada exitosamente.');
                    const form = document.getElementById('change-password-form');
                    if (form) form.style.display = 'none';
                } else {
                    const errorData = await response.json();
                    toast.error(`Error: ${errorData.message}`);
                }
            } catch (error) {
                toast.error('Hubo un problema con la solicitud: ' + error.message);
            }
        });
    }

    // Main menu button
    const mainMenuBtn = document.getElementById('main-menu-btn');
    if (mainMenuBtn) {
        mainMenuBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }

    // Legacy support for functions called from other places
    window.goToMainMenu = function() {
        window.location.href = 'index.html';
    };
});
