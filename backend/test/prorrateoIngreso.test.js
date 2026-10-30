// Tests del prorrateo por ingreso/egreso al grupo.
// Corren con el runner de Node, sin dependencias: `npm test`.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ventanasDeParticipacion,
    aplicarProrrateo,
    controlarProrrateo,
    dentroDeVentana
} = require('../src/app/services/prorrateoIngreso');

// ── helpers ──────────────────────────────────────────────────────────────────

const HIST = 'aaaaaaaaaaaaaaaaaaaaaaa1'; // socio histórico
const JBO = 'aaaaaaaaaaaaaaaaaaaaaaa2';
const RRISO = 'aaaaaaaaaaaaaaaaaaaaaaa3';

function period(fechaInicio, participaciones) {
    return { fechaInicio: new Date(fechaInicio), participaciones };
}

function an(fecha, monto, userId = null) {
    return { fechaPractica: fecha ? new Date(fecha) : null, montoFacturado: monto, userId };
}

// Dos períodos: antes del 1/9/2026 JBO y RRISO están al 0% (no entraron);
// desde el 1/9 participan.
function periodosEstandar() {
    return [
        period('2026-01-01T00:00:00Z', [
            { userId: HIST, porcentaje: 100 },
            { userId: JBO, porcentaje: 0 },
            { userId: RRISO, porcentaje: 0 }
        ]),
        period('2026-09-01T00:00:00Z', [
            { userId: HIST, porcentaje: 50 },
            { userId: JBO, porcentaje: 25 },
            { userId: RRISO, porcentaje: 25 }
        ])
    ];
}

// ── ventanasDeParticipacion ──────────────────────────────────────────────────

test('deriva el ingreso desde la participación al 0%', () => {
    const v = ventanasDeParticipacion(periodosEstandar());

    assert.equal(v.has(HIST), false, 'un socio histórico no tiene ventana');
    assert.deepEqual(v.get(JBO).ingreso, new Date('2026-09-01T00:00:00Z'));
    assert.equal(v.get(JBO).egreso, null);
    assert.deepEqual(v.get(RRISO).ingreso, new Date('2026-09-01T00:00:00Z'));
});

test('deriva el egreso con el mismo mecanismo (vuelve a 0%)', () => {
    const periods = [
        ...periodosEstandar(),
        period('2026-12-01T00:00:00Z', [
            { userId: HIST, porcentaje: 75 },
            { userId: JBO, porcentaje: 25 },
            { userId: RRISO, porcentaje: 0 } // baja
        ])
    ];
    const v = ventanasDeParticipacion(periods);

    assert.deepEqual(v.get(RRISO).ingreso, new Date('2026-09-01T00:00:00Z'));
    assert.deepEqual(v.get(RRISO).egreso, new Date('2026-12-01T00:00:00Z'));
    assert.equal(v.get(JBO).egreso, null, 'JBO sigue activo');
});

test('un socio que estuvo desde el arranque no tiene ventana', () => {
    // nunca figura al 0%: su primer período ya lo tiene participando
    const v = ventanasDeParticipacion([
        period('2026-01-01T00:00:00Z', [{ userId: HIST, porcentaje: 100 }]),
        period('2026-09-01T00:00:00Z', [{ userId: HIST, porcentaje: 100 }])
    ]);
    assert.equal(v.size, 0);
});

test('el día del ingreso cuenta como dentro; el del egreso, como fuera', () => {
    const ventana = {
        ingreso: new Date('2026-09-01T00:00:00Z'),
        egreso: new Date('2026-12-01T00:00:00Z')
    };
    assert.equal(dentroDeVentana(new Date('2026-08-31'), ventana), false);
    assert.equal(dentroDeVentana(new Date('2026-09-01'), ventana), true, '>= ingreso');
    assert.equal(dentroDeVentana(new Date('2026-11-30'), ventana), true);
    assert.equal(dentroDeVentana(new Date('2026-12-01'), ventana), false, '< egreso');
    assert.equal(dentroDeVentana(null, ventana), null, 'sin fecha: no clasificable');
});

// ── aplicarProrrateo ─────────────────────────────────────────────────────────

test('ejemplo del usuario: 100 facturado, 50 posterior al 1/9 → 50%', () => {
    const doc = {
        anestesias: [an('2026-08-01', 50, JBO), an('2026-09-15', 50, JBO)],
        deduccionesGrupales: [{ concepto: 'INGRESOS BRUTOS', monto: 50 }]
    };
    const r = aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    assert.equal(r.socios.length, 1);
    assert.equal(r.socios[0].proporcion, 0.5);
    // la previa sale del pozo
    assert.equal(doc.anestesias.length, 1);
    assert.deepEqual(doc.anestesias[0].fechaPractica, new Date('2026-09-15'));
    // deducciones grupales al 50%: de 50 se toman 25
    assert.equal(doc.deduccionesGrupales[0].monto, 25);
});

test('las deducciones personales van completas y los ingresos no se tocan', () => {
    // El caso real: JBO y RRISO tienen FONDO APORTE DE ASOCIADOS, que no debe
    // prorratearse (hacerlo movería −222.812,78 en JBO).
    const doc = {
        anestesias: [an('2026-08-01', 50, JBO), an('2026-09-15', 50, JBO)],
        deduccionesGrupales: [{ concepto: 'IIBB', monto: 40 }],
        deduccionesPersonales: [
            { userId: JBO, concepto: 'FONDO APORTE DE ASOCIADOS', monto: 222812.78 }
        ],
        ingresos: [{ tipo: 'socio', userId: JBO, monto: 35483009.79 }]
    };
    aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    assert.equal(doc.deduccionesGrupales[0].monto, 20, 'grupal prorrateada');
    assert.equal(doc.deduccionesPersonales[0].monto, 222812.78, 'personal completa');
    assert.equal(doc.ingresos[0].monto, 35483009.79, 'ingresos sin tocar');
});

test('las anestesias del pozo del grupo (sin socio) no se tocan', () => {
    const doc = {
        anestesias: [
            an('2026-08-01', 1000, null), // del grupo: previa pero no es de un socio nuevo
            an('2026-08-01', 50, JBO),    // de JBO, previa a su ingreso
            an('2026-09-15', 50, JBO)
        ],
        deduccionesGrupales: [{ concepto: 'IIBB', monto: 110 }]
    };
    aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    assert.equal(doc.anestesias.length, 2);
    assert.ok(doc.anestesias.some(a => a.montoFacturado === 1000), 'la del grupo queda');
    assert.ok(!doc.anestesias.some(a => a.userId === JBO && a.montoFacturado === 50
        && a.fechaPractica.getUTCMonth() === 7), 'la previa de JBO sale');

    // factor sobre el bruto total: (1100 - 50) / 1100
    const esperado = Math.round(110 * (1050 / 1100) * 100) / 100;
    assert.equal(doc.deduccionesGrupales[0].monto, esperado);
});

test('un socio histórico no se prorratea aunque tenga anestesias viejas', () => {
    const doc = {
        anestesias: [an('2026-01-15', 100, HIST), an('2026-09-15', 100, HIST)],
        deduccionesGrupales: [{ concepto: 'IIBB', monto: 50 }]
    };
    const r = aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    assert.equal(r, null, 'sin socios con ventana parcial, no hay prorrateo');
    assert.equal(doc.anestesias.length, 2);
    assert.equal(doc.deduccionesGrupales[0].monto, 50);
});

test('una anestesia sin fecha avisa en vez de adivinar', () => {
    const doc = {
        anestesias: [an(null, 50, JBO), an('2026-09-15', 50, JBO)],
        deduccionesGrupales: []
    };
    const r = aplicarProrrateo(
        doc, ventanasDeParticipacion(periodosEstandar()), new Map([[JBO, 'jbo']])
    );

    assert.equal(r.warnings.length, 1);
    assert.match(r.warnings[0], /sin fecha de práctica/);
    assert.match(r.warnings[0], /jbo/);
    assert.equal(doc.anestesias.length, 2, 'se conserva, no se descarta a ciegas');
});

test('proporción 100%: nada que excluir', () => {
    const doc = {
        anestesias: [an('2026-09-01', 100, JBO)],
        deduccionesGrupales: [{ concepto: 'IIBB', monto: 50 }]
    };
    const r = aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    assert.equal(r.anestesiasExcluidas, 0);
    assert.equal(doc.deduccionesGrupales[0].monto, 50, 'deducciones sin cambio');
    assert.equal(doc.anestesias.length, 1);
});

test('el prorrateo es idempotente: reingestar no vuelve a recortar', () => {
    const ventanas = ventanasDeParticipacion(periodosEstandar());
    const build = () => ({
        anestesias: [an('2026-08-01', 50, JBO), an('2026-09-15', 50, JBO)],
        deduccionesGrupales: [{ concepto: 'IIBB', monto: 50 }]
    });

    const primera = build();
    aplicarProrrateo(primera, ventanas);

    // Reingestar parte del payload crudo otra vez (el microservicio manda todo
    // siempre), así que el resultado debe ser idéntico, no acumulativo.
    const segunda = build();
    aplicarProrrateo(segunda, ventanas);

    assert.deepEqual(
        segunda.deduccionesGrupales.map(d => d.monto),
        primera.deduccionesGrupales.map(d => d.monto)
    );
    assert.equal(segunda.anestesias.length, primera.anestesias.length);

    // y aplicarlo sobre el resultado ya prorrateado no recorta de nuevo
    const otraVez = aplicarProrrateo(primera, ventanas);
    assert.equal(otraVez.anestesiasExcluidas, 0);
    assert.equal(primera.deduccionesGrupales[0].monto, 25, 'no se re-escala');
});

test('egreso: las anestesias posteriores a la baja se excluyen', () => {
    const periods = [
        period('2026-01-01T00:00:00Z', [
            { userId: HIST, porcentaje: 100 }, { userId: RRISO, porcentaje: 0 }
        ]),
        period('2026-09-01T00:00:00Z', [
            { userId: HIST, porcentaje: 50 }, { userId: RRISO, porcentaje: 50 }
        ]),
        period('2026-12-01T00:00:00Z', [
            { userId: HIST, porcentaje: 100 }, { userId: RRISO, porcentaje: 0 }
        ])
    ];
    const doc = {
        anestesias: [
            an('2026-10-15', 100, RRISO), // dentro
            an('2026-12-15', 100, RRISO)  // posterior al egreso
        ],
        deduccionesGrupales: [{ concepto: 'IIBB', monto: 100 }]
    };
    aplicarProrrateo(doc, ventanasDeParticipacion(periods));

    assert.equal(doc.anestesias.length, 1);
    assert.deepEqual(doc.anestesias[0].fechaPractica, new Date('2026-10-15'));
    assert.equal(doc.deduccionesGrupales[0].monto, 50);
});

// ── controlarProrrateo (punto 5: detectar el silencio) ───────────────────────

test('detecta un socio con participación parcial sin prorratear', () => {
    // liquidación guardada SIN prorrateo: la previa de JBO sobrevivió
    const liq = {
        anestesias: [an('2026-08-01', 50, JBO), an('2026-09-15', 50, JBO)],
        prorrateo: null,
        ingresos: []
    };
    const alertas = controlarProrrateo(
        liq, ventanasDeParticipacion(periodosEstandar()), new Map([[JBO, 'jbo']])
    );

    assert.equal(alertas.length, 1);
    assert.match(alertas[0], /jbo/);
    assert.match(alertas[0], /El prorrateo no se aplicó/);
});

test('no alerta cuando el prorrateo sí corrió', () => {
    const doc = {
        anestesias: [an('2026-08-01', 50, JBO), an('2026-09-15', 50, JBO)],
        deduccionesGrupales: [],
        ingresos: []
    };
    const ventanas = ventanasDeParticipacion(periodosEstandar());
    doc.prorrateo = aplicarProrrateo(doc, ventanas);

    assert.deepEqual(controlarProrrateo(doc, ventanas, new Map([[JBO, 'jbo']])), []);
});

test('detecta la atribución faltante: socio parcial con ingresos y sin anestesias', () => {
    // El modo de falla silencioso: el payload deja de traer el profesional, las
    // anestesias quedan sin userId, el prorrateo no corre y nadie se entera.
    const liq = {
        anestesias: [an('2026-08-01', 50, null), an('2026-09-15', 50, null)],
        prorrateo: null,
        ingresos: [{ tipo: 'socio', userId: JBO, monto: 35483009.79 }]
    };
    const alertas = controlarProrrateo(
        liq, ventanasDeParticipacion(periodosEstandar()), new Map([[JBO, 'jbo']])
    );

    assert.equal(alertas.length, 1);
    assert.match(alertas[0], /ninguna anestesia atribuida/);
});

test('no alerta por un socio parcial que simplemente no facturó', () => {
    const liq = {
        anestesias: [an('2026-09-15', 100, HIST)],
        prorrateo: null,
        ingresos: [] // sin ingresos a su nombre: no facturó, es legítimo
    };
    assert.deepEqual(
        controlarProrrateo(liq, ventanasDeParticipacion(periodosEstandar()), new Map()),
        []
    );
});
