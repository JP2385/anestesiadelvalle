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
// Esta app reparte por POZO: suma todas las anestesias en un montoBruto único y
// se lo divide a cada socio por su % de participación (ver calcularDistribucion
// en liquidacionController). No hay "crédito del socio" que prorratear. Así que
// la regla del prorrateo se traduce a este modelo como:
//
//   1. las anestesias previas al ingreso SALEN del pozo (no se reparten entre
//      los 16 socios: no son trabajo del grupo);
//   2. las deducciones GRUPALES se reducen en la proporción que le correspondía
//      a esas anestesias excluidas, porque evweb las calculó sobre el total;
//   3. las deducciones PERSONALES van COMPLETAS: no dependen del volumen
//      facturado, son del socio (OSDE, jubilación, FONDO APORTE DE ASOCIADOS);
//   4. ingresos[] NO se toca: es la plata que realmente entró a la cuenta del
//      socio, y el saldo la compara contra lo que le corresponde. Escalarla
//      haría que el saldo deje de reflejar la realidad.
//
// La proporción es por MONTO, no por cantidad de anestesias:
//
//     proporción = Σ importe (fechaPractica >= ingreso) / Σ importe (todas)
//
// Ejemplo: factura 100, de los cuales 50 son posteriores al 1/9 → 50%; con
// deducciones grupales de 50 atribuibles, se toman 25.
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
 * Una participación al 0% significa "el socio no está en el grupo en ese
 * período" — así un alta y una baja se expresan con un solo mecanismo, sin
 * duplicar fechas. Un socio que nunca figura al 0% no tiene ventana: estuvo
 * siempre, y no se le prorratea nada.
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

    // uid → { primeroConParticipacion, estuvoAlCeroAntes, ultimoConParticipacion }
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
                    ultimoConParticipacion: null,
                    primeroAlCeroDespues: null
                });
            }
            const e = estado.get(uid);
            const tieneParticipacion = Number(participacion.porcentaje) > 0;

            if (tieneParticipacion) {
                if (!e.primeroConParticipacion) e.primeroConParticipacion = inicio;
                e.ultimoConParticipacion = inicio;
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
        // Sólo hay ingreso si el socio figuró explícitamente al 0% ANTES de
        // tener participación. Si su primer período ya lo tiene participando,
        // estuvo desde el arranque y no hay nada que recortar.
        const ingreso = e.estuvoAlCeroAntes ? e.primeroConParticipacion : null;
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

/**
 * Aplica el prorrateo a una liquidación recién ingestada.
 *
 * Muta `doc` (anestesias y deduccionesGrupales) y devuelve el detalle del
 * ajuste para guardarlo y mostrarlo en la UI: un ajuste que mueve millones no
 * debería ser invisible.
 *
 * Las anestesias sin `userId` son del pozo del grupo (distribución grupal, o
 * históricas cargadas antes de que el campo existiera): no se tocan nunca.
 *
 * @param {{anestesias: Array, deduccionesGrupales: Array}} doc
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

    const brutoTotal = anestesias.reduce((s, a) => s + Number(a.montoFacturado || 0), 0);
    const excluidas = new Set();
    const socios = [];

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

        socios.push({
            userId: uid,
            username: nombre,
            ingreso: ventana.ingreso,
            egreso: ventana.egreso,
            proporcion: Math.round(proporcion * 1e6) / 1e6,
            anestesiasTotales: propias.length,
            anestesiasExcluidas: fuera.length,
            montoTotal: Math.round(total * 100) / 100,
            montoExcluido: Math.round(montoFuera * 100) / 100
        });
    }

    // Nada que excluir: el socio existe y tiene ventana, pero toda su
    // facturación cae dentro (proporción 100%). Se reporta igual —sirve para
    // dejar constancia de que el prorrateo corrió— pero sin tocar importes.
    if (excluidas.size === 0) {
        return {
            socios,
            warnings,
            anestesiasExcluidas: 0,
            montoExcluido: 0,
            factorDeduccionesGrupales: 1
        };
    }

    // 1. Las anestesias previas al ingreso (o posteriores al egreso) salen del pozo
    doc.anestesias = anestesias.filter(a => !excluidas.has(a));

    // 2. Las deducciones grupales se reducen en la proporción del bruto que se
    //    fue con esas anestesias: evweb las calculó sobre el total facturado.
    const montoExcluidoTotal = [...excluidas].reduce(
        (s, a) => s + Number(a.montoFacturado || 0), 0
    );
    const factor = brutoTotal > 0 ? (brutoTotal - montoExcluidoTotal) / brutoTotal : 1;

    doc.deduccionesGrupales = (doc.deduccionesGrupales || []).map(d => ({
        ...(typeof d.toObject === 'function' ? d.toObject() : d),
        monto: Math.round(Number(d.monto) * factor * 100) / 100
    }));

    // 3. Las deducciones personales NO se tocan (van completas).
    // 4. ingresos[] NO se toca (es lo que realmente se depositó).

    return {
        socios,
        warnings,
        anestesiasExcluidas: excluidas.size,
        montoExcluido: Math.round(montoExcluidoTotal * 100) / 100,
        factorDeduccionesGrupales: Math.round(factor * 1e6) / 1e6
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
        // a su nombre, entonces facturó y el payload no trajo la atribución.
        if (!atribuidas.has(uid) && !prorrateados.has(uid)) {
            const tieneIngreso = (liquidacion.ingresos || []).some(
                i => i.tipo === 'socio' && uidToString(i.userId) === uid && Number(i.monto) > 0
            );
            if (tieneIngreso) {
                alertas.push(
                    `${nombre} tiene participación parcial e ingresos en esta liquidación, ` +
                    `pero ninguna anestesia atribuida: no se pudo verificar el prorrateo. ` +
                    `¿El payload trajo el profesional por anestesia?`
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
