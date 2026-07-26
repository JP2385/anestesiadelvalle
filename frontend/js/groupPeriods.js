import toast from './toast.js';

document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    const periodsContainer = document.getElementById('periods-container');
    const modal = document.getElementById('new-period-modal');
    const btnNuevoPeriodo = document.getElementById('btn-nuevo-periodo');
    const closeModal = document.getElementById('close-modal');
    const newPeriodForm = document.getElementById('new-period-form');
    const participacionesContainer = document.getElementById('participaciones-container');
    const totalSpan = document.getElementById('total-porcentaje');
    const totalDisplay = document.getElementById('total-porcentaje-display');
    const btnGuardar = document.getElementById('btn-guardar-periodo');
    const btnDescargarPlantilla = document.getElementById('btn-descargar-plantilla');
    const inputImportarCsv = document.getElementById('input-importar-csv');

    let allUsers = [];

    loadPeriods();

    // Descargar plantilla CSV
    btnDescargarPlantilla.addEventListener('click', () => {
        if (allUsers.length === 0) {
            toast.error('Primero abrí el modal para cargar los usuarios');
            return;
        }
        const filas = [['usuario', 'porcentaje']];
        allUsers.forEach(u => filas.push([u.username, '']));
        const csv = filas.map(f => f.join(';')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_participaciones.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Importar CSV
    inputImportarCsv.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Asegurarse que el modal esté abierto con los usuarios cargados
        if (modal.style.display !== 'block') {
            await loadUsersIntoForm();
            modal.style.display = 'block';
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            // Soporta separador ; o ,
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { toast.error('CSV vacío o inválido'); return; }
            const sep = lines[0].includes(';') ? ';' : ',';
            const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
            const colUser = headers.indexOf('usuario');
            const colPct = headers.indexOf('porcentaje');
            if (colUser === -1 || colPct === -1) {
                toast.error('El CSV debe tener columnas "usuario" y "porcentaje"');
                return;
            }
            let importados = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(sep);
                const username = (cols[colUser] || '').trim();
                const pct = parseFloat((cols[colPct] || '0').trim().replace(',', '.'));
                const user = allUsers.find(u => u.username === username);
                if (user && !isNaN(pct)) {
                    const input = document.getElementById(`porcentaje-${user._id}`);
                    if (input) { input.value = pct; importados++; }
                }
            }
            updateTotal();
            toast.success(`${importados} participaciones importadas`);
            inputImportarCsv.value = '';
        };
        reader.readAsText(file, 'UTF-8');
    });

    // Abrir modal
    btnNuevoPeriodo.addEventListener('click', async () => {
        await loadUsersIntoForm();
        modal.style.display = 'block';
    });

    // Cerrar modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        newPeriodForm.reset();
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            newPeriodForm.reset();
        }
    });

    // Submit nuevo período
    newPeriodForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fechaInicio = document.getElementById('new-fecha-inicio').value;
        const motivo = document.getElementById('new-motivo').value.trim();

        const participaciones = allUsers.map(user => ({
            userId: user._id,
            porcentaje: parseFloat(document.getElementById(`porcentaje-${user._id}`).value) || 0
        })).filter(p => p.porcentaje > 0);

        try {
            const response = await fetch(`${apiUrl}/group-periods`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({ fechaInicio, motivo, participaciones })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Período creado exitosamente');
                modal.style.display = 'none';
                newPeriodForm.reset();
                loadPeriods();
            } else {
                toast.error(data.message || 'Error al crear el período');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    });

    async function loadPeriods() {
        try {
            const response = await fetch(`${apiUrl}/group-periods`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (data.success) {
                renderPeriodsTable(data.periods);
            } else {
                toast.error('Error al cargar períodos');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    }

    async function loadUsersIntoForm() {
        try {
            const response = await fetch(`${apiUrl}/auth/users`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            allUsers = data.users || data;
            participacionesContainer.innerHTML = '<div class="participaciones-form-grid" id="participaciones-grid"></div>';
            const grid = document.getElementById('participaciones-grid');

            allUsers.forEach(user => {
                const div = document.createElement('div');
                div.className = 'participacion-row';
                div.innerHTML = `
                    <label>${user.username}</label>
                    <input type="number" id="porcentaje-${user._id}" min="0" max="100" step="0.01" value="0">
                    <span class="pct-symbol">%</span>
                `;
                grid.appendChild(div);
                document.getElementById(`porcentaje-${user._id}`).addEventListener('input', updateTotal);
            });

            updateTotal();
        } catch (error) {
            toast.error('Error al cargar usuarios');
        }
    }

    function updateTotal() {
        const total = allUsers.reduce((sum, user) => {
            const val = parseFloat(document.getElementById(`porcentaje-${user._id}`)?.value) || 0;
            return sum + val;
        }, 0);

        totalSpan.textContent = total.toFixed(2);

        const esValido = Math.abs(total - 100) < 0.01;
        totalDisplay.className = 'total-display ' + (esValido ? 'total-completo' : 'total-incompleto');
        btnGuardar.disabled = !esValido;
    }

    function renderPeriodsTable(periods) {
        periodsContainer.innerHTML = '';

        if (periods.length === 0) {
            periodsContainer.innerHTML = '<p style="text-align:center;color:#888;padding:32px;">No hay períodos registrados</p>';
            return;
        }

        periods.forEach((period, index) => {
            const esActual = index === 0;
            const fechaInicio = formatDate(period.fechaInicio);
            const fechaFin = period.fechaFin ? formatDate(addDays(period.fechaFin, -1)) : null;

            const totalPct = period.participaciones.reduce((s, p) => s + p.porcentaje, 0);
            const pctOk = Math.abs(totalPct - 100) < 0.01;

            const chips = period.participaciones
                .sort((a, b) => b.porcentaje - a.porcentaje)
                .map(p => {
                    const nombre = p.userId?.username || 'Usuario eliminado';
                    return `<div class="participacion-chip">
                        <span class="nombre">${nombre}</span>
                        <span class="porcentaje">${Number(p.porcentaje).toFixed(2)}%</span>
                    </div>`;
                }).join('');

            const totalChip = `<div class="participacion-chip participacion-chip-total ${pctOk ? '' : 'pct-error'}">
                <span class="nombre">TOTAL</span>
                <span class="porcentaje">${totalPct.toFixed(2)}%</span>
            </div>`;

            const card = document.createElement('div');
            card.className = 'period-card' + (esActual ? ' es-actual' : '');
            card.innerHTML = `
                <div class="period-card-header">
                    <div>
                        <div class="period-fechas">${fechaInicio} → ${fechaFin || 'Actualidad'}</div>
                        <div class="period-motivo">${period.motivo}</div>
                    </div>
                    <div class="period-header-right">
                        ${esActual ? '<span class="badge-actual">Vigente</span>' : ''}
                        ${esActual ? `<button class="delete-btn" onclick="deletePeriod('${period._id}')">Eliminar</button>` : ''}
                    </div>
                </div>
                <div class="period-card-body">
                    <div class="participaciones-grid">${chips}${totalChip}</div>
                </div>
            `;
            periodsContainer.appendChild(card);
        });
    }

    window.deletePeriod = async function (id) {
        if (!confirm('¿Seguro que querés eliminar este período? Esta acción no se puede deshacer.')) return;

        try {
            const response = await fetch(`${apiUrl}/group-periods/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Período eliminado');
                loadPeriods();
            } else {
                toast.error(data.message || 'Error al eliminar el período');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    };

    function formatDate(dateStr) {
        const [y, m, d] = String(dateStr).substring(0, 10).split('-');
        return `${d}/${m}/${y}`;
    }

    function addDays(dateStr, days) {
        const [y, m, d] = String(dateStr).substring(0, 10).split('-').map(Number);
        const date = new Date(y, m - 1, d + days);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
});
