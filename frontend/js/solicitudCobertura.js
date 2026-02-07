import toast from './toast.js';

document.addEventListener('DOMContentLoaded', async function () {
    const apiUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : window.location.origin;
  
    const fechaInput = document.getElementById('fechaSolicitud');
    const usuarioSolicitanteInput = document.getElementById('usuarioSolicitante');
    const regimenSolicitanteInput = document.getElementById('regimenSolicitante');
    const usuarioCoberturaSelect = document.getElementById('usuarioCobertura');
    const regimenCoberturaInput = document.getElementById('regimenCobertura');
  
    flatpickr("#fechaSolicitud", {
      locale: "es",
      dateFormat: "d-m-Y",
      defaultDate: new Date(),
      onChange: async function (selectedDates) {
        const selectedDate = selectedDates[0];
        await cargarRegimenSolicitante(selectedDate);
        await cargarUsuariosDisponibles(selectedDate);
      }
    });
  
    let currentUser;
  
    // Obtener usuario actual desde /auth/profile
    try {
      const res = await fetch(`${apiUrl}/auth/profile`, {
        headers: {
          'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
        }
      });
  
      const data = await res.json();
  
      if (data.message) {
        toast.error(`Error: ${data.message}`);
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
      }
  
      currentUser = data;
      usuarioSolicitanteInput.value = currentUser.username;
  
      const today = flatpickr.parseDate(fechaInput.value, "d-m-Y");
      if (today) {
        await cargarRegimenSolicitante(today);
        await cargarUsuariosDisponibles(today);
      }
  
    } catch (err) {
      toast.error("Error al obtener usuario actual: " + err.message);
      setTimeout(() => window.location.href = 'login.html', 1500);
    }
  
    async function cargarRegimenSolicitante(date) {
      if (!currentUser || !date) return;
      const diaSemana = ["domingo", "monday", "tuesday", "wednesday", "thursday", "friday", "sabado"][date.getDay()];
      regimenSolicitanteInput.value = currentUser.workSchedule?.[diaSemana] || "No trabaja";
    }
  
    async function cargarUsuariosDisponibles(date) {
      const diaSemana = ["domingo", "monday", "tuesday", "wednesday", "thursday", "friday", "sabado"][date.getDay()];
  
      try {
        const res = await fetch(`${apiUrl}/auth/users`, {
          headers: {
            'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
          }
        });
  
        if (!res.ok) throw new Error("No se pudo cargar la lista de usuarios");
        const users = await res.json();
  
        usuarioCoberturaSelect.innerHTML = '';
  
        users
        .filter(u =>
          u._id !== currentUser._id &&
          u.username !== 'montes_esposito' && // 👈 EXCLUIDO
          u.workSchedule?.[diaSemana] &&
          u.workSchedule[diaSemana] !== 'No trabaja'
        )
        .forEach(user => {
          const option = document.createElement('option');
          option.value = user._id;
          option.textContent = `${user.username} (${user.email})`;
          option.dataset.regimen = user.workSchedule[diaSemana];
          usuarioCoberturaSelect.appendChild(option);
        });
      
  
        if (usuarioCoberturaSelect.options.length > 0) {
          usuarioCoberturaSelect.selectedIndex = 0;
          regimenCoberturaInput.value = usuarioCoberturaSelect.options[0].dataset.regimen;
        } else {
          regimenCoberturaInput.value = '';
        }
      } catch (err) {
        toast.error("Error al cargar usuarios disponibles: " + err.message);
      }
    }
  
    usuarioCoberturaSelect.addEventListener('change', () => {
      const selectedOption = usuarioCoberturaSelect.selectedOptions[0];
      regimenCoberturaInput.value = selectedOption?.dataset.regimen || '';
    });

    const form = document.getElementById('solicitud-form');

    form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fecha = flatpickr.parseDate(fechaInput.value, "d-m-Y");
    if (!fecha) {
        toast.error("Fecha inválida");
        return;
    }

    const body = {
        requestType: document.getElementById('tipoSolicitud').value,
        requestDate: fecha,
        requesterWorkScheme: regimenSolicitanteInput.value,
        substitute: usuarioCoberturaSelect.value,
        substituteWorkScheme: regimenCoberturaInput.value
    };

    try {
        const res = await fetch(`${apiUrl}/coverage-requests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
        },
        body: JSON.stringify(body)
        });

        if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error desconocido');
        }

        toast.success("Solicitud registrada exitosamente.");
        form.reset();
        flatpickr("#fechaSolicitud", { defaultDate: new Date() }); // vuelve a poner fecha de hoy
        regimenSolicitanteInput.value = '';
        regimenCoberturaInput.value = '';

    } catch (err) {
        toast.error("Error al registrar la solicitud: " + err.message);
    }
    });

  });
  
