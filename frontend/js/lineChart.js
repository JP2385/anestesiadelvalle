// Gráfico de línea simple en SVG nativo, sin dependencias externas.
// series: [{ label, color, values: number[] }], labels: string[] (eje X)
// formatValue: (number) => string — formato del valor mostrado en el tooltip (default: moneda es-AR)
export function renderLineChart(container, labels, series, formatValue = formatMoneyDefault) {
    const width = 640;
    const height = 240;
    const padding = { top: 16, right: 16, bottom: 28, left: 64 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    if (!labels.length) {
        container.innerHTML = '<p class="liq-empty">No hay datos suficientes para graficar</p>';
        return;
    }

    const allValues = series.flatMap(s => s.values);
    const maxVal = Math.max(0, ...allValues);
    const minVal = Math.min(0, ...allValues);
    const range = maxVal - minVal || 1;

    const xStep = labels.length > 1 ? plotW / (labels.length - 1) : 0;
    const xAt = i => padding.left + i * xStep;
    const yAt = v => padding.top + plotH - ((v - minVal) / range) * plotH;

    const gridLines = 4;
    let gridSvg = '';
    for (let g = 0; g <= gridLines; g++) {
        const v = minVal + (range / gridLines) * g;
        const y = yAt(v);
        gridSvg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="currentColor" stroke-opacity="0.12" />`;
        gridSvg += `<text x="${padding.left - 8}" y="${y + 4}" font-size="10" text-anchor="end" fill="currentColor" opacity="0.6">${formatShort(v)}</text>`;
    }

    const xLabelsSvg = labels.map((l, i) => {
        if (labels.length > 8 && i % Math.ceil(labels.length / 8) !== 0) return '';
        return `<text x="${xAt(i)}" y="${height - 6}" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">${l}</text>`;
    }).join('');

    const seriesSvg = series.map(s => {
        const points = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
        const dots = s.values.map((v, i) => `
            <circle cx="${xAt(i)}" cy="${yAt(v)}" r="4" fill="${s.color}"
                class="chart-point"
                data-label="${escapeAttr(s.label)}" data-period="${escapeAttr(labels[i])}" data-value="${escapeAttr(formatValue(v))}" />
        `).join('');
        return `<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="2" />${dots}`;
    }).join('');

    const legendSvg = series.map((s, i) => `
        <span class="chart-legend-item"><span class="chart-legend-dot" style="background:${s.color}"></span>${s.label}</span>
    `).join('');

    container.innerHTML = `
        <div class="chart-wrapper" style="position:relative;">
            <svg viewBox="0 0 ${width} ${height}" class="line-chart-svg" preserveAspectRatio="xMidYMid meet">
                ${gridSvg}
                ${seriesSvg}
                ${xLabelsSvg}
            </svg>
            <div class="chart-tooltip" style="display:none;"></div>
        </div>
        <div class="chart-legend">${legendSvg}</div>
    `;

    attachTooltipHandlers(container);
}

function attachTooltipHandlers(container) {
    const wrapper = container.querySelector('.chart-wrapper');
    const tooltip = container.querySelector('.chart-tooltip');
    const svg = container.querySelector('.line-chart-svg');

    svg.querySelectorAll('.chart-point').forEach(point => {
        point.addEventListener('mouseenter', () => {
            const { label, period, value } = point.dataset;
            tooltip.innerHTML = `<strong>${label}</strong><br>${period}: ${value}`;
            tooltip.style.display = 'block';
        });
        point.addEventListener('mousemove', (e) => {
            const rect = wrapper.getBoundingClientRect();
            let x = e.clientX - rect.left + 12;
            let y = e.clientY - rect.top + 12;
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
        });
        point.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
}

function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
}

function formatMoneyDefault(val) {
    return '$' + (val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatShort(v) {
    const abs = Math.abs(v);
    if (abs >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (abs >= 1000) return (v / 1000).toFixed(0) + 'k';
    return String(Math.round(v));
}
