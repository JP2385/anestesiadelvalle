import toast from './toast.js';

document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    // ── Referencias DOM ──────────────────────────────────────────────────
    const btnNuevaLiq = document.getElementById('btn-nueva-liq');
    const liqFormModal = document.getElementById('liq-form-modal');
    const closeFormModal = document.getElementById('close-form-modal');
    const liqDetailModal = document.getElementById('liq-detail-modal');
    const closeDetailModal = document.getElementById('close-detail-modal');
    const liqForm = document.getElementById('liq-form');
    const liqTableBody = document.getElementById('liq-table-body');

    // Campos del formulario
    const editLiqId = document.getElementById('edit-liq-id');
    const liqOrigen = document.getElementById('liq-origen');
    const liqFecha = document.getElementById('liq-fecha');
    const liqReservaGanancias = document.getElementById('liq-reserva-ganancias');
    const reservaGananciasRow = document.getElementById('reserva-ganancias-row');
    const liqDedPersonalesInternas = document.getElementById('liq-ded-personales-internas');
    const anestesiasBody = document.getElementById('anestesias-body');
    const ingresosContainer = document.getElementById('ingresos-container');
    const dedGrupalesContainer = document.getElementById('ded-grupales-container');
    const dedPersonalesContainer = document.getElementById('ded-personales-container');

    // Totales en tiempo real
    const sumaAnestesias = document.getElementById('suma-anestesias');
    const sumaIngresos = document.getElementById('suma-ingresos');
    const sumaDedGrupales = document.getElementById('suma-ded-grupales');
    const sumaDedPersonales = document.getElementById('suma-ded-personales');

    let allUsers = [];
    let allGroupPeriods = []; // ordenados por fechaInicio ASC

    // ── Init ──────────────────────────────────────────────────────────────
    loadLiquidaciones();
    loadUsers();
    loadGroupPeriods();

    // ── Mostrar/autoactivar reserva de ganancias según origen ─────────────
    liqOrigen.addEventListener('change', () => {
        const esRioNegro = liqOrigen.value === 'Río Negro';
        reservaGananciasRow.style.display = esRioNegro ? 'block' : 'none';
        liqReservaGanancias.checked = esRioNegro;
        // Neuquén: ded. personales ya incluidas en el cobrado (internas)
        // Río Negro: ded. personales son adicionales (externas, salen del pool)
        liqDedPersonalesInternas.checked = !esRioNegro;
        updateTotals();
    });

    // ── Descargar plantilla ───────────────────────────────────────────────
    document.getElementById('btn-descargar-plantilla').addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = `${apiUrl}/liquidaciones/plantilla`;
        a.setAttribute('download', 'plantilla-liquidacion.xlsx');
        // Necesitamos el token — usamos fetch para que incluya el header Auth
        fetch(`${apiUrl}/liquidaciones/plantilla`, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        })
            .then(r => r.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                a.href = url;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(() => toast.error('Error al descargar plantilla'));
    });

    // ── Importar CSV ──────────────────────────────────────────────────────
    document.getElementById('input-csv-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const importStatus = document.getElementById('import-status');
        importStatus.textContent = 'Procesando...';
        importStatus.className = 'liq-import-status';

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                // Enviar como base64 (funciona para xlsx y cualquier binario)
                const base64 = ev.target.result.split(',')[1];
                const response = await fetch(`${apiUrl}/liquidaciones/importar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: base64
                });

                const data = await response.json();

                if (!data.success) {
                    importStatus.textContent = 'Error: ' + data.message;
                    importStatus.className = 'liq-import-status error';
                    return;
                }

                // Pre-cargar datos generales
                if (data.data.fecha) liqFecha.value = data.data.fecha;
                if (data.data.origen) liqOrigen.value = data.data.origen;

                // Pre-cargar ingresos
                ingresosContainer.innerHTML = '';
                if (data.data.ingresos?.length) {
                    data.data.ingresos.forEach(i => addIngresoRow(i));
                } else {
                    addIngresoRow();
                }

                // Pre-cargar anestesias
                anestesiasBody.innerHTML = '';
                if (data.data.anestesias.length) {
                    data.data.anestesias.forEach(a => addAnestesiaRow(a));
                } else {
                    addAnestesiaRow();
                }

                // Pre-cargar deducciones grupales
                dedGrupalesContainer.innerHTML = '';
                data.data.deduccionesGrupales.forEach(d => addDedGrupalRow(d));

                // Pre-cargar deducciones personales
                dedPersonalesContainer.innerHTML = '';
                data.data.deduccionesPersonales.forEach(d => addDedPersonalRow(d));

                updateTotals();

                const totalFilas = (data.data.ingresos?.length || 0) +
                    data.data.anestesias.length +
                    data.data.deduccionesGrupales.length +
                    data.data.deduccionesPersonales.length;

                if (data.warnings?.length) {
                    importStatus.textContent = `${totalFilas} filas importadas. Advertencias: ${data.warnings.join(' | ')}`;
                    importStatus.className = 'liq-import-status warn';
                } else {
                    importStatus.textContent = `${totalFilas} filas importadas correctamente`;
                    importStatus.className = 'liq-import-status ok';
                }
            } catch {
                importStatus.textContent = 'Error de conexión al importar';
                importStatus.className = 'liq-import-status error';
            }
        };
        reader.readAsDataURL(file); // lee como base64 data URL
        // Resetear input para permitir importar el mismo archivo de nuevo
        e.target.value = '';
    });

    // ── Abrir modal nueva liquidación ────────────────────────────────────
    btnNuevaLiq.addEventListener('click', () => {
        document.getElementById('form-modal-title').textContent = 'Nueva Liquidación';
        editLiqId.value = '';
        liqForm.reset();
        anestesiasBody.innerHTML = '';
        ingresosContainer.innerHTML = '';
        dedGrupalesContainer.innerHTML = '';
        dedPersonalesContainer.innerHTML = '';
        reservaGananciasRow.style.display = 'none';
        liqReservaGanancias.checked = false;
        document.getElementById('form-distribucion-section').style.display = 'none';
        addIngresoRow();
        addAnestesiaRow();
        updateTotals();
        liqFormModal.style.display = 'block';
    });

    // ── Cerrar modales ────────────────────────────────────────────────────
    closeFormModal.addEventListener('click', () => { liqFormModal.style.display = 'none'; });
    closeDetailModal.addEventListener('click', () => { liqDetailModal.style.display = 'none'; });

    window.addEventListener('click', (e) => {
        if (e.target === liqFormModal) liqFormModal.style.display = 'none';
        if (e.target === liqDetailModal) liqDetailModal.style.display = 'none';
    });

    // ── Botones agregar filas ─────────────────────────────────────────────
    document.getElementById('btn-add-ingreso').addEventListener('click', () => {
        addIngresoRow();
        updateTotals();
    });

    document.getElementById('btn-add-anestesia').addEventListener('click', () => {
        addAnestesiaRow();
        updateTotals();
    });

    document.getElementById('btn-add-ded-grupal').addEventListener('click', () => {
        addDedGrupalRow();
        updateTotals();
    });

    document.getElementById('btn-add-ded-personal').addEventListener('click', () => {
        addDedPersonalRow();
        updateTotals();
    });

    // ── Submit formulario ─────────────────────────────────────────────────
    liqForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const anestesias = getAnestesiasFromForm();
        const ingresos = getIngresosFromForm();
        const deduccionesGrupales = getDedGrupalesFromForm();
        const deduccionesPersonales = getDedPersonalesFromForm();

        const payload = {
            origen: liqOrigen.value,
            fecha: liqFecha.value,
            reservaGanancias: liqReservaGanancias.checked,
            dedPersonalesInternas: liqDedPersonalesInternas.checked,
            ingresos,
            anestesias,
            deduccionesGrupales,
            deduccionesPersonales
        };

        const id = editLiqId.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${apiUrl}/liquidaciones/${id}` : `${apiUrl}/liquidaciones`;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                toast.success(id ? 'Liquidación actualizada' : 'Liquidación creada');
                liqFormModal.style.display = 'none';
                loadLiquidaciones();
            } else {
                toast.error(data.message || 'Error al guardar');
            }
        } catch {
            toast.error('Error de conexión');
        }
    });

    // ── Cargar lista de liquidaciones ─────────────────────────────────────
    async function loadLiquidaciones() {
        try {
            const response = await fetch(`${apiUrl}/liquidaciones`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (data.success) {
                renderTable(data.liquidaciones);
            } else {
                toast.error('Error al cargar liquidaciones');
            }
        } catch {
            toast.error('Error de conexión');
        }
    }

    function renderTable(liquidaciones) {
        liqTableBody.innerHTML = '';

        if (!liquidaciones.length) {
            liqTableBody.innerHTML = '<tr><td colspan="5" class="liq-empty">No hay liquidaciones registradas</td></tr>';
            return;
        }

        liquidaciones.forEach(liq => {
            const tr = document.createElement('tr');
            const badgeClass = liq.origen === 'Neuquén' ? 'badge-neuquen' : 'badge-rionegro';
            tr.innerHTML = `
                <td>${formatDate(liq.fecha)}</td>
                <td><span class="${badgeClass}">${liq.origen}</span></td>
                <td>${formatMoney(liq.montoTotalCobrado)}</td>
                <td>${liq.cantidadAnestesias}</td>
                <td>
                    <button class="action-btn ver-btn" data-id="${liq._id}">Ver</button>
                    <button class="action-btn edit-btn" data-id="${liq._id}">Editar</button>
                    <button class="action-btn delete-btn" data-id="${liq._id}">Eliminar</button>
                </td>
            `;
            liqTableBody.appendChild(tr);
        });

        liqTableBody.querySelectorAll('.ver-btn').forEach(btn =>
            btn.addEventListener('click', () => openDetail(btn.dataset.id))
        );
        liqTableBody.querySelectorAll('.edit-btn').forEach(btn =>
            btn.addEventListener('click', () => openEdit(btn.dataset.id))
        );
        liqTableBody.querySelectorAll('.delete-btn').forEach(btn =>
            btn.addEventListener('click', () => deleteLiq(btn.dataset.id))
        );
    }

    // ── Ver detalle ───────────────────────────────────────────────────────
    async function openDetail(id) {
        try {
            const response = await fetch(`${apiUrl}/liquidaciones/${id}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (!data.success) { toast.error('Error al cargar detalle'); return; }

            const { liquidacion, distribucion } = data;

            document.getElementById('detail-modal-title').textContent =
                `Liquidación ${liquidacion.origen} — ${formatDate(liquidacion.fecha)}`;

            // Encabezado
            const headerEl = document.getElementById('detail-header');
            const reservaItem = distribucion.montoReserva > 0
                ? `<div class="detail-header-item detail-header-reserva"><label>Reserva ganancias (29%)</label><span>${formatMoney(distribucion.montoReserva)}</span></div>`
                : '';
            headerEl.innerHTML = `
                <div class="detail-header-item"><label>Origen</label><span>${liquidacion.origen}</span></div>
                <div class="detail-header-item"><label>Fecha</label><span>${formatDate(liquidacion.fecha)}</span></div>
                <div class="detail-header-item"><label>Total cobrado</label><span>${formatMoney(distribucion.montoTotalCobrado)}</span></div>
                <div class="detail-header-item"><label>Bruto (∑ anestesias)</label><span>${formatMoney(distribucion.montoBruto)}</span></div>
                <div class="detail-header-item"><label>Ded. grupales</label><span>${formatMoney(distribucion.totalDeduccionesGrupales)}</span></div>
                <div class="detail-header-item"><label>Ded. personales</label><span>${formatMoney(distribucion.totalDedPersonales)}</span></div>
                ${reservaItem}
                <div class="detail-header-item"><label>Base distribuible</label><span>${formatMoney(distribucion.totalDistribuible)}</span></div>
            `;

            // Anestesias
            const anBody = document.getElementById('detail-anestesias-body');
            anBody.innerHTML = liquidacion.anestesias.length
                ? liquidacion.anestesias.map(a => `
                    <tr>
                        <td>${a.paciente || '—'}</td>
                        <td>${formatDate(a.fechaPractica)}</td>
                        <td>${a.obraSocial || '—'}</td>
                        <td>${a.lugarPractica || '—'}</td>
                        <td>${formatMoney(a.montoFacturado)}</td>
                        <td>${formatMoney(a.iva || 0)}</td>
                    </tr>`).join('')
                : '<tr><td colspan="6" class="liq-empty">Sin anestesias cargadas</td></tr>';

            // Deducciones grupales
            const dedGrupEl = document.getElementById('detail-ded-grupales');
            dedGrupEl.innerHTML = liquidacion.deduccionesGrupales.length
                ? liquidacion.deduccionesGrupales.map(d =>
                    `<div class="detail-ded-grupal-row"><span>${d.concepto}</span><span>${formatMoney(d.monto)}</span></div>`
                  ).join('')
                : '<p style="color:#888;font-size:13px;">Sin deducciones grupales</p>';

            // Distribución
            const distBody = document.getElementById('detail-distribucion-body');
            const distFoot = document.getElementById('detail-distribucion-foot');

            distBody.innerHTML = distribucion.distribucion.map(s => `
                <tr>
                    <td>${s.username}</td>
                    <td>${formatMoney(s.parteBruta)}</td>
                    <td class="col-reserva">${s.reserva > 0 ? '−' + formatMoney(s.reserva) : '—'}</td>
                    <td>${s.deduccionGrupal > 0 ? '−' + formatMoney(s.deduccionGrupal) : '—'}</td>
                        <td>${s.deduccionPersonal > 0 ? '−' + formatMoney(s.deduccionPersonal) : '—'}</td>
                    <td>${s.redistribucion > 0 ? '+' + formatMoney(s.redistribucion) : '—'}</td>
                    <td class="parte-neta">${formatMoney(s.parteNeta)}</td>
                    <td>${s.ingresadoEnCuenta > 0 ? formatMoney(s.ingresadoEnCuenta) : '—'}</td>
                    <td class="${s.saldo >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">${s.saldo >= 0 ? '+' : ''}${formatMoney(s.saldo)}</td>
                </tr>`).join('');

            const totals = distribucion.distribucion.reduce((acc, d) => ({
                parteBruta: acc.parteBruta + d.parteBruta,
                reserva: acc.reserva + d.reserva,
                deduccionGrupal: acc.deduccionGrupal + d.deduccionGrupal,
                deduccionPersonal: acc.deduccionPersonal + d.deduccionPersonal,
                redistribucion: acc.redistribucion + d.redistribucion,
                parteNeta: acc.parteNeta + d.parteNeta,
                ingresadoEnCuenta: acc.ingresadoEnCuenta + (d.ingresadoEnCuenta || 0),
                saldo: acc.saldo + (d.saldo || 0)
            }), { parteBruta: 0, reserva: 0, deduccionGrupal: 0, deduccionPersonal: 0, redistribucion: 0, parteNeta: 0, ingresadoEnCuenta: 0, saldo: 0 });

            distFoot.innerHTML = `
                <tr style="font-weight:bold;">
                    <td>Total</td>
                    <td>${formatMoney(totals.parteBruta)}</td>
                    <td class="col-reserva">${totals.reserva > 0 ? '−' + formatMoney(totals.reserva) : '—'}</td>
                    <td>${totals.deduccionGrupal > 0 ? '−' + formatMoney(totals.deduccionGrupal) : '—'}</td>
                        <td>${totals.deduccionPersonal > 0 ? '−' + formatMoney(totals.deduccionPersonal) : '—'}</td>
                    <td>${totals.redistribucion > 0 ? '+' + formatMoney(totals.redistribucion) : '—'}</td>
                    <td class="parte-neta">${formatMoney(totals.parteNeta)}</td>
                    <td>${totals.ingresadoEnCuenta > 0 ? formatMoney(totals.ingresadoEnCuenta) : '—'}</td>
                    <td>${totals.saldo >= 0 ? '+' : ''}${formatMoney(totals.saldo)}</td>
                </tr>`;

            liqDetailModal.style.display = 'block';
        } catch {
            toast.error('Error de conexión');
        }
    }

    // ── Editar ────────────────────────────────────────────────────────────
    async function openEdit(id) {
        try {
            const response = await fetch(`${apiUrl}/liquidaciones/${id}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (!data.success) { toast.error('Error al cargar liquidación'); return; }

            const liq = data.liquidacion;
            const distribucion = data.distribucion;

            document.getElementById('form-modal-title').textContent = 'Editar Liquidación';
            editLiqId.value = liq._id;
            liqOrigen.value = liq.origen;
            liqFecha.value = liq.fecha?.substring(0, 10);

            // Reserva de ganancias y modo ded. personales
            const esRioNegro = liq.origen === 'Río Negro';
            reservaGananciasRow.style.display = esRioNegro ? 'block' : 'none';
            liqReservaGanancias.checked = !!liq.reservaGanancias;
            liqDedPersonalesInternas.checked = liq.dedPersonalesInternas !== false;

            // Ingresos
            ingresosContainer.innerHTML = '';
            if (liq.ingresos?.length) {
                liq.ingresos.forEach(i => addIngresoRow(i));
            } else {
                addIngresoRow();
            }

            // Anestesias
            anestesiasBody.innerHTML = '';
            if (liq.anestesias.length) {
                liq.anestesias.forEach(a => addAnestesiaRow(a));
            } else {
                addAnestesiaRow();
            }

            // Ded. grupales
            dedGrupalesContainer.innerHTML = '';
            liq.deduccionesGrupales.forEach(d => addDedGrupalRow(d));

            // Ded. personales
            dedPersonalesContainer.innerHTML = '';
            liq.deduccionesPersonales.forEach(d => addDedPersonalRow(d));

            updateTotals();

            // Distribución
            renderFormDistribucion(distribucion);

            liqFormModal.style.display = 'block';
        } catch {
            toast.error('Error de conexión');
        }
    }

    function renderFormDistribucion(distribucion) {
        const section = document.getElementById('form-distribucion-section');
        const body = document.getElementById('form-distribucion-body');
        const foot = document.getElementById('form-distribucion-foot');

        if (!distribucion || !distribucion.distribucion?.length) {
            section.style.display = 'none';
            return;
        }

        body.innerHTML = distribucion.distribucion.map(s => `
            <tr>
                <td>${s.username}</td>
                <td>${formatMoney(s.parteBruta)}</td>
                <td class="col-reserva">${s.reserva > 0 ? '−' + formatMoney(s.reserva) : '—'}</td>
                <td>${s.deduccionGrupal > 0 ? '−' + formatMoney(s.deduccionGrupal) : '—'}</td>
                <td>${s.deduccionPersonal > 0 ? '−' + formatMoney(s.deduccionPersonal) : '—'}</td>
                <td>${s.redistribucion > 0 ? '+' + formatMoney(s.redistribucion) : '—'}</td>
                <td class="parte-neta">${formatMoney(s.parteNeta)}</td>
                <td>${s.ingresadoEnCuenta > 0 ? formatMoney(s.ingresadoEnCuenta) : '—'}</td>
                <td class="${s.saldo >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">${s.saldo >= 0 ? '+' : ''}${formatMoney(s.saldo)}</td>
            </tr>`).join('');

        const totals = distribucion.distribucion.reduce((acc, d) => ({
            parteBruta: acc.parteBruta + d.parteBruta,
            reserva: acc.reserva + d.reserva,
            deduccionGrupal: acc.deduccionGrupal + d.deduccionGrupal,
            deduccionPersonal: acc.deduccionPersonal + d.deduccionPersonal,
            redistribucion: acc.redistribucion + d.redistribucion,
            parteNeta: acc.parteNeta + d.parteNeta,
            ingresadoEnCuenta: acc.ingresadoEnCuenta + (d.ingresadoEnCuenta || 0),
            saldo: acc.saldo + (d.saldo || 0)
        }), { parteBruta: 0, reserva: 0, deduccionGrupal: 0, deduccionPersonal: 0, redistribucion: 0, parteNeta: 0, ingresadoEnCuenta: 0, saldo: 0 });

        foot.innerHTML = `
            <tr style="font-weight:bold;">
                <td>Total</td>
                <td>${formatMoney(totals.parteBruta)}</td>
                <td class="col-reserva">${totals.reserva > 0 ? '−' + formatMoney(totals.reserva) : '—'}</td>
                <td>${totals.deduccionGrupal > 0 ? '−' + formatMoney(totals.deduccionGrupal) : '—'}</td>
                <td>${totals.deduccionPersonal > 0 ? '−' + formatMoney(totals.deduccionPersonal) : '—'}</td>
                <td>${totals.redistribucion > 0 ? '+' + formatMoney(totals.redistribucion) : '—'}</td>
                <td class="parte-neta">${formatMoney(totals.parteNeta)}</td>
                <td>${totals.ingresadoEnCuenta > 0 ? formatMoney(totals.ingresadoEnCuenta) : '—'}</td>
                <td>${totals.saldo >= 0 ? '+' : ''}${formatMoney(totals.saldo)}</td>
            </tr>`;

        section.style.display = 'block';
    }

    // ── Eliminar ──────────────────────────────────────────────────────────
    async function deleteLiq(id) {
        if (!confirm('¿Seguro que querés eliminar esta liquidación? Esta acción no se puede deshacer.')) return;

        try {
            const response = await fetch(`${apiUrl}/liquidaciones/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Liquidación eliminada');
                loadLiquidaciones();
            } else {
                toast.error(data.message || 'Error al eliminar');
            }
        } catch {
            toast.error('Error de conexión');
        }
    }

    // ── Cargar usuarios para select deducciones personales ────────────────
    async function loadUsers() {
        try {
            const response = await fetch(`${apiUrl}/auth/users`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();
            allUsers = data.users || data;
        } catch {
            // Si falla, el select quedará vacío
        }
    }

    // ── Cargar GroupPeriods para cálculo local de distribución ────────────
    async function loadGroupPeriods() {
        try {
            const response = await fetch(`${apiUrl}/group-periods`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();
            // El endpoint devuelve `periods` en orden desc; necesitamos ASC para getPeriodForDate
            allGroupPeriods = (data.periods || []).sort(
                (a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio)
            );
            // Si el modal ya estaba abierto, recalcular
            if (liqFormModal.style.display === 'block') updateTotals();
        } catch {
            // Sin group periods, la distribución quedará vacía
        }
    }

    // ── Algoritmo de distribución local (replica el backend) ─────────────
    const PORCENTAJE_RESERVA = 0.29;

    function getPeriodForDateLocal(date) {
        let vigente = null;
        for (const p of allGroupPeriods) {
            if (new Date(p.fechaInicio) <= new Date(date)) vigente = p;
            else break;
        }
        return vigente;
    }

    function calcularDistribucionLocal() {
        const reservaGanancias = liqReservaGanancias.checked;
        const dedPersonalesInternas = liqDedPersonalesInternas.checked;

        const ingresos = getIngresosFromForm();
        const anestesias = getAnestesiasFromForm();
        const deduccionesGrupales = getDedGrupalesFromForm();
        const deduccionesPersonales = getDedPersonalesFromForm();

        // Ingreso por socio (para saldo)
        const ingresoPorSocio = {};
        for (const ing of ingresos) {
            if (ing.tipo === 'socio' && ing.userId) {
                if (!ingresoPorSocio[ing.userId]) ingresoPorSocio[ing.userId] = 0;
                ingresoPorSocio[ing.userId] += ing.monto;
            }
        }

        const totalDeduccionesGrupales = deduccionesGrupales.reduce((s, d) => s + d.monto, 0);
        const montoBruto = anestesias.reduce((s, a) => s + a.montoFacturado, 0);
        const montoReserva = reservaGanancias ? montoBruto * PORCENTAJE_RESERVA : 0;

        // Deducciones personales por userId
        const deduccionPorSocio = {};
        const usernameMap = {};
        for (const d of deduccionesPersonales) {
            if (!d.userId) continue;
            if (!deduccionPorSocio[d.userId]) deduccionPorSocio[d.userId] = 0;
            deduccionPorSocio[d.userId] += d.monto;
            const user = allUsers.find(u => u._id === d.userId);
            if (user) usernameMap[d.userId] = user.username;
        }
        const totalDedPersonales = Object.values(deduccionPorSocio).reduce((s, m) => s + m, 0);

        // Agrupar anestesias por período
        const montosPorPeriodo = {};
        const periodMap = {};
        for (const a of anestesias) {
            const p = getPeriodForDateLocal(a.fechaPractica);
            if (!p) continue;
            const pid = p._id?.toString() || p._id;
            if (!montosPorPeriodo[pid]) { montosPorPeriodo[pid] = 0; periodMap[pid] = p; }
            montosPorPeriodo[pid] += a.montoFacturado;
        }

        // Acumular por socio período a período (igual que el Excel, sin normalizar)
        const acumPorSocio = {};
        for (const [pid, montoEnPeriodo] of Object.entries(montosPorPeriodo)) {
            const p = periodMap[pid];
            const proporcion = montoBruto > 0 ? montoEnPeriodo / montoBruto : 0;
            const deducGrupalPeriodo = totalDeduccionesGrupales * proporcion;
            const reservaPeriodo = montoReserva * proporcion;
            for (const part of (p.participaciones || [])) {
                const uid = (part.userId?._id || part.userId)?.toString();
                if (!uid) continue;
                const username = part.userId?.username || allUsers.find(u => u._id?.toString() === uid || u._id === uid)?.username || uid;
                usernameMap[uid] = username;
                const pct = part.porcentaje / 100;
                if (!acumPorSocio[uid]) acumPorSocio[uid] = { parteBruta: 0, reserva: 0, deduccionGrupal: 0 };
                acumPorSocio[uid].parteBruta     += montoEnPeriodo * pct;
                acumPorSocio[uid].reserva        += reservaPeriodo * pct;
                acumPorSocio[uid].deduccionGrupal += deducGrupalPeriodo * pct;
            }
        }

        if (Object.keys(acumPorSocio).length === 0) return null;

        const distribucionArr = Object.entries(acumPorSocio).map(([uid, acum]) => {
            const { parteBruta, reserva, deduccionGrupal } = acum;
            const deduccionPersonal = deduccionPorSocio[uid] || 0;
            const fraccion = montoBruto > 0 ? parteBruta / montoBruto : 0;
            const redistribucion = dedPersonalesInternas ? totalDedPersonales * fraccion : 0;
            const parteNeta = parteBruta - reserva - deduccionGrupal - deduccionPersonal + redistribucion;
            const ingresadoEnCuenta = ingresoPorSocio[uid] || 0;
            const saldo = parteNeta - ingresadoEnCuenta;
            return {
                username: usernameMap[uid] || uid,
                parteBruta: Math.round(parteBruta * 100) / 100,
                reserva: Math.round(reserva * 100) / 100,
                deduccionGrupal: Math.round(deduccionGrupal * 100) / 100,
                deduccionPersonal: Math.round(deduccionPersonal * 100) / 100,
                redistribucion: Math.round(redistribucion * 100) / 100,
                parteNeta: Math.round(parteNeta * 100) / 100,
                ingresadoEnCuenta: Math.round(ingresadoEnCuenta * 100) / 100,
                saldo: Math.round(saldo * 100) / 100
            };
        });

        distribucionArr.sort((a, b) => b.parteNeta - a.parteNeta);
        return { distribucion: distribucionArr };
    }

    // ── Helpers de formulario ─────────────────────────────────────────────
    function addIngresoRow(data = {}) {
        const div = document.createElement('div');
        div.className = 'ded-row ingreso-row';

        const tipoSeleccionado = data.tipo || 'empresa';
        const userOptions = allUsers.map(u => {
            const uid = u._id?.toString ? u._id.toString() : u._id;
            const dataUid = (data.userId?._id || data.userId)?.toString ? (data.userId?._id || data.userId).toString() : (data.userId?._id || data.userId);
            return `<option value="${uid}" ${dataUid === uid ? 'selected' : ''}>${u.username}</option>`;
        }).join('');

        div.innerHTML = `
            <select class="ingreso-tipo">
                <option value="empresa" ${tipoSeleccionado === 'empresa' ? 'selected' : ''}>Empresa</option>
                <option value="socio" ${tipoSeleccionado === 'socio' ? 'selected' : ''}>Socio</option>
            </select>
            <select class="ingreso-socio" style="${tipoSeleccionado === 'socio' ? '' : 'display:none;'}">
                <option value="">Socio...</option>${userOptions}
            </select>
            <input type="number" min="0" step="0.01" placeholder="Monto" value="${data.monto || ''}">
            <button type="button" class="liq-remove-btn">✕</button>
        `;

        const tipoSelect = div.querySelector('.ingreso-tipo');
        const socioSelect = div.querySelector('.ingreso-socio');
        tipoSelect.addEventListener('change', () => {
            socioSelect.style.display = tipoSelect.value === 'socio' ? '' : 'none';
            updateTotals();
        });
        div.querySelector('.liq-remove-btn').addEventListener('click', () => { div.remove(); updateTotals(); });
        div.querySelectorAll('input').forEach(inp => inp.addEventListener('input', updateTotals));
        socioSelect.addEventListener('change', updateTotals);
        ingresosContainer.appendChild(div);
    }

    function addAnestesiaRow(data = {}) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" placeholder="Paciente" value="${data.paciente || ''}"></td>
            <td><input type="date" value="${data.fechaPractica ? data.fechaPractica.substring(0, 10) : ''}"></td>
            <td><input type="text" placeholder="Obra Social" value="${data.obraSocial || ''}"></td>
            <td><input type="text" placeholder="Lugar" value="${data.lugarPractica || ''}"></td>
            <td><input type="number" min="0" step="0.01" placeholder="0.00" value="${data.montoFacturado || ''}"></td>
            <td><input type="number" min="0" step="0.01" placeholder="0.00" value="${data.iva || ''}"></td>
            <td><button type="button" class="liq-remove-btn">✕</button></td>
        `;
        tr.querySelector('.liq-remove-btn').addEventListener('click', () => {
            tr.remove();
            updateTotals();
        });
        tr.querySelectorAll('input').forEach(inp => {
            inp.addEventListener('input', updateTotals);
            inp.addEventListener('change', updateTotals); // para inputs tipo date
        });
        anestesiasBody.appendChild(tr);
    }

    function addDedGrupalRow(data = {}) {
        const div = document.createElement('div');
        div.className = 'ded-row ded-grupal-row';
        div.innerHTML = `
            <input type="text" placeholder="Concepto" value="${data.concepto || ''}">
            <input type="number" min="0" step="0.01" placeholder="Monto" value="${data.monto || ''}">
            <button type="button" class="liq-remove-btn">✕</button>
        `;
        div.querySelector('.liq-remove-btn').addEventListener('click', () => {
            div.remove();
            updateTotals();
        });
        div.querySelectorAll('input').forEach(inp => inp.addEventListener('input', updateTotals));
        dedGrupalesContainer.appendChild(div);
    }

    function addDedPersonalRow(data = {}) {
        const div = document.createElement('div');
        div.className = 'ded-row ded-personal-row';

        const options = allUsers.map(u =>
            `<option value="${u._id}" ${data.userId === u._id || (data.userId?._id || data.userId) === u._id ? 'selected' : ''}>${u.username}</option>`
        ).join('');

        div.innerHTML = `
            <select><option value="">Socio...</option>${options}</select>
            <input type="text" placeholder="Concepto" value="${data.concepto || ''}">
            <input type="number" min="0" step="0.01" placeholder="Monto" value="${data.monto || ''}">
            <button type="button" class="liq-remove-btn">✕</button>
        `;
        div.querySelector('.liq-remove-btn').addEventListener('click', () => {
            div.remove();
            updateTotals();
        });
        div.querySelectorAll('input').forEach(inp => inp.addEventListener('input', updateTotals));
        div.querySelector('select').addEventListener('change', updateTotals);
        dedPersonalesContainer.appendChild(div);
    }

    function getAnestesiasFromForm() {
        return Array.from(anestesiasBody.querySelectorAll('tr')).map(tr => {
            const inputs = tr.querySelectorAll('input');
            return {
                paciente: inputs[0].value.trim(),
                fechaPractica: inputs[1].value,
                obraSocial: inputs[2].value.trim(),
                lugarPractica: inputs[3].value.trim(),
                montoFacturado: parseFloat(inputs[4].value) || 0,
                iva: parseFloat(inputs[5].value) || 0
            };
        }).filter(a => a.fechaPractica && a.montoFacturado > 0);
    }

    function getDedGrupalesFromForm() {
        return Array.from(dedGrupalesContainer.querySelectorAll('.ded-grupal-row')).map(div => {
            const inputs = div.querySelectorAll('input');
            return {
                concepto: inputs[0].value.trim(),
                monto: parseFloat(inputs[1].value) || 0
            };
        }).filter(d => d.concepto && d.monto > 0);
    }

    function getIngresosFromForm() {
        return Array.from(ingresosContainer.querySelectorAll('.ingreso-row')).map(div => {
            const tipo = div.querySelector('.ingreso-tipo').value;
            const userId = tipo === 'socio' ? div.querySelector('.ingreso-socio').value : null;
            const monto = parseFloat(div.querySelector('input[type="number"]').value) || 0;
            return { tipo, userId: userId || null, monto };
        }).filter(i => i.monto > 0);
    }

    function getDedPersonalesFromForm() {
        return Array.from(dedPersonalesContainer.querySelectorAll('.ded-personal-row')).map(div => {
            const select = div.querySelector('select');
            const inputs = div.querySelectorAll('input');
            return {
                userId: select.value,
                concepto: inputs[0].value.trim(),
                monto: parseFloat(inputs[1].value) || 0
            };
        }).filter(d => d.userId && d.monto > 0);
    }

    function updateTotals() {
        try {
            const totalAn = Array.from(anestesiasBody.querySelectorAll('tr')).reduce((sum, tr) => {
                const inp = tr.querySelectorAll('input')[4];
                return sum + (parseFloat(inp?.value) || 0);
            }, 0);

            const totalIng = Array.from(ingresosContainer.querySelectorAll('.ingreso-row')).reduce((sum, div) => {
                return sum + (parseFloat(div.querySelector('input[type="number"]')?.value) || 0);
            }, 0);

            const totalDG = Array.from(dedGrupalesContainer.querySelectorAll('.ded-grupal-row')).reduce((sum, div) => {
                const inp = div.querySelectorAll('input')[1];
                return sum + (parseFloat(inp?.value) || 0);
            }, 0);

            const totalDP = Array.from(dedPersonalesContainer.querySelectorAll('.ded-personal-row')).reduce((sum, div) => {
                const inp = div.querySelectorAll('input')[1];
                return sum + (parseFloat(inp?.value) || 0);
            }, 0);

            sumaAnestesias.textContent = formatMoney(totalAn);
            sumaIngresos.textContent = formatMoney(totalIng);
            sumaDedGrupales.textContent = formatMoney(totalDG);
            sumaDedPersonales.textContent = formatMoney(totalDP);

            renderFormDistribucion(calcularDistribucionLocal());
        } catch (err) {
            console.error('Error en updateTotals:', err);
        }
    }

    liqReservaGanancias.addEventListener('change', updateTotals);
    liqDedPersonalesInternas.addEventListener('change', updateTotals);

    // ── Utils ─────────────────────────────────────────────────────────────
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const [y, m, d] = String(dateStr).substring(0, 10).split('-');
        return `${d}/${m}/${y}`;
    }

    function formatMoney(val) {
        return '$' + (val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
});
