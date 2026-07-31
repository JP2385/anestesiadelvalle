import toast from './toast.js';
import { renderLineChart } from './lineChart.js';

document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    loadDashboard();

    async function loadDashboard() {
        try {
            const response = await fetch(`${apiUrl}/dashboard/individual`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (!data.success) {
                toast.error('Error al cargar tu informe de ingresos');
                return;
            }

            renderSaldoActual(data);
            renderProximoPago(data.proximoPago);
            renderEvolucionMensual(data.evolucionMensual);
            renderHistorialPagos(data.historialPagos);
        } catch {
            toast.error('Error de conexión');
        }
    }

    function renderSaldoActual({ saldoTotalHistorico, deudaActual }) {
        const el = document.getElementById('saldo-actual-card');
        const deudaHtml = deudaActual > 0
            ? `<p class="deuda-warning">Tenés una deuda pendiente de ${formatMoney(deudaActual)}</p>`
            : '';
        el.innerHTML = `
            <h3>Saldo actual</h3>
            <p class="saldo-total-val ${saldoTotalHistorico >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatMoney(saldoTotalHistorico)}</p>
            <p class="saldo-total-hint">Saldo acumulado en liquidaciones aún no incluidas en un pago a socios</p>
            ${deudaHtml}
        `;
    }

    function renderProximoPago(proximoPago) {
        const el = document.getElementById('proximo-pago-card');
        if (!proximoPago) {
            el.innerHTML = `<h3>Próximo pago</h3><p class="liq-empty">No hay ningún período de pago abierto actualmente</p>`;
            return;
        }
        const pagoClass = proximoPago.pagoNeto >= 0 ? 'valor-positivo' : 'valor-negativo';
        el.innerHTML = `
            <h3>Próximo pago</h3>
            <p>Período: ${formatDate(proximoPago.fechaDesde)} al ${formatDate(proximoPago.fechaHasta)}</p>
            <p class="pago-neto-val ${pagoClass}">${formatMoney(proximoPago.pagoNeto)}</p>
        `;
    }

    function renderEvolucionMensual(evolucionMensual) {
        const chartContainer = document.getElementById('historial-chart');
        renderLineChart(chartContainer, evolucionMensual.map(m => formatPeriodo(m.periodo)), [
            { label: 'Total', color: '#0056b3', values: evolucionMensual.map(m => m.total) },
            { label: 'Neuquén', color: '#1a7a32', values: evolucionMensual.map(m => m.neuquen) },
            { label: 'Río Negro', color: '#c0392b', values: evolucionMensual.map(m => m.rioNegro) }
        ]);
    }

    function formatPeriodo(periodo) {
        const [y, m] = periodo.split('-');
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${meses[parseInt(m, 10) - 1]} ${y}`;
    }

    const LIMITE_TARJETAS_PAGO = 6;

    function renderHistorialPagos(historialPagos) {
        const container = document.getElementById('historial-pagos-container');
        if (!historialPagos.length) {
            container.innerHTML = '<p class="liq-empty">No participaste todavía de ningún período de pago</p>';
            return;
        }
        const recientes = historialPagos.slice(0, LIMITE_TARJETAS_PAGO);
        container.innerHTML = recientes.map(p => renderPagoDetalle(p)).join('');
    }

    function renderPagoDetalle(p) {
        const totalDescuentos = (p.deducciones || []).reduce((s, d) => s + d.monto, 0);
        const totalAportes = (p.aportes || []).reduce((s, a) => s + a.monto, 0);

        const descuentosHtml = (p.deducciones || []).length
            ? p.deducciones.map(d => `<li>${d.concepto}: <strong>${formatMoney(d.monto)}</strong></li>`).join('')
            : '<li class="sin-conceptos">Sin descuentos</li>';

        const aportesHtml = (p.aportes || []).length
            ? p.aportes.map(a => `<li>${a.concepto}: <strong>${formatMoney(a.monto)}</strong></li>`).join('')
            : '<li class="sin-conceptos">Sin aportes</li>';

        const deudaHtml = p.deudaActual > 0
            ? `<div class="pago-deuda-warning">Quedaste debiendo ${formatMoney(p.deudaActual)} — se descontará del próximo pago</div>`
            : '';

        const liquidacionesHtml = (p.liquidaciones || []).length
            ? p.liquidaciones.map(l => {
                const dedPersonalLiq = l.parteSocietaria - l.parteNeta;
                return `
                <tr>
                    <td>${formatDate(l.fecha)}</td>
                    <td>${l.origen}</td>
                    <td>${formatMoney(l.parteSocietaria)}</td>
                    <td class="${dedPersonalLiq >= 0 ? 'valor-negativo' : 'valor-positivo'}">${formatMoney(Math.abs(dedPersonalLiq))}</td>
                    <td>${formatMoney(l.ingresadoEnCuenta)}</td>
                    <td class="${l.saldo >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatMoney(l.saldo)}</td>
                </tr>
            `;
            }).join('')
            : '<tr><td colspan="6" class="liq-empty">Sin liquidaciones en este período</td></tr>';

        const saldoLiquidaciones = (p.liquidaciones || []).reduce((s, l) => s + l.saldo, 0);
        const totalLiquidacionesFooter = (p.liquidaciones || []).length ? `
            <tfoot>
                <tr class="detalle-liq-subtotal">
                    <td colspan="5">Saldo de liquidaciones de este período (ya neto de deducciones personales)</td>
                    <td class="${saldoLiquidaciones >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatMoney(saldoLiquidaciones)}</td>
                </tr>
                <tr class="detalle-liq-ajuste">
                    <td colspan="5">− Otros descuentos aplicados</td>
                    <td class="valor-negativo">${formatMoney(totalDescuentos)}</td>
                </tr>
                <tr class="detalle-liq-ajuste">
                    <td colspan="5">+ Total aportado (a devolver)</td>
                    <td>${formatMoney(totalAportes)}</td>
                </tr>
                <tr class="detalle-liq-total">
                    <td colspan="5">= ${p.pagado ? 'Depositado finalmente' : 'A depositar (proyectado)'}</td>
                    <td class="${p.pagoNeto >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatMoney(p.pagado ? p.montoPagado : p.pagoNeto)}</td>
                </tr>
            </tfoot>
        ` : '';

        return `
            <div class="pago-detalle-card">
                <div class="pago-detalle-header">
                    <div>
                        <strong>Período ${formatDate(p.fechaDesde)} — ${formatDate(p.fechaHasta)}</strong>
                        <span class="pago-detalle-subtitulo">${p.fechaPago ? 'Pagado el ' + formatDate(p.fechaPago) : 'Pago pendiente'}</span>
                    </div>
                    <span class="${p.pagado ? 'badge-pagado' : 'badge-pendiente'}">${p.pagado ? 'Pagado' : 'Pendiente'}</span>
                </div>
                <div class="pago-detalle-grid">
                    <div class="pago-detalle-item">
                        <span class="resumen-label">Le correspondía cobrar (por participación)</span>
                        <span class="resumen-val">${formatMoney(p.correspondiaCobrar)}</span>
                    </div>
                    <div class="pago-detalle-item">
                        <span class="resumen-label">Deducciones personales (descontadas por la asociación)</span>
                        <span class="resumen-val valor-negativo">${formatMoney(Math.abs(p.netoDeduccionesPersonales))}</span>
                    </div>
                    <div class="pago-detalle-item">
                        <span class="resumen-label">Ya ingresado por otras vías (directo a tu cuenta o depositado por la asociación)</span>
                        <span class="resumen-val valor-negativo">${formatMoney(p.yaIngresadoOtrasVias)}</span>
                    </div>
                    <div class="pago-detalle-item">
                        <span class="resumen-label">Otros descuentos aplicados</span>
                        <span class="resumen-val valor-negativo">${formatMoney(totalDescuentos)}</span>
                    </div>
                    <div class="pago-detalle-item">
                        <span class="resumen-label">Total aportado (a devolver)</span>
                        <span class="resumen-val">${formatMoney(totalAportes)}</span>
                    </div>
                    <div class="pago-detalle-item">
                        <span class="resumen-label">${p.pagado ? 'Depositado finalmente' : 'A depositar (proyectado)'}</span>
                        <span class="resumen-val ${p.pagoNeto >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatMoney(p.pagado ? p.montoPagado : p.pagoNeto)}</span>
                    </div>
                </div>
                <div class="pago-detalle-conceptos">
                    <div>
                        <h5>Otros descuentos aplicados</h5>
                        <ul>${descuentosHtml}</ul>
                    </div>
                    <div>
                        <h5>Aportes a devolver</h5>
                        <ul>${aportesHtml}</ul>
                    </div>
                </div>
                ${deudaHtml}
                <div class="pago-detalle-liquidaciones">
                    <h5>Detalle por liquidación</h5>
                    <div class="liq-table-wrapper">
                        <table class="detalle-liq-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Origen</th>
                                    <th>Le correspondía (por participación)</th>
                                    <th>Deducciones personales</th>
                                    <th>Ya ingresado</th>
                                    <th>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>${liquidacionesHtml}</tbody>
                            ${totalLiquidacionesFooter}
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const [y, m, d] = String(dateStr).substring(0, 10).split('-');
        return `${d}/${m}/${y}`;
    }

    function formatMoney(val) {
        return '$' + (val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
});
