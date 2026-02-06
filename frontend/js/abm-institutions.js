import toast from './toast.js';

document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com';

    const createInstitutionForm = document.getElementById('create-institution-form');
    const editInstitutionForm = document.getElementById('edit-institution-form');
    const institutionsTableBody = document.getElementById('institutions-table-body');
    const searchInput = document.getElementById('search-institution');
    const filterProvince = document.getElementById('filter-province');
    const filterSector = document.getElementById('filter-sector');
    const editModal = document.getElementById('edit-modal');
    const closeModal = document.querySelector('.close');

    let allInstitutions = [];

    // Cargar instituciones al inicio
    loadInstitutions();

    // Crear nueva institución
    createInstitutionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const institutionData = {
            name: document.getElementById('new-name').value,
            province: document.getElementById('new-province').value,
            sector: document.getElementById('new-sector').value,
            hasShifts: document.getElementById('new-hasShifts').checked,
            isActive: document.getElementById('new-isActive').checked
        };

        try {
            const response = await fetch(`${apiUrl}/institutions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify(institutionData)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || 'Institución creada exitosamente');
                createInstitutionForm.reset();
                loadInstitutions();
            } else {
                toast.error(`Error: ${data.message}`);
            }
        } catch (error) {
            toast.error('Hubo un problema al crear la institución: ' + error.message);
        }
    });

    // Buscar y filtrar instituciones
    searchInput.addEventListener('input', applyFilters);
    filterProvince.addEventListener('change', applyFilters);
    filterSector.addEventListener('change', applyFilters);

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const provinceFilter = filterProvince.value;
        const sectorFilter = filterSector.value;

        const filteredInstitutions = allInstitutions.filter(institution => {
            const matchesSearch = institution.name.toLowerCase().includes(searchTerm);
            const matchesProvince = !provinceFilter || institution.province === provinceFilter;
            const matchesSector = !sectorFilter || institution.sector === sectorFilter;

            return matchesSearch && matchesProvince && matchesSector;
        });

        renderInstitutions(filteredInstitutions);
    }

    // Cerrar modal
    closeModal.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });

    // Editar institución
    editInstitutionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const institutionId = document.getElementById('edit-institution-id').value;
        const updateData = {
            name: document.getElementById('edit-name').value,
            province: document.getElementById('edit-province').value,
            sector: document.getElementById('edit-sector').value,
            hasShifts: document.getElementById('edit-hasShifts').checked,
            isActive: document.getElementById('edit-isActive').checked
        };

        try {
            const response = await fetch(`${apiUrl}/institutions/${institutionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || 'Institución actualizada exitosamente');
                editModal.style.display = 'none';
                loadInstitutions();
            } else {
                toast.error(`Error: ${data.message}`);
            }
        } catch (error) {
            toast.error('Hubo un problema al actualizar la institución: ' + error.message);
        }
    });

    // Cargar lista de instituciones
    async function loadInstitutions() {
        try {
            const response = await fetch(`${apiUrl}/institutions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });

            const data = await response.json();

            if (response.ok) {
                allInstitutions = data.institutions;
                renderInstitutions(allInstitutions);
            } else {
                toast.error(`Error: ${data.message}`);
            }
        } catch (error) {
            toast.error('Hubo un problema al cargar las instituciones: ' + error.message);
        }
    }

    // Renderizar instituciones en la tabla
    function renderInstitutions(institutions) {
        institutionsTableBody.innerHTML = '';

        if (institutions.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" style="text-align: center; padding: 20px;">No se encontraron instituciones</td>`;
            institutionsTableBody.appendChild(row);
            return;
        }

        institutions.forEach(institution => {
            const row = document.createElement('tr');

            const provinceBadgeClass = institution.province === 'Neuquén' ? 'badge-neuquen' : 'badge-rionegro';
            const sectorBadgeClass = institution.sector === 'Sector Público' ? 'badge-publico' : 'badge-privado';
            const hasShiftsText = institution.hasShifts ? '✓ Sí' : '✗ No';
            const hasShiftsStyle = institution.hasShifts ? 'color: green; font-weight: bold;' : 'color: #999;';
            const isActiveText = institution.isActive ? '✓ Activa' : '✗ Inactiva';
            const isActiveStyle = institution.isActive ? 'color: green; font-weight: bold;' : 'color: #dc3545; font-weight: bold;';

            row.innerHTML = `
                <td>${institution.name}</td>
                <td><span class="badge ${provinceBadgeClass}">${institution.province}</span></td>
                <td><span class="badge ${sectorBadgeClass}">${institution.sector}</span></td>
                <td style="${hasShiftsStyle}">${hasShiftsText}</td>
                <td style="${isActiveStyle}">${isActiveText}</td>
                <td>
                    <button class="action-btn edit-btn" data-id="${institution._id}">Editar</button>
                    <button class="action-btn delete-btn" data-id="${institution._id}">Eliminar</button>
                </td>
            `;

            institutionsTableBody.appendChild(row);
        });

        // Agregar event listeners a los botones
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteInstitution(e.target.dataset.id));
        });
    }

    // Abrir modal de edición
    function openEditModal(institutionId) {
        const institution = allInstitutions.find(i => i._id === institutionId);
        if (!institution) return;

        document.getElementById('edit-institution-id').value = institution._id;
        document.getElementById('edit-name').value = institution.name;
        document.getElementById('edit-province').value = institution.province;
        document.getElementById('edit-sector').value = institution.sector;
        document.getElementById('edit-hasShifts').checked = institution.hasShifts || false;
        document.getElementById('edit-isActive').checked = institution.isActive !== undefined ? institution.isActive : true;

        editModal.style.display = 'block';
    }

    // Eliminar institución
    async function deleteInstitution(institutionId) {
        const institution = allInstitutions.find(i => i._id === institutionId);
        if (!institution) return;

        toast.confirm(`¿Estás seguro de eliminar la institución "${institution.name}"? Esta acción no se puede deshacer.`, async () => {
            try {
                const response = await fetch(`${apiUrl}/institutions/${institutionId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    toast.success(data.message || 'Institución eliminada exitosamente');
                    loadInstitutions();
                } else {
                    toast.error(`Error: ${data.message}`);
                }
            } catch (error) {
                toast.error('Hubo un problema al eliminar la institución: ' + error.message);
            }
        });
    }
});
