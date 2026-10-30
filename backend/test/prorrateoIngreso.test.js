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

test('un socio que NO FIGURA en los períodos previos tiene ingreso parcial', () => {
    // El caso real de JBO y RRISO (log del 30/10): no figuran en absoluto antes
    // del 1/9/2026, porque a nadie se le ocurre listar con 0% a quien todavía
    // no está en el grupo. Antes se exigía el 0% explícito y nunca se
    // prorrateaban: el payload venía perfecto (propia true=54, jbo/rriso OK)
    // pero la única ventana era la de msalvarezza.
    const v = ventanasDeParticipacion([
        period('2024-01-01T00:00:00Z', [{ userId: HIST, porcentaje: 100 }]),
        period('2026-09-01T00:00:00Z', [
            { userId: HIST, porcentaje: 50 },
            { userId: JBO, porcentaje: 25 },
            { userId: RRISO, porcentaje: 25 }
        ])
    ]);

    assert.deepEqual(v.get(JBO).ingreso, new Date('2026-09-01T00:00:00Z'));
    assert.deepEqual(v.get(RRISO).ingreso, new Date('2026-09-01T00:00:00Z'));
    assert.equal(v.has(HIST), false, 'el fundador no tiene ventana');
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

test('ejemplo del usuario: RRISO entró el 1/9, $50 antes y $50 después', () => {
    // Del mensaje del usuario (2026-10-30):
    //   previo al 1/9: anestesias por $50; desde el 1/9: $50 → proporción 50%
    //   deducciones: $8 de conceptos grupales, $2 de conceptos individuales
    //   se contabiliza para el grupo: $50 de bruto, $4 grupales, $1 individuales
    const doc = {
        anestesias: [an('2026-08-01', 50, RRISO), an('2026-09-15', 50, RRISO)],
        deduccionesGrupales: [{ userId: RRISO, concepto: 'INGRESOS BRUTOS', monto: 8 }],
        deduccionesPersonales: [{ userId: RRISO, concepto: 'OSDE', monto: 2 }],
        // evweb le deposita el neto de los $100: 100 − 8 − 2 = 90
        ingresos: [{ tipo: 'socio', userId: RRISO, monto: 90 }]
    };
    const r = aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    assert.equal(r.socios[0].proporcion, 0.5);
    // $50 de bruto: la previa sale del pozo
    assert.equal(doc.anestesias.length, 1);
    assert.equal(doc.anestesias[0].montoFacturado, 50);
    // $4 de deducciones grupales (50% de 8)
    assert.equal(doc.deduccionesGrupales[0].monto, 4);
    // $1 de deducciones individuales (50% de 2)
    assert.equal(doc.deduccionesPersonales[0].monto, 1);
    // y cobró $45: la mitad de los $90 que le depositaron
    assert.equal(doc.ingresos[0].monto, 45);
    // cuadra: 50 de bruto − 4 − 1 = 45
    assert.equal(
        doc.anestesias[0].montoFacturado
        - doc.deduccionesGrupales[0].monto
        - doc.deduccionesPersonales[0].monto,
        doc.ingresos[0].monto
    );
});

test('las deducciones individuales también se prorratean', () => {
    // El FONDO APORTE DE ASOCIADOS de JBO: con proporción 50% se cuenta la mitad.
    const doc = {
        anestesias: [an('2026-08-01', 50, JBO), an('2026-09-15', 50, JBO)],
        deduccionesGrupales: [],
        deduccionesPersonales: [
            { userId: JBO, concepto: 'FONDO APORTE DE ASOCIADOS', monto: 222812.78 }
        ]
    };
    aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    assert.equal(doc.deduccionesPersonales[0].monto, 111406.39, '50% de 222812.78');
});

test('ingresos[] también se prorratea: parte de lo cobrado no es del grupo', () => {
    // A JBO le entraron $35.483.009,79 por evweb, pero parte de eso es el cobro
    // de sus anestesias previas al ingreso: plata suya que pasó por el mismo
    // circuito. Para el grupo cuenta sólo la parte posterior al 1/9.
    const doc = {
        anestesias: [an('2026-08-01', 50, JBO), an('2026-09-15', 50, JBO)],
        deduccionesGrupales: [],
        ingresos: [{ tipo: 'socio', userId: JBO, monto: 35483009.79 }]
    };
    const r = aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    assert.equal(doc.ingresos[0].monto, 17741504.90, '50% de lo depositado');
    assert.equal(r.socios[0].ingresoOriginal, 35483009.79);
    assert.equal(r.socios[0].ingresoAjustado, 17741504.90);
});

test('el ingreso tipo empresa no se toca (no tiene socio)', () => {
    const doc = {
        anestesias: [an('2026-08-01', 50, JBO), an('2026-09-15', 50, JBO)],
        deduccionesGrupales: [],
        ingresos: [
            { tipo: 'empresa', userId: null, monto: 1000 },
            { tipo: 'socio', userId: JBO, monto: 100 }
        ]
    };
    const r = aplicarProrrateo(
        doc, ventanasDeParticipacion(periodosEstandar()), new Map([[JBO, 'jbo']])
    );

    assert.equal(doc.ingresos[0].monto, 1000, 'empresa intacto');
    assert.equal(doc.ingresos[1].monto, 50, 'socio al 50%');
    // y no debe avisar por el ingreso de empresa: no tener socio es lo normal ahí
    assert.equal(r.warnings.length, 0);
});

test('las deducciones se prorratean por socio, no con un factor global', () => {
    // La regla es "de los $8 de RRISO se cuentan $4", NO "el pozo baja un 3%".
    // Las líneas de los otros socios quedan intactas.
    const doc = {
        anestesias: [
            an('2026-08-01', 50, RRISO), an('2026-09-15', 50, RRISO),
            an('2026-09-15', 1000, HIST)
        ],
        deduccionesGrupales: [
            { userId: RRISO, concepto: 'IIBB', monto: 8 },
            { userId: HIST, concepto: 'IIBB', monto: 100 }
        ],
        deduccionesPersonales: [
            { userId: RRISO, concepto: 'OSDE', monto: 2 },
            { userId: HIST, concepto: 'OSDE', monto: 50 }
        ]
    };
    aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    const g = Object.fromEntries(doc.deduccionesGrupales.map(d => [d.userId, d.monto]));
    const p = Object.fromEntries(doc.deduccionesPersonales.map(d => [d.userId, d.monto]));
    assert.equal(g[RRISO], 4, 'la de RRISO al 50%');
    assert.equal(g[HIST], 100, 'la del histórico intacta');
    assert.equal(p[RRISO], 1);
    assert.equal(p[HIST], 50, 'la del histórico intacta');
});

test('avisa si una deducción grupal viene agregada (sin socio)', () => {
    // Modo de falla silencioso: sin `socio` no se puede prorratear, y tocar el
    // total agregado le cambiaría las deducciones a los 16 socios.
    const doc = {
        anestesias: [an('2026-08-01', 50, RRISO), an('2026-09-15', 50, RRISO)],
        deduccionesGrupales: [{ userId: null, concepto: 'IIBB', monto: 42_000_000 }]
    };
    const r = aplicarProrrateo(
        doc, ventanasDeParticipacion(periodosEstandar()), new Map([[RRISO, 'rriso']])
    );

    assert.equal(doc.deduccionesGrupales[0].monto, 42_000_000, 'no se toca');
    assert.ok(r.warnings.some(w => /sin socio asignado/.test(w)), 'avisa');
    assert.ok(r.warnings.some(w => /rriso/.test(w)));
});

test('las anestesias del pozo del grupo (sin socio) no se tocan', () => {
    const doc = {
        anestesias: [
            an('2026-08-01', 1000, null), // del grupo: previa pero no es de un socio nuevo
            an('2026-08-01', 50, JBO),    // de JBO, previa a su ingreso
            an('2026-09-15', 50, JBO)
        ],
        deduccionesGrupales: [
            { userId: JBO, concepto: 'IIBB', monto: 10 },
            { userId: HIST, concepto: 'IIBB', monto: 100 }
        ]
    };
    aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    assert.equal(doc.anestesias.length, 2);
    assert.ok(doc.anestesias.some(a => a.montoFacturado === 1000), 'la del grupo queda');
    assert.ok(!doc.anestesias.some(a => a.userId === JBO && a.montoFacturado === 50
        && a.fechaPractica.getUTCMonth() === 7), 'la previa de JBO sale');

    // sólo se prorratea la deducción de JBO (50%), no la del histórico
    const g = Object.fromEntries(doc.deduccionesGrupales.map(d => [d.userId, d.monto]));
    assert.equal(g[JBO], 5);
    assert.equal(g[HIST], 100);
});

test('las 371 del grupo no se atribuyen; sólo las propias de JBO/RRISO', () => {
    // Estructura real del payload (log del 30/10): 371 anestesias "del grupo"
    // que los 14 históricos ven iguales (deduplicadas), + 35 propias de JBO y
    // 19 de RRISO. Las del grupo van sin userId: son del pozo. Si se
    // atribuyeran, el prorrateo le recortaría al grupo trabajo que sí es suyo.
    const delGrupo = Array.from({ length: 5 }, () => an('2026-08-15', 1000, null));
    const propiasJbo = [an('2026-07-10', 100, JBO), an('2026-09-20', 300, JBO)];

    const doc = {
        anestesias: [...delGrupo, ...propiasJbo],
        deduccionesGrupales: [{ userId: JBO, concepto: 'IIBB', monto: 40 }]
    };
    const r = aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    // las 5 del grupo quedan aunque sean previas al 1/9: son del pozo
    assert.equal(doc.anestesias.filter(a => a.userId === null).length, 5);
    // de JBO sale sólo la previa a su ingreso
    assert.equal(doc.anestesias.filter(a => a.userId === JBO).length, 1);
    // proporción de JBO sobre SUS propias: 300 / 400 = 75%
    assert.equal(r.socios[0].proporcion, 0.75);
    assert.equal(doc.deduccionesGrupales[0].monto, 30);
});

test('los débitos (montos negativos) restan y siguen la suerte de su tramo', () => {
    // Caso real (log del 30/10): JBO tiene 3 líneas negativas de PAMI/Clínica
    // de Imágenes. Un débito posterior al ingreso resta del pozo del grupo; uno
    // previo se excluye igual que una anestesia previa, porque ajusta trabajo
    // que no era del grupo.
    const doc = {
        anestesias: [
            an('2026-07-15', 1000, JBO),      // previa: fuera
            an('2026-07-20', -200, JBO),      // débito previo: fuera también
            an('2026-09-20', 1000, JBO),      // posterior: dentro
            an('2026-09-25', -85965.56, JBO)  // débito posterior: dentro, resta
        ],
        deduccionesGrupales: [{ userId: JBO, concepto: 'IIBB', monto: 1000 }]
    };
    const r = aplicarProrrateo(doc, ventanasDeParticipacion(periodosEstandar()));

    // quedan las dos posteriores, incluido el débito
    assert.equal(doc.anestesias.length, 2);
    assert.ok(doc.anestesias.some(a => a.montoFacturado === -85965.56), 'el débito posterior queda');
    assert.ok(!doc.anestesias.some(a => a.montoFacturado === -200), 'el débito previo sale');

    // total = 1000 - 200 + 1000 - 85965.56 = -84165.56... usamos el real:
    // dentro = 1000 - 85965.56 = -84965.56 ; fuera = 1000 - 200 = 800
    // proporción cruda = (total - fuera)/total, acotada a [0,1]
    assert.ok(r.socios[0].proporcion >= 0 && r.socios[0].proporcion <= 1,
        'la proporción queda en [0,1]');
});

test('la proporción nunca sale de [0,1] aunque los débitos la empujen', () => {
    // Si los débitos previos superan la facturación previa, la cuenta daría >1
    // y SUBIRÍA las deducciones. Se acota y se avisa.
    const doc = {
        anestesias: [
            an('2026-07-15', 100, JBO),
            an('2026-07-20', -500, JBO),  // débito previo mayor que lo facturado
            an('2026-09-20', 1000, JBO)
        ],
        deduccionesGrupales: [{ userId: JBO, concepto: 'IIBB', monto: 1000 }]
    };
    const r = aplicarProrrateo(
        doc, ventanasDeParticipacion(periodosEstandar()), new Map([[JBO, 'jbo']])
    );

    assert.ok(r.socios[0].proporcion <= 1, 'acotada a 1 como máximo');
    assert.ok(r.socios[0].proporcion >= 0);
    // la deducción nunca sube por encima del original
    assert.ok(doc.deduccionesGrupales[0].monto <= 1000);
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
        deduccionesGrupales: [{ userId: JBO, concepto: 'IIBB', monto: 50 }]
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
        deduccionesGrupales: [{ userId: RRISO, concepto: 'IIBB', monto: 100 }]
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

test('detecta la atribución faltante: el payload sí distingue propias pero no las de este socio', () => {
    // El modo de falla silencioso: el payload atribuye las propias de RRISO
    // pero las de JBO quedaron sin userId, así que su prorrateo no corre.
    // La señal de que falta algo es que SÍ hay propias de otro socio: si no
    // hubiera ninguna, sería el caso legítimo de un socio sin listado propio.
    const liq = {
        anestesias: [an('2026-09-15', 50, RRISO), an('2026-08-01', 50, null)],
        prorrateo: null,
        ingresos: [{ tipo: 'socio', userId: JBO, monto: 35483009.79 }]
    };
    const alertas = controlarProrrateo(
        liq, ventanasDeParticipacion(periodosEstandar()), new Map([[JBO, 'jbo']])
    );

    assert.ok(alertas.some(a => /ninguna anestesia atribuida/.test(a)));
    assert.ok(alertas.some(a => /jbo/.test(a)));
});

test('detecta el caso real: deducción personal al monto entero', () => {
    // Lo que vio el usuario (2026-10-30): el FONDO APORTE DE ASOCIADOS de JBO
    // figuraba por $839.503,39, el monto entero, porque sus anestesias no
    // quedaron atribuidas y el prorrateo no tuvo con qué calcular la proporción.
    const liq = {
        anestesias: [an('2026-09-15', 50, RRISO), an('2026-08-01', 50, null)],
        prorrateo: null,
        ingresos: [{ tipo: 'socio', userId: JBO, monto: 35483009.79 }],
        deduccionesPersonales: [
            { userId: JBO, concepto: 'FONDO APORTE DE ASOCIADOS', monto: 839503.39 }
        ]
    };
    const alertas = controlarProrrateo(
        liq, ventanasDeParticipacion(periodosEstandar()), new Map([[JBO, 'jbo']])
    );

    const deJbo = alertas.find(a => /jbo/.test(a));
    assert.ok(deJbo, 'debe alertar sobre jbo');
    assert.match(deJbo, /SIN PRORRATEAR/);
    assert.match(deJbo, /anestesias\[\] del payload/);
});

test('no alerta por un socio con ventana sin anestesias propias', () => {
    // msalvarezza: entró 2024-10-01 pero todas sus anestesias son del grupo, no
    // tiene listado propio en evweb. No hay nada que prorratear — es el caso
    // normal. Antes esto daba un falso positivo.
    const liq = {
        anestesias: [an('2026-09-15', 1000, null), an('2026-08-15', 1000, null)],
        prorrateo: null,
        ingresos: [{ tipo: 'socio', userId: HIST, monto: 25377884.99 }],
        deduccionesPersonales: [{ userId: HIST, concepto: 'FONDO', monto: 595725 }]
    };
    const ventanas = new Map([[HIST, { ingreso: new Date('2024-10-01Z'), egreso: null }]]);

    assert.deepEqual(controlarProrrateo(liq, ventanas, new Map([[HIST, 'msalvarezza']])), []);
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
