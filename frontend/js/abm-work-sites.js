document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://adelvalle-88dd0d34d7bd.herokuapp.com/';

    const createWorkSiteForm = document.getElementById('create-worksite-form');
    const editWorkSiteForm = document.getElementById('edit-worksite-form');
    const workSitesTableBody = document.getElementById('worksites-table-body');
    const searchInput = document.getElementById('search-worksite');
    const filterInstitution = document.getElementById('filter-institution');
    const filterSpecialty = document.getElementById('filter-specialty');
    const editModal = document.getElementById('edit-modal');
    const closeModal = document.querySelector('.close');

    let allWorkSites = [];
    let allInstitutions = [];

    // Cargar datos iniciales
    loadInstitutions();
    loadWorkSites();

    // Crear nueva boca de trabajo
    createWorkSiteForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const workSiteData = {
            name: document.getElementById('new-name').value,
            abbreviation: document.getElementById('new-abbreviation').value,
            institution: document.getElementById('new-institution').value,
            scheduleTypes: {
                matutino: {
                    enabled: document.getElementById('new-matutino-enabled').checked,
                    weeklySchedule: {
                        monday: document.getElementById('new-matutino-monday').checked,
                        tuesday: document.getElementById('new-matutino-tuesday').checked,
                        wednesday: document.getElementById('new-matutino-wednesday').checked,
                        thursday: document.getElementById('new-matutino-thursday').checked,
                        friday: document.getElementById('new-matutino-friday').checked
                    }
                },
                vespertino: {
                    enabled: document.getElementById('new-vespertino-enabled').checked,
                    weeklySchedule: {
                        monday: document.getElementById('new-vespertino-monday').checked,
                        tuesday: document.getElementById('new-vespertino-tuesday').checked,
                        wednesday: document.getElementById('new-vespertino-wednesday').checked,
                        thursday: document.getElementById('new-vespertino-thursday').checked,
                        friday: document.getElementById('new-vespertino-friday').checked
                    }
                },
                largo: {
                    enabled: document.getElementById('new-largo-enabled').checked,
                    weeklySchedule: {
                        monday: document.getElementById('new-largo-monday').checked,
                        tuesday: document.getElementById('new-largo-tuesday').checked,
                        wednesday: document.getElementById('new-largo-wednesday').checked,
                        thursday: document.getElementById('new-largo-thursday').checked,
                        friday: document.getElementById('new-largo-friday').checked
                    }
                }
            },
            specialties: {
                isCardio: document.getElementById('new-cardio').checked,
                isPediatrics: document.getElementById('new-pediatrics').checked,
                isRNM: document.getElementById('new-RNM').checked
            }
        };

        try {
            const response = await fetch(`${apiUrl}/work-sites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify(workSiteData)
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || 'Boca de trabajo creada exitosamente');
                createWorkSiteForm.reset();
                // Restaurar checkboxes de regímenes y días a true por defecto
                ['matutino', 'vespertino', 'largo'].forEach(regime => {
                    document.getElementById(`new-${regime}-enabled`).checked = true;
                    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                        document.getElementById(`new-${regime}-${day}`).checked = true;
                    });
                });
                loadWorkSites();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            alert('Hubo un problema al crear la boca de trabajo: ' + error.message);
        }
    });

    // Buscar y filtrar bocas de trabajo
    searchInput.addEventListener('input', applyFilters);
    filterInstitution.addEventListener('change', applyFilters);
    filterSpecialty.addEventListener('change', applyFilters);

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const institutionFilter = filterInstitution.value;
        const specialtyFilter = filterSpecialty.value;

        const filteredWorkSites = allWorkSites.filter(workSite => {
            const matchesSearch = workSite.name.toLowerCase().includes(searchTerm) ||
                                workSite.abbreviation.toLowerCase().includes(searchTerm);
            const matchesInstitution = !institutionFilter || workSite.institution._id === institutionFilter;

            let matchesSpecialty = true;
            if (specialtyFilter === 'cardio') {
                matchesSpecialty = workSite.specialties.isCardio;
            } else if (specialtyFilter === 'pediatrics') {
                matchesSpecialty = workSite.specialties.isPediatrics;
            } else if (specialtyFilter === 'RNM') {
                matchesSpecialty = workSite.specialties.isRNM;
            }

            return matchesSearch && matchesInstitution && matchesSpecialty;
        });

        renderWorkSites(filteredWorkSites);
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

    // Editar boca de trabajo
    editWorkSiteForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const workSiteId = document.getElementById('edit-worksite-id').value;
        const updateData = {
            name: document.getElementById('edit-name').value,
            abbreviation: document.getElementById('edit-abbreviation').value,
            institution: document.getElementById('edit-institution').value,
            scheduleTypes: {
                matutino: {
                    enabled: document.getElementById('edit-matutino-enabled').checked,
                    weeklySchedule: {
                        monday: document.getElementById('edit-matutino-monday').checked,
                        tuesday: document.getElementById('edit-matutino-tuesday').checked,
                        wednesday: document.getElementById('edit-matutino-wednesday').checked,
                        thursday: document.getElementById('edit-matutino-thursday').checked,
                        friday: document.getElementById('edit-matutino-friday').checked
                    }
                },
                vespertino: {
                    enabled: document.getElementById('edit-vespertino-enabled').checked,
                    weeklySchedule: {
                        monday: document.getElementById('edit-vespertino-monday').checked,
                        tuesday: document.getElementById('edit-vespertino-tuesday').checked,
                        wednesday: document.getElementById('edit-vespertino-wednesday').checked,
                        thursday: document.getElementById('edit-vespertino-thursday').checked,
                        friday: document.getElementById('edit-vespertino-friday').checked
                    }
                },
                largo: {
                    enabled: document.getElementById('edit-largo-enabled').checked,
                    weeklySchedule: {
                        monday: document.getElementById('edit-largo-monday').checked,
                        tuesday: document.getElementById('edit-largo-tuesday').checked,
                        wednesday: document.getElementById('edit-largo-wednesday').checked,
                        thursday: document.getElementById('edit-largo-thursday').checked,
                        friday: document.getElementById('edit-largo-friday').checked
                    }
                }
            },
            specialties: {
                isCardio: document.getElementById('edit-cardio').checked,
                isPediatrics: document.getElementById('edit-pediatrics').checked,
                isRNM: document.getElementById('edit-RNM').checked
            }
        };

        try {
            const response = await fetch(`${apiUrl}/work-sites/${workSiteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || 'Boca de trabajo actualizada exitosamente');
                editModal.style.display = 'none';
                loadWorkSites();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            alert('Hubo un problema al actualizar la boca de trabajo: ' + error.message);
        }
    });

    // Cargar instituciones
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
                populateInstitutionSelects();
            } else {
                alert(`Error al cargar instituciones: ${data.message}`);
            }
        } catch (error) {
            alert('Hubo un problema al cargar las instituciones: ' + error.message);
        }
    }

    // Poblar los selects de instituciones
    function populateInstitutionSelects() {
        const newSelect = document.getElementById('new-institution');
        const editSelect = document.getElementById('edit-institution');
        const filterSelect = document.getElementById('filter-institution');

        // Limpiar selects
        newSelect.innerHTML = '<option value="">Seleccione una institución</option>';
        editSelect.innerHTML = '';
        filterSelect.innerHTML = '<option value="">Todas las instituciones</option>';

        allInstitutions.forEach(institution => {
            // Para formulario de creación
            const option1 = document.createElement('option');
            option1.value = institution._id;
            option1.textContent = institution.name;
            newSelect.appendChild(option1);

            // Para formulario de edición
            const option2 = document.createElement('option');
            option2.value = institution._id;
            option2.textContent = institution.name;
            editSelect.appendChild(option2);

            // Para filtro
            const option3 = document.createElement('option');
            option3.value = institution._id;
            option3.textContent = institution.name;
            filterSelect.appendChild(option3);
        });
    }

    // Cargar bocas de trabajo
    async function loadWorkSites() {
        try {
            const response = await fetch(`${apiUrl}/work-sites`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });

            const data = await response.json();

            if (response.ok) {
                allWorkSites = data.workSites;
                renderWorkSites(allWorkSites);
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            alert('Hubo un problema al cargar las bocas de trabajo: ' + error.message);
        }
    }

    // Renderizar bocas de trabajo en la tabla
    function renderWorkSites(workSites) {
        workSitesTableBody.innerHTML = '';

        if (workSites.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" style="text-align: center; padding: 20px;">No se encontraron bocas de trabajo</td>`;
            workSitesTableBody.appendChild(row);
            return;
        }

        workSites.forEach(workSite => {
            const row = document.createElement('tr');

            // Regímenes con sus días
            const regimesWithDays = [];
            if (workSite.scheduleTypes.matutino?.enabled) {
                const days = [];
                if (workSite.scheduleTypes.matutino.weeklySchedule?.monday) days.push('L');
                if (workSite.scheduleTypes.matutino.weeklySchedule?.tuesday) days.push('M');
                if (workSite.scheduleTypes.matutino.weeklySchedule?.wednesday) days.push('X');
                if (workSite.scheduleTypes.matutino.weeklySchedule?.thursday) days.push('J');
                if (workSite.scheduleTypes.matutino.weeklySchedule?.friday) days.push('V');
                regimesWithDays.push(`M(${days.join('')})`);
            }
            if (workSite.scheduleTypes.vespertino?.enabled) {
                const days = [];
                if (workSite.scheduleTypes.vespertino.weeklySchedule?.monday) days.push('L');
                if (workSite.scheduleTypes.vespertino.weeklySchedule?.tuesday) days.push('M');
                if (workSite.scheduleTypes.vespertino.weeklySchedule?.wednesday) days.push('X');
                if (workSite.scheduleTypes.vespertino.weeklySchedule?.thursday) days.push('J');
                if (workSite.scheduleTypes.vespertino.weeklySchedule?.friday) days.push('V');
                regimesWithDays.push(`V(${days.join('')})`);
            }
            if (workSite.scheduleTypes.largo?.enabled) {
                const days = [];
                if (workSite.scheduleTypes.largo.weeklySchedule?.monday) days.push('L');
                if (workSite.scheduleTypes.largo.weeklySchedule?.tuesday) days.push('M');
                if (workSite.scheduleTypes.largo.weeklySchedule?.wednesday) days.push('X');
                if (workSite.scheduleTypes.largo.weeklySchedule?.thursday) days.push('J');
                if (workSite.scheduleTypes.largo.weeklySchedule?.friday) days.push('V');
                regimesWithDays.push(`L(${days.join('')})`);
            }
            const regimesHTML = regimesWithDays.length > 0
                ? regimesWithDays.map(r => `<span class="badge badge-schedule">${r}</span>`).join(' ')
                : '<span style="color: #999;">Ninguno</span>';

            // Calcular días totales (ya no se usa esta columna)
            const daysHTML = '';

            // Especialidades
            const specialties = [];
            if (workSite.specialties.isCardio) specialties.push('Cardio');
            if (workSite.specialties.isPediatrics) specialties.push('Pediatría');
            if (workSite.specialties.isRNM) specialties.push('RNM');
            const specialtiesHTML = specialties.length > 0
                ? specialties.map(s => `<span class="badge badge-specialty">${s}</span>`).join(' ')
                : '<span style="color: #999;">Ninguna</span>';

            row.innerHTML = `
                <td>${workSite.name}</td>
                <td><strong>${workSite.abbreviation}</strong></td>
                <td>${workSite.institution.name}</td>
                <td>${regimesHTML}</td>
                <td>${specialtiesHTML}</td>
                <td>
                    <button class="action-btn edit-btn" data-id="${workSite._id}">Editar</button>
                    <button class="action-btn delete-btn" data-id="${workSite._id}">Eliminar</button>
                </td>
            `;

            workSitesTableBody.appendChild(row);
        });

        // Agregar event listeners a los botones
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteWorkSite(e.target.dataset.id));
        });
    }

    // Abrir modal de edición
    function openEditModal(workSiteId) {
        const workSite = allWorkSites.find(ws => ws._id === workSiteId);
        if (!workSite) return;

        document.getElementById('edit-worksite-id').value = workSite._id;
        document.getElementById('edit-name').value = workSite.name;
        document.getElementById('edit-abbreviation').value = workSite.abbreviation;
        document.getElementById('edit-institution').value = workSite.institution._id;

        // Matutino
        document.getElementById('edit-matutino-enabled').checked = workSite.scheduleTypes.matutino?.enabled || false;
        document.getElementById('edit-matutino-monday').checked = workSite.scheduleTypes.matutino?.weeklySchedule?.monday || false;
        document.getElementById('edit-matutino-tuesday').checked = workSite.scheduleTypes.matutino?.weeklySchedule?.tuesday || false;
        document.getElementById('edit-matutino-wednesday').checked = workSite.scheduleTypes.matutino?.weeklySchedule?.wednesday || false;
        document.getElementById('edit-matutino-thursday').checked = workSite.scheduleTypes.matutino?.weeklySchedule?.thursday || false;
        document.getElementById('edit-matutino-friday').checked = workSite.scheduleTypes.matutino?.weeklySchedule?.friday || false;

        // Vespertino
        document.getElementById('edit-vespertino-enabled').checked = workSite.scheduleTypes.vespertino?.enabled || false;
        document.getElementById('edit-vespertino-monday').checked = workSite.scheduleTypes.vespertino?.weeklySchedule?.monday || false;
        document.getElementById('edit-vespertino-tuesday').checked = workSite.scheduleTypes.vespertino?.weeklySchedule?.tuesday || false;
        document.getElementById('edit-vespertino-wednesday').checked = workSite.scheduleTypes.vespertino?.weeklySchedule?.wednesday || false;
        document.getElementById('edit-vespertino-thursday').checked = workSite.scheduleTypes.vespertino?.weeklySchedule?.thursday || false;
        document.getElementById('edit-vespertino-friday').checked = workSite.scheduleTypes.vespertino?.weeklySchedule?.friday || false;

        // Largo
        document.getElementById('edit-largo-enabled').checked = workSite.scheduleTypes.largo?.enabled || false;
        document.getElementById('edit-largo-monday').checked = workSite.scheduleTypes.largo?.weeklySchedule?.monday || false;
        document.getElementById('edit-largo-tuesday').checked = workSite.scheduleTypes.largo?.weeklySchedule?.tuesday || false;
        document.getElementById('edit-largo-wednesday').checked = workSite.scheduleTypes.largo?.weeklySchedule?.wednesday || false;
        document.getElementById('edit-largo-thursday').checked = workSite.scheduleTypes.largo?.weeklySchedule?.thursday || false;
        document.getElementById('edit-largo-friday').checked = workSite.scheduleTypes.largo?.weeklySchedule?.friday || false;

        // Especialidades
        document.getElementById('edit-cardio').checked = workSite.specialties.isCardio;
        document.getElementById('edit-pediatrics').checked = workSite.specialties.isPediatrics;
        document.getElementById('edit-RNM').checked = workSite.specialties.isRNM;

        editModal.style.display = 'block';
    }

    // Eliminar boca de trabajo
    async function deleteWorkSite(workSiteId) {
        const workSite = allWorkSites.find(ws => ws._id === workSiteId);
        if (!workSite) return;

        if (!confirm(`¿Estás seguro de eliminar la boca de trabajo "${workSite.name}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/work-sites/${workSiteId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || 'Boca de trabajo eliminada exitosamente');
                loadWorkSites();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            alert('Hubo un problema al eliminar la boca de trabajo: ' + error.message);
        }
    }
});
