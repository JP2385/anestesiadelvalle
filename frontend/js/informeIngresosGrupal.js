import toast from './toast.js';
import { renderLineChart } from './lineChart.js';

document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    const selectAnio = document.getElementById('filtro-anio');
    let aniosPoblados = false;

    loadDashboard();

    selectAnio.addEventListener('change', () => loadDashboard());

    async function loadDashboard() {
        try {
            const qs = selectAnio.value ? `?anio=${selectAnio.value}` : '';

            const response = await fetch(`${apiUrl}/dashboard/grupal${qs}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const data = await response.json();

            if (!data.success) {
                toast.error('Error al cargar el informe grupal');
                return;
            }

            if (!aniosPoblados) {
                poblarSelectAnio(data.aniosDisponibles);
                aniosPoblados = true;
                if (selectAnio.value && selectAnio.value !== '') {
                    loadDashboard();
                    return;
                }
            }

            renderEvolucion(data.evolucionMensual);
            renderFacturado(data.evolucionFacturado);
            renderComparativo(data.evolucionMensual, data.evolucionFacturado);
        } catch {
            toast.error('Error de conexión');
        }
    }

    function poblarSelectAnio(aniosDisponibles) {
        const anioActual = new Date().getFullYear();
        const seleccionado = aniosDisponibles.includes(anioActual) ? anioActual : (aniosDisponibles[0] || '');
        const opciones = aniosDisponibles.map(a => `<option value="${a}" ${a === seleccionado ? 'selected' : ''}>${a}</option>`).join('');
        selectAnio.innerHTML = `<option value="">Todos los años</option>${opciones}`;
        if (seleccionado) selectAnio.value = seleccionado;
    }

    function renderEvolucion(evolucionMensual) {
        const chartContainer = document.getElementById('evolucion-chart');
        renderLineChart(chartContainer, evolucionMensual.map(m => formatPeriodo(m.periodo)), [
            { label: 'Total', color: '#0056b3', values: evolucionMensual.map(m => m.total) },
            { label: 'Neuquén', color: '#1a7a32', values: evolucionMensual.map(m => m.neuquen) },
            { label: 'Río Negro', color: '#c0392b', values: evolucionMensual.map(m => m.rioNegro) }
        ]);

        const tbody = document.getElementById('evolucion-body');
        if (!evolucionMensual.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="liq-empty">No hay datos para el período seleccionado</td></tr>';
            return;
        }
        tbody.innerHTML = evolucionMensual.map(m => `
            <tr>
                <td>${formatPeriodo(m.periodo)}</td>
                <td>${formatMoney(m.neuquen)}</td>
                <td>${formatMoney(m.rioNegro)}</td>
                <td>${formatMoney(m.total)}</td>
            </tr>
        `).join('');
    }

    function renderFacturado(evolucionFacturado) {
        const chartContainer = document.getElementById('facturado-chart');
        renderLineChart(chartContainer, evolucionFacturado.map(m => formatPeriodo(m.periodo)), [
            { label: 'Total', color: '#0056b3', values: evolucionFacturado.map(m => m.total) },
            { label: 'Neuquén', color: '#1a7a32', values: evolucionFacturado.map(m => m.neuquen) },
            { label: 'Río Negro', color: '#c0392b', values: evolucionFacturado.map(m => m.rioNegro) }
        ]);

        const tbody = document.getElementById('facturado-body');
        if (!evolucionFacturado.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="liq-empty">No hay datos para el período seleccionado</td></tr>';
            return;
        }
        tbody.innerHTML = evolucionFacturado.map(m => `
            <tr>
                <td>${formatPeriodo(m.periodo)}</td>
                <td>${formatMoney(m.neuquen)}</td>
                <td>${formatMoney(m.rioNegro)}</td>
                <td>${formatMoney(m.total)}</td>
            </tr>
        `).join('');
    }

    function renderComparativo(evolucionMensual, evolucionFacturado) {
        const labels = evolucionMensual.map(m => formatPeriodo(m.periodo));
        const ambitos = [
            { key: 'total', chartId: 'comparativo-total-chart', pctId: 'comparativo-total-pct' },
            { key: 'neuquen', chartId: 'comparativo-neuquen-chart', pctId: 'comparativo-neuquen-pct' },
            { key: 'rioNegro', chartId: 'comparativo-rionegro-chart', pctId: 'comparativo-rionegro-pct' }
        ];
        for (const { key, chartId, pctId } of ambitos) {
            const chartContainer = document.getElementById(chartId);
            renderLineChart(chartContainer, labels, [
                { label: 'Facturado', color: '#856404', values: evolucionFacturado.map(m => m[key]) },
                { label: 'Distribuido', color: '#1a7a32', values: evolucionMensual.map(m => m[key]) }
            ]);

            const totalFacturado = evolucionFacturado.reduce((s, m) => s + m[key], 0);
            const totalDistribuido = evolucionMensual.reduce((s, m) => s + m[key], 0);
            const pctEl = document.getElementById(pctId);
            pctEl.textContent = totalFacturado > 0
                ? `${((totalDistribuido / totalFacturado) * 100).toFixed(1)}%`
                : '—';
        }
    }

    function formatPeriodo(periodo) {
        const [y, m] = periodo.split('-');
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${meses[parseInt(m, 10) - 1]} ${y}`;
    }

    function formatMoney(val) {
        return '$' + (val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
});
