import toast from './toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  const apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://anestesiadelvalle.ar';

  const yearSelect = document.getElementById('year');
  const userSelect = document.getElementById('user');
  const reportBody = document.getElementById('report-body');
  const regimenSolicitanteSelect = document.getElementById('regimenSolicitante');
const regimenReemplazanteSelect = document.getElementById('regimenReemplazante');


  let coverageData = [];
  let allUsers = [];

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  // Fetch de usuarios para el filtro
  const fetchUsers = async () => {
    const res = await fetch(`${apiUrl}/auth/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    allUsers = await res.json();

    userSelect.innerHTML = '<option value="">Todos</option>';
    allUsers.forEach(user => {
      const option = document.createElement('option');
      option.value = user._id;
      option.textContent = user.username;
      userSelect.appendChild(option);
    });
  };

  // Fetch de coberturas
  const fetchCoverages = async () => {
    const res = await fetch(`${apiUrl}/coverage-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    coverageData = await res.json();
  };

  // Mostrar los datos en tabla
  const renderTable = () => {
    const selectedYear = yearSelect.value;
    const selectedUser = userSelect.value;

    reportBody.innerHTML = '';

    const filtered = coverageData
    .filter(entry => {
      const date = new Date(entry.requestDate);
      const yearMatch = !selectedYear || date.getFullYear().toString() === selectedYear;
      const userMatch = !selectedUser || entry.requester._id === selectedUser || entry.substitute._id === selectedUser;
      const regimenSolicitanteMatch = !regimenSolicitanteSelect.value || entry.requesterWorkScheme === regimenSolicitanteSelect.value;
      const regimenReemplazanteMatch = !regimenReemplazanteSelect.value || entry.substituteWorkScheme === regimenReemplazanteSelect.value;
      return yearMatch && userMatch && regimenSolicitanteMatch && regimenReemplazanteMatch;
    })
    .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
  

    filtered.forEach(entry => {
      const row = document.createElement('tr');
      const formatDate = new Date(entry.requestDate).toLocaleDateString('es-AR');

      row.innerHTML = `
        <td>${capitalize(entry.requestType)}</td>
        <td>${formatDate}</td>
        <td>${entry.requester.username}</td>
        <td>${entry.requesterWorkScheme}</td>
        <td>${entry.substitute.username}</td>
        <td>${entry.substituteWorkScheme}</td>
      `;

      reportBody.appendChild(row);
    });
  };

  const populateYears = () => {
    const years = [...new Set(coverageData.map(c => new Date(c.requestDate).getFullYear()))].sort();
    yearSelect.innerHTML = '<option value="">Todos</option>';
    years.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });
  };

  const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

  // Eventos de filtros
  yearSelect.addEventListener('change', renderTable);
  userSelect.addEventListener('change', renderTable);
  regimenSolicitanteSelect.addEventListener('change', renderTable);
regimenReemplazanteSelect.addEventListener('change', renderTable);


  try {
    await fetchUsers();
    await fetchCoverages();
    populateYears();
    renderTable();
  } catch (err) {
    toast.error("Error al cargar datos: " + err.message);
  }
});
