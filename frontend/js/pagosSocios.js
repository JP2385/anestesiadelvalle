import toast from './toast.js';
import { userRealNames } from './userLabels.js';

document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    // ── Referencias DOM ──────────────────────────────────────────────────
    const btnNuevoPago = document.getElementById('btn-nuevo-pago');
    const pagoFormModal = document.getElementById('pago-form-modal');
    const closeFormModal = document.getElementById('close-form-modal');
    const pagoDetailModal = document.getElementById('pago-detail-modal');
    const closeDetailModal = document.getElementById('close-detail-modal');
    const pagoForm = document.getElementById('pago-form');
    const pagoTableBody = document.getElementById('pago-table-body');

    const editPagoId = document.getElementById('edit-pago-id');
    const btnGuardarPago = document.getElementById('btn-guardar-pago');
    const liquidacionesChecklist = document.getElementById('liquidaciones-checklist');

    // ── Init ──────────────────────────────────────────────────────────────
    loadPagos();

    // ── Cerrar modales ────────────────────────────────────────────────────
    closeFormModal.addEventListener('click', () => { pagoFormModal.style.display = 'none'; });
    closeDetailModal.addEventListener('click', () => { pagoDetailModal.style.display = 'none'; });

    window.addEventListener('click', (e) => {
        if (e.target === pagoFormModal) pagoFormModal.style.display = 'none';
        if (e.target === pagoDetailModal) pagoDetailModal.style.display = 'none';
    });

    // ── Abrir modal nuevo pago ────────────────────────────────────────────
    btnNuevoPago.addEventListener('click', async () => {
        document.getElementById('form-modal-title').textContent = 'Nuevo Pago a Socios';
        editPagoId.value = '';
        btnGuardarPago.textContent = 'Generar Pago a Socios';
        pagoForm.reset();
        await loadLiquidacionesDisponibles([]);
        pagoFormModal.style.display = 'block';
    });

    // ── Cargar liquidaciones disponibles para el checklist ────────────────
    async function loadLiquidacionesDisponibles(yaSeleccionadas) {
        liquidacionesChecklist.innerHTML = '<p class="liq-empty">Cargando liquidaciones disponibles...</p>';
        try {
            const response = await fetch(`${apiUrl}/pagos-socios/liquidaciones-disponibles`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (!data.success) {
                liquidacionesChecklist.innerHTML = '<p class="liq-empty">Error al cargar liquidaciones</p>';
                return;
            }

            const idsSeleccionados = new Set((yaSeleccionadas || []).map(String));
            const liquidaciones = data.liquidaciones;

            if (!liquidaciones.length && idsSeleccionados.size === 0) {
                liquidacionesChecklist.innerHTML = '<p class="liq-empty">No hay liquidaciones disponibles</p>';
                return;
            }

            liquidacionesChecklist.innerHTML = liquidaciones.map(l => `
                <div class="liq-checklist-row">
                    <input type="checkbox" value="${l._id}" ${idsSeleccionados.has(l._id) ? 'checked' : ''}>
                    <span>${formatDate(l.fecha)} — ${l.origen} — ${formatMoney(l.montoTotalCobrado)} (${l.cantidadAnestesias} anestesias)</span>
                </div>
            `).join('');
        } catch {
            liquidacionesChecklist.innerHTML = '<p class="liq-empty">Error de conexión</p>';
        }
    }

    // ── Submit formulario ─────────────────────────────────────────────────
    pagoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const liquidaciones = Array.from(liquidacionesChecklist.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        if (!liquidaciones.length) {
            toast.error('Seleccioná al menos una liquidación');
            return;
        }

        const payload = { liquidaciones };

        const id = editPagoId.value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${apiUrl}/pagos-socios/${id}` : `${apiUrl}/pagos-socios`;

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
                toast.success(id ? 'Pago a socios actualizado' : 'Pago a socios generado');
                pagoFormModal.style.display = 'none';
                loadPagos();
            } else {
                toast.error(data.message || 'Error al guardar');
            }
        } catch {
            toast.error('Error de conexión');
        }
    });

    // ── Cargar lista de pagos ──────────────────────────────────────────────
    async function loadPagos() {
        try {
            const response = await fetch(`${apiUrl}/pagos-socios`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (data.success) {
                renderTable(data.pagos);
            } else {
                toast.error('Error al cargar pagos a socios');
            }
        } catch {
            toast.error('Error de conexión');
        }
    }

    function renderTable(pagos) {
        pagoTableBody.innerHTML = '';

        if (!pagos.length) {
            pagoTableBody.innerHTML = '<tr><td colspan="7" class="liq-empty">No hay pagos a socios registrados</td></tr>';
            return;
        }

        const badgeClass = { pendiente: 'badge-pendiente', 'pagado parcial': 'badge-parcial', pagado: 'badge-pagado' };

        pagos.forEach(pago => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(pago.fechaDesde)}</td>
                <td>${formatDate(pago.fechaHasta)}</td>
                <td>${pago.cantidadLiquidaciones}</td>
                <td>${pago.cantidadSocios}</td>
                <td>${pago.estado === 'pagado' ? formatMoney(pago.totalPagado) : formatMoney(pago.totalDesembolso)}</td>
                <td><span class="${badgeClass[pago.estado] || 'badge-pendiente'}">${pago.estado}</span></td>
                <td>
                    <button class="action-btn ver-btn" data-id="${pago._id}">Ver</button>
                    <button class="action-btn edit-btn" data-id="${pago._id}">Editar</button>
                    <button class="action-btn delete-btn" data-id="${pago._id}">Eliminar</button>
                </td>
            `;
            pagoTableBody.appendChild(tr);
        });

        pagoTableBody.querySelectorAll('.ver-btn').forEach(btn =>
            btn.addEventListener('click', () => openDetail(btn.dataset.id))
        );
        pagoTableBody.querySelectorAll('.edit-btn').forEach(btn =>
            btn.addEventListener('click', () => openEdit(btn.dataset.id))
        );
        pagoTableBody.querySelectorAll('.delete-btn').forEach(btn =>
            btn.addEventListener('click', () => deletePago(btn.dataset.id))
        );
    }

    // ── Editar (fechas + liquidaciones incluidas) ──────────────────────────
    async function openEdit(id) {
        try {
            const response = await fetch(`${apiUrl}/pagos-socios/${id}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (!data.success) { toast.error('Error al cargar pago a socios'); return; }

            const { pago } = data;

            document.getElementById('form-modal-title').textContent = 'Editar Pago a Socios';
            editPagoId.value = pago._id;
            btnGuardarPago.textContent = 'Guardar cambios';

            await loadLiquidacionesDisponibles(pago.liquidaciones.map(l => l._id));

            pagoFormModal.style.display = 'block';
        } catch {
            toast.error('Error de conexión');
        }
    }

    // ── Ver detalle / gestionar socios ─────────────────────────────────────
    async function openDetail(id) {
        try {
            const response = await fetch(`${apiUrl}/pagos-socios/${id}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (!data.success) { toast.error('Error al cargar detalle'); return; }

            const { pago, socios } = data;

            document.getElementById('detail-modal-title').textContent =
                `Pago a Socios — ${formatDate(pago.fechaDesde)} al ${formatDate(pago.fechaHasta)}`;

            renderPagoMasivoBar(id, pago, socios);
            renderSociosDetail(id, socios);
            actualizarTotalDesembolso();

            const btnDescargarExcel = document.getElementById('btn-descargar-excel');
            const newBtnDescargar = btnDescargarExcel.cloneNode(true); // limpia listeners previos
            btnDescargarExcel.replaceWith(newBtnDescargar);
            newBtnDescargar.addEventListener('click', () => descargarExcel(id, pago));

            pagoDetailModal.style.display = 'block';
        } catch {
            toast.error('Error de conexión');
        }
    }

    // ── Descargar Excel con el monto a abonar por socio ────────────────────
    function descargarExcel(id, pago) {
        fetch(`${apiUrl}/pagos-socios/${id}/excel`, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        })
            .then(r => {
                if (!r.ok) throw new Error();
                return r.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.setAttribute('download', `pago-socios-${formatDate(pago.fechaDesde).replaceAll('/', '-')}-a-${formatDate(pago.fechaHasta).replaceAll('/', '-')}.xlsx`);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(() => toast.error('Error al descargar el Excel'));
    }

    // ── Barra de pago masivo (una sola fecha para todo el período) ────────
    function renderPagoMasivoBar(pagoId, pago, socios) {
        const barPendiente = document.getElementById('detail-pago-masivo-bar');
        const barCompletado = document.getElementById('detail-pago-completado-bar');
        const hayPendientes = socios.some(s => !s.pagado);

        if (!hayPendientes) {
            barPendiente.style.display = 'none';
            barCompletado.style.display = 'block';
            barCompletado.textContent = `✓ Pago registrado el ${formatDate(pago.fechaPago)}`;
            return;
        }

        barCompletado.style.display = 'none';
        barPendiente.style.display = 'flex';

        const fechaInput = document.getElementById('pago-masivo-fecha');
        fechaInput.value = pago.fechaPago ? pago.fechaPago.substring(0, 10) : '';

        const btn = document.getElementById('btn-registrar-pago-masivo');
        const newBtn = btn.cloneNode(true); // limpia listeners previos
        btn.replaceWith(newBtn);
        newBtn.addEventListener('click', () => registrarPagoMasivo(pagoId));
    }

    function renderSociosDetail(pagoId, socios) {
        const tbody = document.getElementById('detail-socios-body');
        const sociosOrdenados = [...socios].sort((a, b) =>
            (userRealNames[a.username] || a.username).localeCompare(userRealNames[b.username] || b.username, 'es')
        );
        tbody.innerHTML = sociosOrdenados.map(s => renderSocioRows(s)).join('');

        socios.forEach(s => {
            const row = tbody.querySelector(`[data-socio-row="${s.userId}"]`);
            const detalleRow = tbody.querySelector(`[data-socio-detalle="${s.userId}"]`);
            if (!row || !detalleRow) return;

            const toggleBtn = row.querySelector('.expand-toggle');
            const toggle = () => {
                const abrir = detalleRow.style.display === 'none';
                detalleRow.style.display = abrir ? 'table-row' : 'none';
                toggleBtn.textContent = abrir ? '▾' : '▸';
            };
            toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
            row.addEventListener('click', toggle);

            if (s.pagado) return; // sin inputs editables

            detalleRow.querySelector('.btn-add-aporte')?.addEventListener('click', () => { addDedRow(detalleRow, 'aporte'); recalcularPagoNeto(row, detalleRow); });
            detalleRow.querySelector('.btn-add-deduccion')?.addEventListener('click', () => { addDedRow(detalleRow, 'deduccion'); recalcularPagoNeto(row, detalleRow); });

            detalleRow.querySelectorAll('.ded-row').forEach(dr => bindDedRowEvents(dr, row, detalleRow));

            row.querySelector('.socio-deuda-input')?.addEventListener('click', (e) => e.stopPropagation());
            row.querySelector('.socio-deuda-input')?.addEventListener('input', () => recalcularPagoNeto(row, detalleRow));
        });

        const btnGuardarTodos = document.getElementById('btn-guardar-todos');
        const hayPendientes = socios.some(s => !s.pagado);
        btnGuardarTodos.style.display = hayPendientes ? 'inline-block' : 'none';

        const newBtn = btnGuardarTodos.cloneNode(true); // limpia listeners previos
        btnGuardarTodos.replaceWith(newBtn);
        newBtn.addEventListener('click', () => guardarTodosLosSocios(pagoId));
    }

    // ── Total a desembolsar: suma de pagos netos positivos de socios pendientes ──
    function actualizarTotalDesembolso() {
        const rows = document.querySelectorAll('#detail-socios-body tr[data-socio-row]');
        let total = 0;
        rows.forEach(row => {
            if (!row.querySelector('.socio-deuda-input')) return; // socio ya pagado, no cuenta
            const pagoNeto = parseMoney(row.querySelector('.pago-neto-val').textContent);
            if (pagoNeto > 0) total += pagoNeto;
        });
        document.getElementById('total-desembolso-val').textContent = formatMoney(total);
    }

    function renderSocioRows(s) {
        const pagoNetoClass = s.pagoNeto >= 0 ? 'pago-neto-positivo' : 'pago-neto-negativo';
        const tieneConceptos = (s.aportes?.length || 0) + (s.deducciones?.length || 0) > 0;

        const filaPrincipal = `
            <tr class="socio-row ${s.pagado ? 'pagado' : ''}" data-socio-row="${s.userId}" data-saldo-acumulado="${s.saldoAcumulado}">
                <td><button type="button" class="expand-toggle">${tieneConceptos ? '▾' : '▸'}</button></td>
                <td>${userRealNames[s.username] || s.username}</td>
                <td>${formatMoney(s.saldoAcumulado)}</td>
                <td class="total-aportes-val">${formatMoney(s.totalAportes)}</td>
                <td class="total-deducciones-val">${formatMoney(s.totalDeducciones)}</td>
                <td>
                    ${s.pagado
                        ? formatMoney(s.deudaArrastrada)
                        : `<input type="number" step="0.01" class="socio-deuda-input" value="${s.deudaArrastrada}">`}
                </td>
                <td class="pago-neto-val ${pagoNetoClass}">${formatMoney(s.pagoNeto)}</td>
                <td>${s.pagado ? `<span class="socio-pagado-tag">✓ Pagado — ${formatMoney(s.montoPagado)}</span>` : 'Pendiente'}</td>
            </tr>
        `;

        const aportesRows = (s.aportes || []).map(a => dedRowHtml('aporte', a)).join('');
        const deduccionesRows = (s.deducciones || []).map(d => dedRowHtml('deduccion', d)).join('');

        const filaDetalle = `
            <tr class="socio-detalle-row" data-socio-detalle="${s.userId}" style="display:${tieneConceptos ? 'table-row' : 'none'};">
                <td colspan="8">
                    <div class="socio-detalle-grid">
                        <div>
                            <h5>Aportes ${s.pagado ? '' : '<button type="button" class="liq-add-btn btn-add-aporte">+ Agregar</button>'}</h5>
                            <div class="aportes-container">${aportesRows}</div>
                        </div>
                        <div>
                            <h5>Deducciones extra ${s.pagado ? '' : '<button type="button" class="liq-add-btn btn-add-deduccion">+ Agregar</button>'}</h5>
                            <div class="deducciones-container">${deduccionesRows}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `;

        return filaPrincipal + filaDetalle;
    }

    function dedRowHtml(tipo, data = {}) {
        return `
            <div class="ded-row" data-tipo="${tipo}">
                <input type="text" placeholder="Concepto (ej: insumos, adelanto)" class="ded-concepto" value="${data.concepto || ''}">
                <input type="number" min="0" step="0.01" placeholder="Monto" class="ded-monto" value="${data.monto || ''}">
                <button type="button" class="liq-remove-btn">✕</button>
            </div>
        `;
    }

    function addDedRow(detalleRow, tipo) {
        const container = detalleRow.querySelector(tipo === 'aporte' ? '.aportes-container' : '.deducciones-container');
        const div = document.createElement('div');
        div.innerHTML = dedRowHtml(tipo);
        const row = div.firstElementChild;
        container.appendChild(row);
        const socioRow = detalleRow.previousElementSibling;
        bindDedRowEvents(row, socioRow, detalleRow);
    }

    function bindDedRowEvents(dedRow, socioRow, detalleRow) {
        dedRow.querySelector('.liq-remove-btn').addEventListener('click', () => {
            dedRow.remove();
            recalcularPagoNeto(socioRow, detalleRow);
        });
        dedRow.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => recalcularPagoNeto(socioRow, detalleRow)));
    }

    // ── Recalcula en vivo el pago neto de un socio sin guardar ────────────
    function recalcularPagoNeto(socioRow, detalleRow) {
        const saldoAcumulado = parseFloat(socioRow.dataset.saldoAcumulado) || 0;

        const totalAportes = Array.from(detalleRow.querySelectorAll('.aportes-container .ded-row')).reduce((sum, row) => {
            return sum + (parseFloat(row.querySelector('.ded-monto').value) || 0);
        }, 0);

        const totalDeducciones = Array.from(detalleRow.querySelectorAll('.deducciones-container .ded-row')).reduce((sum, row) => {
            return sum + (parseFloat(row.querySelector('.ded-monto').value) || 0);
        }, 0);

        const deudaArrastrada = parseFloat(socioRow.querySelector('.socio-deuda-input')?.value) || 0;
        const pagoNeto = saldoAcumulado + totalAportes - totalDeducciones - deudaArrastrada;

        socioRow.querySelector('.total-aportes-val').textContent = formatMoney(totalAportes);
        socioRow.querySelector('.total-deducciones-val').textContent = formatMoney(totalDeducciones);

        const pagoNetoEl = socioRow.querySelector('.pago-neto-val');
        pagoNetoEl.textContent = formatMoney(pagoNeto);
        pagoNetoEl.classList.toggle('pago-neto-positivo', pagoNeto >= 0);
        pagoNetoEl.classList.toggle('pago-neto-negativo', pagoNeto < 0);

        actualizarTotalDesembolso();
    }

    // ── Recolecta del DOM y persiste aportes/deducciones/deudaArrastrada de todos los socios
    // pendientes en un solo pedido. Devuelve true si se guardó bien (o no había nada que guardar).
    async function guardarConceptosSocios(pagoId, { silencioso = false } = {}) {
        const rows = document.querySelectorAll('#detail-socios-body tr[data-socio-row]');
        const socios = [];

        for (const row of rows) {
            const deudaInput = row.querySelector('.socio-deuda-input');
            if (!deudaInput) continue; // socio ya pagado, no editable

            const userId = row.dataset.socioRow;
            const detalleRow = row.nextElementSibling;

            const aportes = Array.from(detalleRow.querySelectorAll('.aportes-container .ded-row')).map(dr => ({
                concepto: dr.querySelector('.ded-concepto').value.trim(),
                monto: parseFloat(dr.querySelector('.ded-monto').value) || 0
            })).filter(a => a.concepto && a.monto > 0);

            const deducciones = Array.from(detalleRow.querySelectorAll('.deducciones-container .ded-row')).map(dr => ({
                concepto: dr.querySelector('.ded-concepto').value.trim(),
                monto: parseFloat(dr.querySelector('.ded-monto').value) || 0
            })).filter(d => d.concepto && d.monto > 0);

            const deudaArrastrada = parseFloat(deudaInput.value) || 0;

            socios.push({ userId, aportes, deducciones, deudaArrastrada });
        }

        if (!socios.length) return true; // nada pendiente que guardar

        try {
            const response = await fetch(`${apiUrl}/pagos-socios/${pagoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({ socios })
            });

            const data = await response.json();

            if (data.success) {
                if (!silencioso) toast.success('Cambios guardados');
                return true;
            }
            toast.error(data.message || 'Error al guardar');
            return false;
        } catch {
            toast.error('Error de conexión');
            return false;
        }
    }

    async function guardarTodosLosSocios(pagoId) {
        const ok = await guardarConceptosSocios(pagoId);
        if (ok) openDetail(pagoId);
    }

    // ── Registrar el pago de todo el período de una vez ───────────────────
    async function registrarPagoMasivo(pagoId) {
        const fechaPago = document.getElementById('pago-masivo-fecha').value;
        if (!fechaPago) {
            toast.error('Ingresá la fecha de pago');
            return;
        }

        const rows = document.querySelectorAll('#detail-socios-body tr[data-socio-row]');
        const montos = [];
        for (const row of rows) {
            if (!row.querySelector('.socio-deuda-input')) continue; // socio ya pagado
            const userId = row.dataset.socioRow;
            const pagoNetoEl = row.querySelector('.pago-neto-val');
            const pagoNeto = parseMoney(pagoNetoEl.textContent);
            // Si el pago neto es negativo, el socio queda debiendo y no se le paga nada
            montos.push({ userId, montoPagado: Math.max(0, pagoNeto) });
        }

        if (!montos.length) {
            toast.error('No hay socios pendientes de pago');
            return;
        }

        if (!confirm('¿Confirmás el pago a todos los socios pendientes con esta fecha? Esta acción bloqueará futuras ediciones de aportes/deducciones.')) return;

        // Persistir primero los aportes/deducciones/deuda tipeados en el form — si no se hizo
        // click en "Guardar cambios" antes, esos conceptos solo existen en el DOM y se perderían.
        const guardado = await guardarConceptosSocios(pagoId, { silencioso: true });
        if (!guardado) {
            toast.error('No se pudo guardar los conceptos cargados; el pago no fue registrado');
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/pagos-socios/${pagoId}/pago`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({ fechaPago, montos })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Pago registrado');
                openDetail(pagoId);
                loadPagos();
            } else {
                toast.error(data.message || 'Error al registrar el pago');
            }
        } catch {
            toast.error('Error de conexión');
        }
    }

    // ── Eliminar ──────────────────────────────────────────────────────────
    async function deletePago(id) {
        if (!confirm('¿Seguro que querés eliminar este pago a socios? Esta acción no se puede deshacer.')) return;

        try {
            const response = await fetch(`${apiUrl}/pagos-socios/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Pago a socios eliminado');
                loadPagos();
            } else {
                toast.error(data.message || 'Error al eliminar');
            }
        } catch {
            toast.error('Error de conexión');
        }
    }

    // ── Utils ─────────────────────────────────────────────────────────────
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const [y, m, d] = String(dateStr).substring(0, 10).split('-');
        return `${d}/${m}/${y}`;
    }

    function formatMoney(val) {
        return '$' + (val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function parseMoney(text) {
        // "$ 1.234,56" → 1234.56
        const clean = text.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    }
});
