// La reserva de ganancias (sólo Río Negro) pasó del 29% al 32%. El porcentaje
// se guarda en cada liquidación para que el cambio no recalcule el histórico.

const test = require('node:test');
const assert = require('node:assert/strict');

const { calcularDistribucion } = require('../src/app/controllers/liquidacionController');

const HIST = 'aaaaaaaaaaaaaaaaaaaaaaa1';

const periods = [{
    _id: 'p1',
    fechaInicio: new Date('2024-01-01T00:00:00Z'),
    participaciones: [{ userId: HIST, porcentaje: 100 }]
}];

function liq(extra = {}) {
    return {
        origen: 'Río Negro',
        anestesias: [{ fechaPractica: new Date('2026-09-10Z'), montoFacturado: 1_000_000 }],
        ingresos: [],
        deduccionesGrupales: [],
        deduccionesPersonales: [],
        reservaGanancias: true,
        dedPersonalesInternas: false,
        ...extra
    };
}

test('una liquidación nueva reserva el 32%', () => {
    const d = calcularDistribucion(liq({ porcentajeReserva: 0.32 }), periods);
    assert.equal(d.porcentajeReserva, 0.32);
    assert.equal(d.montoReserva, 320_000);
});

test('una liquidación vieja (sin el campo) sigue al 29%', () => {
    // Lo importante del diseño: cambiar la alícuota no debe recalcular lo que
    // ya se liquidó y se cobró.
    const d = calcularDistribucion(liq(), periods);
    assert.equal(d.porcentajeReserva, 0.29);
    assert.equal(d.montoReserva, 290_000);
});

test('porcentajeReserva null o 0 cae al histórico', () => {
    assert.equal(calcularDistribucion(liq({ porcentajeReserva: null }), periods).montoReserva, 290_000);
    assert.equal(calcularDistribucion(liq({ porcentajeReserva: 0 }), periods).montoReserva, 290_000);
});

test('sin reservaGanancias no se reserva nada, con cualquier porcentaje', () => {
    const d = calcularDistribucion(
        liq({ reservaGanancias: false, porcentajeReserva: 0.32 }), periods
    );
    assert.equal(d.montoReserva, 0);
});

test('la reserva sale del distribuible y se reparte por participación', () => {
    const d = calcularDistribucion(liq({ porcentajeReserva: 0.32 }), periods);
    const socio = d.distribucion.find(s => s.userId === HIST);
    // único socio al 100%: le toca toda la reserva y su parte neta es el resto
    assert.equal(socio.reserva, 320_000);
    assert.equal(socio.parteNeta, 680_000);
});
