// ═══════════════════════════════════════════════════════════════════════════
//  Prorrateo por ingreso/egreso al grupo
// ═══════════════════════════════════════════════════════════════════════════
//
// El problema (JBO y RRISO, ingresados el 1/9/2026):
//
// Las liquidaciones de evweb de un socio nuevo incluyen anestesias ANTERIORES
// a su ingreso — trabajo previo, que no es del grupo. Y evweb calcula las
// deducciones sobre el TOTAL facturado, incluido ese trabajo previo.
//
// La regla: si el socio tenía 0% de participación, no estaba en el grupo. Si en
// su evweb figuran anestesias de ese período, son suyas y no tienen nada que ver
// con el grupo. Entonces se prorratea TODO lo que trae por ellas, por la misma
// proporción:
//
//     proporción = Σ importe (fechaPractica >= ingreso) / Σ importe (todas)
//
//   1. las anestesias previas al ingreso SALEN del pozo del grupo;
//   2. las deducciones GRUPALES de ese socio, a su proporción;
//   3. las deducciones INDIVIDUALES de ese socio, a su proporción;
//   4. lo que COBRÓ (ingresos[]), a su proporción: a JBO le entraron
//      $35.483.009,79 por evweb, pero parte de eso es el cobro de su trabajo
//      previo — plata suya que pasó por el mismo circuito y nunca fue del
//      grupo. Para la liquidación del grupo hay que considerar sólo lo
//      correspondiente a las anestesias posteriores a su ingreso, menos el
//      descuento proporcional.
//
// Ejemplo del usuario (RRISO ingresó el 1/9): $50 previos y $50 posteriores →
// proporción 50%. Con $8 de deducciones grupales y $2 individuales, se
// contabilizan para el grupo $50 de bruto, $4 grupales y $1 individuales.
//
// Los montos se prorratean POR SOCIO, no con un factor global sobre el total:
// "de los $8 de RRISO se cuentan $4", no "el pozo entero baja un 3%".
//
// El ingreso/egreso se deriva de las participaciones al 0% de los GroupPeriod,
// no de fechas hardcodeadas por socio: una tabla hardcodeada falla en silencio
// ante un alta nueva y no maneja egresos.

/** Normaliza un userId (ObjectId, doc poblado o string) a string. */
function uidToString(userId) {
    if (!userId) return null;
    if (typeof userId === 'string') return userId;
    if (userId._id) return String(userId._id);
    return String(userId);
}

/**
 * Inicio del día, para comparar fechas sin que la hora mueva el límite.
 * Devuelve null si no hay fecha utilizable. Ojo: `new Date(null)` es epoch 0 y
 * `new Date(undefined)` es Invalid Date, así que hay que descartar los valores
 * vacíos ANTES de construir — si no, una anestesia sin fecha se leería como
 * 1970 y quedaría clasificada como previa al ingreso sin avisar.
 */
function startOfDay(date) {
    if (date === null || date === undefined || date === '') return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/**
 * Deriva, desde los GroupPeriod, la ventana en que cada socio estuvo en el
 * grupo con participación > 0.
 *
 * Un socio no está en el grupo en un período si figura al 0% O si no figura en
 * absoluto. Las dos formas valen: la segunda es la natural para un alta (a
 * nadie se le ocurre listar con 0% a quien todavía no existe en el grupo).
 *
 * Quien aparece en el PRIMER período es fundador y no tiene ventana: el grupo
 * no existía antes, así que no hay nada que recortar.
 *
 * `periods` debe venir ordenado por fechaInicio ASC.
 *
 * @returns {Map<string, {ingreso: Date|null, egreso: Date|null}>}
 *   ingreso = inicio del primer período con % > 0 (null si entró desde siempre)
 *   egreso  = inicio del primer período al 0% posterior a su última actividad
 *             (null si sigue activo)
 */
function ventanasDeParticipacion(periods) {
    const ordenados = [...(periods || [])].sort(
        (a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio)
    );

    // El PRIMER período es el arranque del grupo: quien figura ahí con
    // participación es fundador y no tiene ingreso parcial. Quien aparece en un
    // período posterior, entró después.
    const primerPeriodo = ordenados.length ? startOfDay(ordenados[0].fechaInicio) : null;

    const estado = new Map();

    for (const period of ordenados) {
        const inicio = startOfDay(period.fechaInicio);
        if (!inicio) continue;

        for (const participacion of (period.participaciones || [])) {
            const uid = uidToString(participacion.userId);
            if (!uid) continue;

            if (!estado.has(uid)) {
                estado.set(uid, {
                    primeroConParticipacion: null,
                    estuvoAlCeroAntes: false,
                    // En qué período apareció por primera vez, con cualquier
                    // porcentaje. Si no es el primero de todos, antes no estaba
                    // en el grupo.
                    primeraAparicion: inicio,
                    primeroAlCeroDespues: null
                });
            }
            const e = estado.get(uid);
            const tieneParticipacion = Number(participacion.porcentaje) > 0;

            if (tieneParticipacion) {
                if (!e.primeroConParticipacion) e.primeroConParticipacion = inicio;
                // si vuelve a tener participación, una baja previa quedó revertida
                e.primeroAlCeroDespues = null;
            } else {
                if (!e.primeroConParticipacion) {
                    // 0% antes de haber tenido participación: todavía no entró
                    e.estuvoAlCeroAntes = true;
                } else if (!e.primeroAlCeroDespues) {
                    // 0% después de haber participado: se dio de baja
                    e.primeroAlCeroDespues = inicio;
                }
            }
        }
    }

    const ventanas = new Map();
    for (const [uid, e] of estado) {
        // Hay ingreso parcial en dos casos, y los dos significan lo mismo —
        // "este socio no estaba en el grupo antes de esa fecha":
        //
        //   a) figuró explícitamente al 0% en un período anterior
        //      (así quedó registrado msalvarezza, ingreso 2024-10-01);
        //
        //   b) NO FIGURA en los períodos anteriores y aparece recién en uno
        //      posterior al arranque. Es la forma normal de registrar un alta:
        //      a nadie se le ocurre listar con 0% a alguien que todavía no
        //      existe en el grupo. Así están JBO y RRISO (1/9/2026), que por
        //      exigir el 0% explícito nunca se prorrateaban.
        //
        // Un fundador aparece en el primer período de todos: ahí no hay nada
        // que recortar, porque el grupo no existía antes.
        const apareceDespuesDelArranque =
            primerPeriodo && e.primeraAparicion > primerPeriodo;
        const ingreso = (e.estuvoAlCeroAntes || apareceDespuesDelArranque)
            ? e.primeroConParticipacion
            : null;
        const egreso = e.primeroAlCeroDespues || null;
        if (ingreso || egreso) ventanas.set(uid, { ingreso, egreso });
    }
    return ventanas;
}

/**
 * ¿La anestesia cae dentro de la ventana en que el socio estuvo en el grupo?
 * El día del ingreso cuenta como dentro (>=); el día del egreso, como fuera (<).
 */
function dentroDeVentana(fechaPractica, ventana) {
    const f = startOfDay(fechaPractica);
    if (!f) return null; // sin fecha: no se puede clasificar
    if (ventana.ingreso && f < ventana.ingreso) return false;
    if (ventana.egreso && f >= ventana.egreso) return false;
    return true;
}

/** Escala un monto por la proporción, redondeando a centavos. */
function escalar(monto, proporcion) {
    return Math.round(Number(monto || 0) * proporcion * 100) / 100;
}

/**
 * Prorratea por su proporción las líneas de un socio (deducciones o ingresos).
 *
 * Sólo toca las líneas atribuidas a ese socio: las de los demás y las agregadas
 * (sin userId) quedan intactas. Devuelve el array nuevo y cuánto se descontó.
 *
 * `sinAtribuir` suma las líneas sin userId. Para las deducciones grupales eso
 * es una señal de alarma (no se pudieron prorratear); para los ingresos es
 * normal, porque los de tipo 'empresa' no tienen socio. El llamador decide.
 */
function prorratearLineasDeSocio(lineas, uid, proporcion) {
    let original = 0;
    let ajustado = 0;
    let sinAtribuir = 0;

    const out = (lineas || []).map(d => {
        const plano = typeof d.toObject === 'function' ? d.toObject() : { ...d };
        const duid = uidToString(plano.userId);
        if (!duid) {
            sinAtribuir += Number(plano.monto || 0);
            return plano;
        }
        if (duid !== uid) return plano;

        const monto = escalar(plano.monto, proporcion);
        original += Number(plano.monto || 0);
        ajustado += monto;
        return { ...plano, monto };
    });

    return {
        lineas: out,
        original: Math.round(original * 100) / 100,
        ajustado: Math.round(ajustado * 100) / 100,
        sinAtribuir: Math.round(sinAtribuir * 100) / 100
    };
}

/**
 * Aplica el prorrateo a una liquidación recién ingestada.
 *
 * La regla (ejemplo del usuario, RRISO ingresó el 1/9):
 *
 *   previo al 1/9  → anestesias por $50
 *   desde el 1/9   → anestesias por $50     proporción = 50%
 *
 *   deducciones: $8 de conceptos grupales, $2 de conceptos individuales
 *
 *   se contabiliza para el grupo:  $50 de bruto
 *                                  $4 de deducciones grupales   (50% de 8)
 *                                  $1 de deducciones individuales (50% de 2)
 *
 * Es decir: TODO lo que trae la liquidación de ese socio se prorratea por la
 * misma proporción. Si tiene 0% de participación en un período, no está en el
 * grupo; si en su evweb figuran anestesias de ese período, son suyas y no
 * tienen nada que ver con el grupo — ni su bruto, ni sus deducciones, ni lo
 * que cobró por ellas.
 *
 * `ingresos[]` TAMBIÉN se prorratea. A JBO le entraron $35.483.009,79 por
 * evweb, pero una parte de eso es el cobro de sus anestesias previas al
 * ingreso: plata suya que pasó por el mismo circuito, que nunca fue del grupo.
 * Para la liquidación del grupo hay que considerar que le ingresó sólo lo
 * correspondiente a las anestesias posteriores a su ingreso, menos el descuento
 * proporcional. Si no se prorratea, el saldo compara su parte (calculada sobre
 * las anestesias del grupo) contra un ingreso que incluye trabajo ajeno al
 * grupo: magnitudes de universos distintos.
 *
 * Las deducciones se prorratean POR SOCIO, no con un factor global sobre el
 * total: la regla es "de los $8 de RRISO se cuentan $4", no "el pozo entero
 * baja un 3%". Una línea sin `userId` es agregada y no se puede prorratear:
 * se avisa.
 *
 * Muta `doc` (anestesias, deduccionesGrupales, deduccionesPersonales) y
 * devuelve el detalle del ajuste para guardarlo y mostrarlo en la UI: un ajuste
 * que mueve millones no debería ser invisible.
 *
 * Las anestesias sin `userId` son del pozo del grupo (distribución grupal, o
 * históricas cargadas antes de que el campo existiera): no se tocan nunca.
 *
 * @param {{anestesias: Array, deduccionesGrupales: Array, deduccionesPersonales: Array}} doc
 * @param {Map<string, {ingreso: Date|null, egreso: Date|null}>} ventanas
 * @param {Map<string, string>} usernamePorUid  para mensajes legibles
 * @returns {{socios: Array, warnings: string[], anestesiasExcluidas: number}|null}
 */
function aplicarProrrateo(doc, ventanas, usernamePorUid = new Map()) {
    const anestesias = doc.anestesias || [];
    const warnings = [];

    // Agrupar las anestesias atribuidas a un socio con ventana de participación
    const porSocio = new Map();
    for (const a of anestesias) {
        const uid = uidToString(a.userId);
        if (!uid || !ventanas.has(uid)) continue;
        if (!porSocio.has(uid)) porSocio.set(uid, []);
        porSocio.get(uid).push(a);
    }

    if (porSocio.size === 0) return null;

    const excluidas = new Set();
    const socios = [];
    // Se prorratean socio por socio sobre estos arrays, que van acumulando los
    // ajustes de cada uno (cada socio toca sólo sus propias líneas).
    let dedGrupales = doc.deduccionesGrupales || [];
    let dedPersonales = doc.deduccionesPersonales || [];
    let ingresos = doc.ingresos || [];

    for (const [uid, propias] of porSocio) {
        const ventana = ventanas.get(uid);
        const nombre = usernamePorUid.get(uid) || uid;

        // Una anestesia sin fecha de práctica entra en el denominador y no se
        // puede clasificar. Avisar, no adivinar: mueve plata en el reparto de
        // todos. Se la conserva (se trata como dentro) y se advierte.
        const sinFecha = propias.filter(a => !startOfDay(a.fechaPractica));
        if (sinFecha.length) {
            warnings.push(
                `${nombre}: ${sinFecha.length} anestesia(s) sin fecha de práctica; ` +
                `no se puede decidir si son previas a su ingreso ` +
                `(${ventana.ingreso ? ventana.ingreso.toISOString().substring(0, 10) : 's/ingreso'}). ` +
                `Se contabilizaron como dentro del grupo. Revisar a mano.`
            );
        }

        const total = propias.reduce((s, a) => s + Number(a.montoFacturado || 0), 0);
        const fuera = propias.filter(a => dentroDeVentana(a.fechaPractica, ventana) === false);
        const montoFuera = fuera.reduce((s, a) => s + Number(a.montoFacturado || 0), 0);

        if (total <= 0 || fuera.length === 0) continue;

        fuera.forEach(a => excluidas.add(a));
        const proporcion = (total - montoFuera) / total;

        // Las deducciones de ESTE socio (grupales e individuales) se prorratean
        // por SU proporción. Ejemplo del usuario: $8 grupales → $4, $2
        // individuales → $1, con proporción 50%.
        const g = prorratearLineasDeSocio(dedGrupales, uid, proporcion);
        const p = prorratearLineasDeSocio(dedPersonales, uid, proporcion);
        dedGrupales = g.lineas;
        dedPersonales = p.lineas;

        // Y lo que cobró: de los $35.483.009,79 que le entraron a JBO, sólo la
        // parte correspondiente a las anestesias posteriores a su ingreso es
        // del grupo. El resto es el cobro de su trabajo previo.
        const i = prorratearLineasDeSocio(ingresos, uid, proporcion);
        ingresos = i.lineas;

        socios.push({
            userId: uid,
            username: nombre,
            ingreso: ventana.ingreso,
            egreso: ventana.egreso,
            proporcion: Math.round(proporcion * 1e6) / 1e6,
            anestesiasTotales: propias.length,
            anestesiasExcluidas: fuera.length,
            montoTotal: Math.round(total * 100) / 100,
            montoExcluido: Math.round(montoFuera * 100) / 100,
            dedGrupalOriginal: g.original,
            dedGrupalAjustada: g.ajustado,
            dedPersonalOriginal: p.original,
            dedPersonalAjustada: p.ajustado,
            ingresoOriginal: i.original,
            ingresoAjustado: i.ajustado
        });

        // Una deducción grupal sin socio no se puede prorratear. Es el modo de
        // falla silencioso: si el payload la trae agregada, el ajuste de este
        // socio no se le aplica y nadie se entera.
        if (g.sinAtribuir > 0) {
            warnings.push(
                `${nombre}: hay deducciones grupales sin socio asignado ` +
                `(${g.sinAtribuir.toFixed(2)}) que no se pudieron prorratear al ` +
                `${(proporcion * 100).toFixed(2)}%. Falta el campo "socio" en ` +
                `deduccionesGrupales del payload. Revisar a mano.`
            );
        }
    }

    // Nada que excluir: el socio existe y tiene ventana, pero toda su
    // facturación cae dentro (proporción 100%). Se reporta igual —sirve para
    // dejar constancia de que el prorrateo corrió— pero sin tocar importes.
    if (excluidas.size === 0) {
        return {
            socios,
            warnings,
            anestesiasExcluidas: 0,
            montoExcluido: 0
        };
    }

    // 1. Las anestesias previas al ingreso (o posteriores al egreso) salen del
    //    pozo: si el socio tenía 0% de participación, no estaba en el grupo y
    //    ese trabajo es suyo, no del grupo.
    doc.anestesias = anestesias.filter(a => !excluidas.has(a));

    // 2. 3. y 4. Deducciones (grupales e individuales) e ingresos ya quedaron
    //    prorrateados socio por socio en el loop de arriba.
    doc.deduccionesGrupales = dedGrupales;
    doc.deduccionesPersonales = dedPersonales;
    doc.ingresos = ingresos;

    const montoExcluidoTotal = [...excluidas].reduce(
        (s, a) => s + Number(a.montoFacturado || 0), 0
    );

    return {
        socios,
        warnings,
        anestesiasExcluidas: excluidas.size,
        montoExcluido: Math.round(montoExcluidoTotal * 100) / 100
    };
}

/**
 * Control de consistencia (punto 5): detecta un socio con participación parcial
 * que quedó SIN prorratear.
 *
 * El modo de falla que importa no es un error, es un silencio: si el payload
 * deja de traer el profesional por anestesia, o si un alta nueva no se refleja
 * en los GroupPeriod, el prorrateo simplemente no corre y nadie se entera. El
 * cuadre cruzado del microservicio no sirve para detectarlo — cierra igual con
 * prorrateo y sin él, porque valida scraping, no reparto.
 *
 * @returns {string[]} alertas (vacío = todo en orden)
 */
function controlarProrrateo(liquidacion, ventanas, usernamePorUid = new Map()) {
    const alertas = [];
    const anestesias = liquidacion.anestesias || [];
    if (!ventanas || ventanas.size === 0) return alertas;

    const prorrateo = liquidacion.prorrateo;
    const prorrateados = new Set(
        (prorrateo?.socios || []).map(s => uidToString(s.userId))
    );

    // ¿Hay anestesias atribuidas a un socio con ventana, fuera de su ventana,
    // que sobrevivieron al ingreso? Eso es un prorrateo que no corrió.
    const atribuidas = new Map();
    for (const a of anestesias) {
        const uid = uidToString(a.userId);
        if (!uid) continue;
        if (!atribuidas.has(uid)) atribuidas.set(uid, 0);
        atribuidas.set(uid, atribuidas.get(uid) + 1);
    }

    for (const [uid, ventana] of ventanas) {
        const nombre = usernamePorUid.get(uid) || uid;
        const propias = anestesias.filter(a => uidToString(a.userId) === uid);
        const fuera = propias.filter(a => dentroDeVentana(a.fechaPractica, ventana) === false);

        if (fuera.length > 0) {
            alertas.push(
                `${nombre} tiene participación parcial (ingreso ` +
                `${ventana.ingreso ? ventana.ingreso.toISOString().substring(0, 10) : '—'}` +
                `${ventana.egreso ? `, egreso ${ventana.egreso.toISOString().substring(0, 10)}` : ''}) ` +
                `y quedaron ${fuera.length} anestesia(s) fuera de su ventana sin excluir. ` +
                `El prorrateo no se aplicó.`
            );
            continue;
        }

        // Socio con ventana parcial del que no llegó NINGUNA anestesia atribuida:
        // puede ser legítimo (no facturó), pero si la liquidación tiene ingresos
        // o deducciones a su nombre, entonces facturó y el payload no trajo la
        // atribución. Es el caso que vio el usuario: el FONDO APORTE DE
        // ASOCIADOS de JBO figuraba por $839.503,39 (el monto entero) porque el
        // prorrateo no tenía anestesias con las que calcular la proporción.
        if (!atribuidas.has(uid) && !prorrateados.has(uid)) {
            const montoIngresos = (liquidacion.ingresos || [])
                .filter(i => i.tipo === 'socio' && uidToString(i.userId) === uid)
                .reduce((s, i) => s + Number(i.monto || 0), 0);
            const montoDeds = [
                ...(liquidacion.deduccionesPersonales || []),
                ...(liquidacion.deduccionesGrupales || [])
            ]
                .filter(d => uidToString(d.userId) === uid)
                .reduce((s, d) => s + Number(d.monto || 0), 0);

            // OJO: no alcanza con "tiene movimientos y no tiene anestesias
            // atribuidas". Un socio con ventana puede no tener listado propio
            // en evweb —todas sus anestesias son del grupo— y entonces no hay
            // nada que prorratear: es el caso normal, no una falla. Así está
            // msalvarezza, que generaba un falso positivo.
            //
            // Sólo es sospechoso si la liquidación trae anestesias propias de
            // ALGÚN socio (o sea, el payload sí distingue propias) y las de
            // este quedaron sin atribuir.
            const hayPropiasDeOtros = anestesias.some(a => uidToString(a.userId));
            if (hayPropiasDeOtros && (montoIngresos > 0 || montoDeds > 0)) {
                alertas.push(
                    `${nombre} tiene participación parcial (ingreso ` +
                    `${ventana.ingreso ? ventana.ingreso.toISOString().substring(0, 10) : '—'}) ` +
                    `y movimientos en esta liquidación ` +
                    `(${montoIngresos > 0 ? `cobrado ${montoIngresos.toFixed(2)}` : ''}` +
                    `${montoIngresos > 0 && montoDeds > 0 ? ', ' : ''}` +
                    `${montoDeds > 0 ? `deducciones ${montoDeds.toFixed(2)}` : ''}), ` +
                    `pero ninguna anestesia atribuida: los importes están SIN PRORRATEAR ` +
                    `(se tomaron completos). Falta el campo "socio" en anestesias[] del payload.`
                );
            }
        }
    }

    return alertas;
}

module.exports = {
    ventanasDeParticipacion,
    aplicarProrrateo,
    controlarProrrateo,
    dentroDeVentana,
    uidToString
};
