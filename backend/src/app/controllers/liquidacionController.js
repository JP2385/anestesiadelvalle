const Liquidacion = require('../models/liquidacionModel');
const GroupPeriod = require('../models/groupPeriodModel');
const User = require('../models/userModel');
const XLSX = require('xlsx');
const config = require('../../../config');
const {
    ventanasDeParticipacion,
    aplicarProrrateo,
    controlarProrrateo
} = require('../services/prorrateoIngreso');

// Determina qué GroupPeriod estaba vigente en una fecha dada
function getPeriodForDate(periods, date) {
    // periods ordenados por fechaInicio ASC
    let vigente = null;
    for (const period of periods) {
        if (new Date(period.fechaInicio) <= new Date(date)) {
            vigente = period;
        } else {
            break;
        }
    }
    return vigente;
}

const PORCENTAJE_RESERVA_GANANCIAS = 0.29;

// Algoritmo de distribución
//
// montoTotalCobrado = neto que entra a la cuenta (ya aplicadas todas las deducciones)
// montoBruto = montoTotalCobrado + deduccionesGrupales
//              (las ded. personales se redistribuyen entre todos y no afectan el bruto distributable)
//
// Si reservaGanancias=true (solo Río Negro): se reserva el 29% del bruto antes de distribuir.
// Las anestesias se usan SOLO para determinar la PROPORCIÓN por período, no como base de monto.
// Base de distribución = montoBruto, repartida proporcionalmente al peso de anestesias en cada período.
//
// Para cada socio:
//   parte bruta = proporción_período × porcentaje_participación × montoBruto
//   ded. grupal = totalDedGrupales × (parteBruta / totalParteBruta)  [incluye reserva si aplica]
//   redistribución = totalDedPersonales × (parteBruta / totalParteBruta)
//   parte neta = parteBruta − ded.grupal − ded.personal + redistribución
//
// Suma partes netas = montoBruto − totalDedGrupales = montoTotalCobrado ✓
function calcularDistribucion(liquidacion, groupPeriods) {
    const { anestesias, ingresos, deduccionesGrupales, deduccionesPersonales, reservaGanancias, dedPersonalesInternas } = liquidacion;

    // montoTotalCobrado = suma de todos los ingresos
    const montoTotalCobrado = (ingresos || []).reduce((sum, i) => sum + i.monto, 0);

    // Ingresos por socio (para calcular saldo)
    const ingresoPorSocio = {};
    for (const ingreso of (ingresos || [])) {
        if (ingreso.tipo === 'socio' && ingreso.userId) {
            const uid = ingreso.userId?._id?.toString() || ingreso.userId?.toString();
            if (!uid) continue;
            if (!ingresoPorSocio[uid]) ingresoPorSocio[uid] = 0;
            ingresoPorSocio[uid] += ingreso.monto;
        }
    }

    // montoBruto = suma de anestesias (base de todo)
    const montoBruto = anestesias.reduce((sum, a) => sum + a.montoFacturado, 0);
    const totalDeduccionesGrupales = deduccionesGrupales.reduce((sum, d) => sum + d.monto, 0);

    // Reserva = 29% del bruto total (no por socio)
    const montoReserva = reservaGanancias ? montoBruto * PORCENTAJE_RESERVA_GANANCIAS : 0;

    // Deducciones personales por socio
    const deduccionPorSocio = {};
    const usernamesFromDed = {};
    for (const ded of deduccionesPersonales) {
        const uid = ded.userId?._id?.toString() || ded.userId?.toString();
        if (!uid) continue;
        if (!deduccionPorSocio[uid]) deduccionPorSocio[uid] = 0;
        deduccionPorSocio[uid] += ded.monto;
        if (ded.userId?.username) usernamesFromDed[uid] = ded.userId.username;
    }
    const totalDedPersonales = Object.values(deduccionPorSocio).reduce((sum, m) => sum + m, 0);

    // En ambos casos las ded. personales salen del distribuible
    // La diferencia es solo la redistribución:
    //   Neuquén (internas): redistribuye → el descuento es transferencia interna entre socios
    //   Río Negro (externas): no redistribuye → el dinero salió del pool definitivamente
    const internas = dedPersonalesInternas !== false;
    const totalDistribuible = montoBruto - montoReserva - totalDeduccionesGrupales - totalDedPersonales;

    // Agrupar anestesias por período
    const montosPorPeriodo = {};
    const periodMap = {};
    for (const anestesia of anestesias) {
        const period = getPeriodForDate(groupPeriods, anestesia.fechaPractica);
        if (!period) continue;
        const pid = period._id.toString();
        if (!montosPorPeriodo[pid]) { montosPorPeriodo[pid] = 0; periodMap[pid] = period; }
        montosPorPeriodo[pid] += anestesia.montoFacturado;
    }

    // Acumular por socio iterando período a período (igual que el Excel)
    const acumPorSocio = {}; // uid → { parteBruta, reserva, deduccionGrupal }
    const usernames = { ...usernamesFromDed };

    for (const [pid, montoEnPeriodo] of Object.entries(montosPorPeriodo)) {
        const period = periodMap[pid];
        const proporcion = montoBruto > 0 ? montoEnPeriodo / montoBruto : 0;
        const deducGrupalPeriodo = totalDeduccionesGrupales * proporcion;
        const reservaPeriodo = montoReserva * proporcion;

        for (const participacion of period.participaciones) {
            const uid = participacion.userId?._id?.toString() || participacion.userId?.toString();
            if (!uid) continue;
            if (participacion.userId?.username) usernames[uid] = participacion.userId.username;
            const pct = participacion.porcentaje / 100;
            if (!acumPorSocio[uid]) acumPorSocio[uid] = { parteBruta: 0, reserva: 0, deduccionGrupal: 0 };
            acumPorSocio[uid].parteBruta      += montoEnPeriodo * pct;
            acumPorSocio[uid].reserva         += reservaPeriodo * pct;
            acumPorSocio[uid].deduccionGrupal += deducGrupalPeriodo * pct;
        }
    }

    const distribucion = Object.entries(acumPorSocio).map(([uid, acum]) => {
        const { parteBruta, reserva, deduccionGrupal } = acum;
        const deduccionPersonal = deduccionPorSocio[uid] || 0;
        const fraccion = montoBruto > 0 ? parteBruta / montoBruto : 0;
        const redistribucion = internas ? totalDedPersonales * fraccion : 0;
        // Lo que le corresponde por su % de participación societaria, sin ajustes personales
        // (deducciones/redistribución dependen de la situación de cada socio, no de su participación).
        // Dos socios con el mismo % de participación en el mismo período tienen el mismo parteSocietaria.
        const parteSocietaria = parteBruta - reserva - deduccionGrupal;
        const parteNeta = parteSocietaria - deduccionPersonal + redistribucion;
        const ingresadoEnCuenta = ingresoPorSocio[uid] || 0;
        const saldo = parteNeta - ingresadoEnCuenta;

        return {
            userId: uid,
            username: usernames[uid] || uid,
            parteBruta: Math.round(parteBruta * 100) / 100,
            reserva: Math.round(reserva * 100) / 100,
            deduccionGrupal: Math.round(deduccionGrupal * 100) / 100,
            parteSocietaria: Math.round(parteSocietaria * 100) / 100,
            deduccionPersonal: Math.round(deduccionPersonal * 100) / 100,
            redistribucion: Math.round(redistribucion * 100) / 100,
            parteNeta: Math.round(parteNeta * 100) / 100,
            ingresadoEnCuenta: Math.round(ingresadoEnCuenta * 100) / 100,
            saldo: Math.round(saldo * 100) / 100
        };
    });

    distribucion.sort((a, b) => b.parteNeta - a.parteNeta);

    return {
        montoTotalCobrado: Math.round(montoTotalCobrado * 100) / 100,
        montoBruto: Math.round(montoBruto * 100) / 100,
        montoReserva: Math.round(montoReserva * 100) / 100,
        totalDeduccionesGrupales: Math.round(totalDeduccionesGrupales * 100) / 100,
        totalDedPersonales: Math.round(totalDedPersonales * 100) / 100,
        totalDistribuible: Math.round(totalDistribuible * 100) / 100,
        distribucion
    };
}

// GET /liquidaciones — lista todas
exports.getAllLiquidaciones = async (req, res) => {
    try {
        const liquidaciones = await Liquidacion.find()
            .sort({ fecha: -1 })
            .select('origen fecha ingresos anestesias creadoEn');

        const resumen = liquidaciones.map(l => ({
            _id: l._id,
            origen: l.origen,
            fecha: l.fecha,
            montoTotalCobrado: (l.ingresos || []).reduce((sum, i) => sum + i.monto, 0),
            cantidadAnestesias: l.anestesias.length,
            creadoEn: l.creadoEn
        }));

        res.json({ success: true, liquidaciones: resumen });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener liquidaciones' });
    }
};

// GET /liquidaciones/:id — detalle con distribución
exports.getLiquidacionById = async (req, res) => {
    try {
        const liquidacion = await Liquidacion.findById(req.params.id)
            .populate('deduccionesPersonales.userId', 'username')
            .populate('ingresos.userId', 'username');

        if (!liquidacion) {
            return res.status(404).json({ success: false, message: 'Liquidación no encontrada' });
        }

        const groupPeriods = await GroupPeriod.find()
            .sort({ fechaInicio: 1 })
            .populate('participaciones.userId', 'username');

        const plain = liquidacion.toObject();
        const distribucion = calcularDistribucion(plain, groupPeriods);

        // Control de consistencia al leer, no sólo al ingestar: una liquidación
        // guardada antes de que existiera el prorrateo, o reingestada sin la
        // atribución por socio, debe delatarse sola en vez de quedar muda.
        const ventanas = ventanasDeParticipacion(groupPeriods);
        const usernamePorUid = new Map();
        for (const period of groupPeriods) {
            for (const part of (period.participaciones || [])) {
                if (part.userId?._id && part.userId?.username) {
                    usernamePorUid.set(String(part.userId._id), part.userId.username);
                }
            }
        }
        const alertasProrrateo = controlarProrrateo(plain, ventanas, usernamePorUid);

        res.json({ success: true, liquidacion, distribucion, alertasProrrateo });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener la liquidación' });
    }
};

// POST /liquidaciones — crear
exports.createLiquidacion = async (req, res) => {
    try {
        const { origen, fecha, anestesias, ingresos, deduccionesGrupales, deduccionesPersonales, reservaGanancias, dedPersonalesInternas } = req.body;

        if (!origen || !fecha) {
            return res.status(400).json({ success: false, message: 'Origen y fecha son requeridos' });
        }

        const liquidacion = new Liquidacion({
            origen,
            fecha,
            anestesias: anestesias || [],
            ingresos: ingresos || [],
            deduccionesGrupales: deduccionesGrupales || [],
            deduccionesPersonales: deduccionesPersonales || [],
            reservaGanancias: !!reservaGanancias,
            dedPersonalesInternas: dedPersonalesInternas !== false,
            creadoPor: req.user._id
        });

        await liquidacion.save();
        res.status(201).json({ success: true, message: 'Liquidación creada exitosamente', liquidacion });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear la liquidación' });
    }
};

// PUT /liquidaciones/:id — editar
exports.updateLiquidacion = async (req, res) => {
    try {
        const { origen, fecha, anestesias, ingresos, deduccionesGrupales, deduccionesPersonales, reservaGanancias, dedPersonalesInternas } = req.body;

        const liquidacion = await Liquidacion.findByIdAndUpdate(
            req.params.id,
            { origen, fecha, anestesias, ingresos, deduccionesGrupales, deduccionesPersonales, reservaGanancias: !!reservaGanancias, dedPersonalesInternas: dedPersonalesInternas !== false },
            { new: true, runValidators: true }
        );

        if (!liquidacion) {
            return res.status(404).json({ success: false, message: 'Liquidación no encontrada' });
        }

        res.json({ success: true, message: 'Liquidación actualizada', liquidacion });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar la liquidación' });
    }
};

// DELETE /liquidaciones/:id
exports.deleteLiquidacion = async (req, res) => {
    try {
        const liquidacion = await Liquidacion.findByIdAndDelete(req.params.id);

        if (!liquidacion) {
            return res.status(404).json({ success: false, message: 'Liquidación no encontrada' });
        }

        res.json({ success: true, message: 'Liquidación eliminada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar la liquidación' });
    }
};

// GET /liquidaciones/plantilla — descarga plantilla Excel (.xlsx)
exports.downloadPlantilla = (req, res) => {
    const wb = XLSX.utils.book_new();

    // ── Hoja 1: Datos generales ──────────────────────────────────────────
    const datosGenerales = [
        ['campo', 'valor', 'valores válidos'],
        ['fecha', '', 'ej: 2025-07-01'],
        ['origen', '', 'Neuquén  |  Río Negro'],
    ];
    const wsDatos = XLSX.utils.aoa_to_sheet(datosGenerales);
    wsDatos['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos Generales');

    // ── Hoja 2: Ingresos ─────────────────────────────────────────────────
    const ingresos = [
        ['tipo', 'socio', 'monto'],
        ['empresa', '', 150000],
        ['socio', 'username_del_socio', 50000],
    ];
    const wsIngresos = XLSX.utils.aoa_to_sheet(ingresos);
    wsIngresos['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsIngresos, 'Ingresos');

    // ── Hoja 3: Anestesias ──────────────────────────────────────────────
    const anestesias = [
        ['paciente', 'fechaPractica', 'obraSocial', 'lugarPractica', 'montoFacturado', 'iva'],
        ['Juan Pérez', '2025-07-01', 'OSDE', 'Clínica Norte', 12000, 0],
        ['María García', '2025-07-03', 'Swiss Medical', 'Sanatorio Sur', 15000, 2520],
    ];
    const wsAnestesias = XLSX.utils.aoa_to_sheet(anestesias);
    wsAnestesias['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, wsAnestesias, 'Anestesias');

    // ── Hoja 4: Deducciones Grupales ────────────────────────────────────
    const dedGrupales = [
        ['concepto', 'monto'],
        ['IIBB', 5000],
        ['Honorarios contador', 1200],
    ];
    const wsDedGrupales = XLSX.utils.aoa_to_sheet(dedGrupales);
    wsDedGrupales['!cols'] = [{ wch: 30 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsDedGrupales, 'Deducciones Grupales');

    // ── Hoja 5: Deducciones Personales ──────────────────────────────────
    const dedPersonales = [
        ['socio', 'concepto', 'monto'],
        ['username_del_socio', 'Prepaga', 3000],
        ['username_del_socio', 'Gimnasio', 500],
    ];
    const wsDedPersonales = XLSX.utils.aoa_to_sheet(dedPersonales);
    wsDedPersonales['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsDedPersonales, 'Deducciones Personales');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-liquidacion.xlsx"');
    res.send(buffer);
};

exports.calcularDistribucion = calcularDistribucion;
exports.getPeriodForDate = getPeriodForDate;

// ═══════════════════════════════════════════════════════════════════════
//  Generación automática (microservicio Python: scrapea saludng + evweb)
// ═══════════════════════════════════════════════════════════════════════

// jobId -> resumen ya guardado (evita re-guardar en cada poll)
const _jobsGuardados = new Map();

function _svcHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Service-Secret': config.liquidacionesServiceSecret || ''
    };
}

// Resuelve el socio de una anestesia del payload. El microservicio identifica a
// los socios por username (jbo, rriso, ggudiño…) y los GroupPeriod por _id, así
// que hay que mapear. Algunos usernames conservan la ñ y ciertos códigos de
// evweb difieren del usuario de la app (GOCASTRO→gcastro,
// MASCHVARTZMAN→mschvartzman); el microservicio ya entrega el username de la
// app, pero si no resuelve hay que avisar en vez de seguir sin atribución:
// una anestesia sin socio se trata como del pozo y el prorrateo no corre.
// Hay DOS tipos de anestesia en el payload de NQN, y sólo uno se atribuye:
//
//   - las del GRUPO (371 en el período 10/2026): los socios históricos ven el
//     MISMO listado en evweb y el scraper las deduplica. El `profesional` ahí
//     es quién las ve, no de quién son: son del pozo del grupo y NO se
//     atribuyen a nadie — si se atribuyeran, el prorrateo le recortaría al
//     grupo anestesias que sí le corresponden.
//
//   - las PROPIAS (35 de JBO, 19 de RRISO): listado individual del socio. Son
//     las que hay que atribuir, porque son las que pueden ser previas a su
//     ingreso al grupo.
//
// El scraper marca cuáles son propias con `propia: true` (o `tipo: 'propia'`).
// Sin esa marca no se atribuye nada: es más seguro no prorratear y avisar que
// atribuirle al grupo entero las anestesias de un socio.
function _socioDeAnestesia(a, userMap, warnings, stats) {
    const esPropia = a.propia === true || String(a.tipo || '').toLowerCase() === 'propia';
    if (!esPropia) {
        if (stats) stats.sinMarcaPropia++;
        return null; // anestesia del pozo del grupo
    }
    if (stats) stats.propias++;

    const raw = a.socio ?? a.profesional ?? a.username ?? null;
    if (!raw) {
        const msg = `Anestesias: hay anestesias propias sin socio; no se pueden ` +
            `atribuir y el prorrateo no se aplica a ese socio`;
        if (!warnings.includes(msg)) warnings.push(msg);
        return null;
    }

    const key = String(raw).trim().toLowerCase();
    const uid = userMap[key];
    if (!uid) {
        // Si viene con espacios es el nombre completo de evweb ("ALAN LEANDRO
        // MACIAS") en vez del username (amacias). El arreglo es en el scraper:
        // mandar el username, igual que en ingresos[] y deduccionesPersonales[].
        const pareceNombreCompleto = /\s/.test(String(raw).trim());
        const msg = pareceNombreCompleto
            ? `Anestesias: "${raw}" parece un nombre completo de evweb, no un ` +
              `username. El payload debe mandar el username de la app (ej: amacias), ` +
              `igual que en ingresos[]. Sus anestesias propias quedan sin atribuir ` +
              `y el prorrateo NO se aplica.`
            : `Anestesias: profesional "${raw}" no encontrado; sus anestesias ` +
              `propias quedan sin atribuir y el prorrateo NO se aplica`;
        if (!warnings.includes(msg)) warnings.push(msg);
        return null;
    }
    return uid;
}

// Diagnóstico del payload: qué campos trae realmente cada anestesia y con qué
// valores. Sin esto el prorrateo falla a ciegas — no se puede distinguir "el
// scraper no manda la marca" de "la manda con otro nombre" o "el username no
// matchea". Devuelve líneas para el log del job.
function _diagnosticarPayload(p, userMap, ventanas, usernamePorUid) {
    const out = [];
    const anest = p.anestesias || [];

    out.push(`DIAG payload ${p.origen} ${p.fecha}: ${anest.length} anestesias, ` +
        `${(p.ingresos || []).length} ingresos, ` +
        `${(p.deduccionesGrupales || []).length} ded.grupales, ` +
        `${(p.deduccionesPersonales || []).length} ded.personales`);

    if (anest.length) {
        // Qué campos vienen en las anestesias (la unión de todas las claves)
        const claves = new Set();
        anest.forEach(a => Object.keys(a || {}).forEach(k => claves.add(k)));
        out.push(`DIAG campos en anestesias[]: ${[...claves].sort().join(', ')}`);

        // Una muestra cruda, que es lo que más rápido delata el formato
        out.push(`DIAG primera anestesia: ${JSON.stringify(anest[0])}`);

        // Cómo se distribuyen los valores de los campos que uso para atribuir
        const cuenta = (fn) => {
            const m = new Map();
            anest.forEach(a => {
                const v = fn(a);
                const k = v === undefined ? '(ausente)' : v === null ? '(null)' : String(v);
                m.set(k, (m.get(k) || 0) + 1);
            });
            return [...m.entries()].map(([k, n]) => `${k}=${n}`).join(' ');
        };
        out.push(`DIAG propia: ${cuenta(a => a.propia)}`);
        out.push(`DIAG tipo:   ${cuenta(a => a.tipo)}`);

        // Profesionales y si resuelven contra los usernames de la app
        const prof = new Map();
        anest.forEach(a => {
            const raw = a.socio ?? a.profesional ?? a.username ?? null;
            const k = raw === null || raw === undefined ? '(ausente)' : String(raw);
            prof.set(k, (prof.get(k) || 0) + 1);
        });
        for (const [raw, n] of prof) {
            const resuelve = raw !== '(ausente)' && !!userMap[raw.trim().toLowerCase()];
            out.push(`DIAG profesional "${raw}" x${n} -> ${resuelve ? 'OK' : 'NO MATCHEA'}`);
        }

        const sinFecha = anest.filter(a => !a.fechaPractica).length;
        if (sinFecha) out.push(`DIAG ${sinFecha} anestesia(s) sin fechaPractica`);
    }

    // Ventanas de participación: si está vacío, no hay GroupPeriod con 0% y el
    // prorrateo no tiene a quién aplicar, por más que el payload venga perfecto.
    if (!ventanas || ventanas.size === 0) {
        out.push(`DIAG ventanas de participación: NINGUNA. No hay GroupPeriod con ` +
            `participación 0%, así que ningún socio se considera de ingreso parcial ` +
            `y el prorrateo no se aplica a nadie.`);
    } else {
        for (const [uid, v] of ventanas) {
            out.push(`DIAG ventana ${usernamePorUid.get(uid) || uid}: ` +
                `ingreso ${v.ingreso ? v.ingreso.toISOString().substring(0, 10) : '—'}` +
                `${v.egreso ? `, egreso ${v.egreso.toISOString().substring(0, 10)}` : ''}`);
        }
    }

    return out;
}

// Resuelve el socio de una deducción grupal. A diferencia de las anestesias, un
// username que no resuelve acá es un error duro: la deducción existe y es de
// alguien, y dejarla sin atribuir la volvería no prorrateable en silencio.
function _socioDeDeduccion(d, userMap, warnings) {
    const key = String(d.socio || '').trim().toLowerCase();
    const uid = key ? userMap[key] : null;
    if (!uid) {
        const msg = `Ded. Grupales: usuario "${d.socio}" no encontrado; la ` +
            `deducción "${d.concepto}" queda sin atribuir y no se podrá prorratear`;
        if (!warnings.includes(msg)) warnings.push(msg);
        return null;
    }
    return uid;
}

async function _guardarDesdePayload(p, userMap, creadoPor, groupPeriods) {
    if (!p || !p.origen || !p.fecha) throw new Error('payload sin origen/fecha');

    const ingresos = [];
    for (const i of (p.ingresos || [])) {
        const monto = Number(i.monto);
        if (!(monto > 0)) continue;
        if (String(i.tipo || '').toLowerCase() === 'empresa') {
            ingresos.push({ tipo: 'empresa', userId: null, monto });
        } else {
            const uid = userMap[String(i.socio || '').toLowerCase()];
            if (!uid) throw new Error(`Ingresos: usuario "${i.socio}" no encontrado`);
            ingresos.push({ tipo: 'socio', userId: uid, monto });
        }
    }

    const warnings = [...(p.warnings || [])];

    // Una anestesia sin fechaPractica no se puede clasificar como previa o
    // posterior al ingreso de un socio, y entra en el denominador de la
    // proporción. Antes se descartaba en silencio; ahora se avisa, porque mueve
    // plata en el reparto de todos.
    const sinFecha = (p.anestesias || []).filter(a => !a.fechaPractica);
    if (sinFecha.length) {
        warnings.push(
            `Anestesias: ${sinFecha.length} sin fecha de práctica, omitidas. ` +
            `Si pertenecen a un socio con participación parcial, el prorrateo ` +
            `queda mal calculado. Revisar a mano.`
        );
    }

    // Cuántas llegaron, cuántas se guardan y cuántas se atribuyeron: si el
    // payload trae 425 y se guardan 420, hay 5 que se filtraron y el prorrateo
    // las cuenta mal. Mejor decirlo que dejar el número suelto.
    const recibidas = (p.anestesias || []).length;
    const statsAnest = { propias: 0, sinMarcaPropia: 0 };

    const anestesias = (p.anestesias || [])
        .filter(a => a.fechaPractica && Number(a.montoFacturado) >= 0)
        .map(a => ({
            paciente: String(a.paciente || '').trim(),
            fechaPractica: a.fechaPractica,
            obraSocial: String(a.obraSocial || '').trim(),
            lugarPractica: String(a.lugarPractica || '').trim(),
            montoFacturado: Number(a.montoFacturado),
            iva: Number(a.iva) || 0,
            userId: _socioDeAnestesia(a, userMap, warnings, statsAnest)
        }));

    if (anestesias.length !== recibidas) {
        warnings.push(
            `Anestesias: llegaron ${recibidas} del scraper pero se guardaron ` +
            `${anestesias.length}; ${recibidas - anestesias.length} quedaron afuera ` +
            `por falta de fechaPractica o monto inválido. Si son de un socio con ` +
            `participación parcial, su proporción queda mal calculada.`
        );
    }

    // Ninguna marcada como propia: o el scraper no manda la marca, o este
    // período realmente no tiene socios con listado individual. En el período
    // 10/2026 hay 54 (35 de JBO + 19 de RRISO), así que el silencio es sospechoso.
    if (statsAnest.propias === 0 && recibidas > 0) {
        warnings.push(
            `Anestesias: ninguna de las ${recibidas} viene marcada como propia ` +
            `(propia: true / tipo: 'propia'), así que TODAS se trataron como del ` +
            `pozo del grupo y el prorrateo no se aplicó a nadie. Si algún socio ` +
            `tiene listado individual en evweb, falta esa marca en el payload.`
        );
    }

    // El `socio` es opcional: si el payload lo trae, la deducción se puede
    // prorratear; si no, queda agregada (userId null) y el prorrateo avisa que
    // no la pudo ajustar en vez de tocarle el total a los 16 socios.
    const deduccionesGrupales = (p.deduccionesGrupales || [])
        .filter(d => d.concepto && Number(d.monto) > 0)
        .map(d => ({
            userId: d.socio ? _socioDeDeduccion(d, userMap, warnings) : null,
            concepto: String(d.concepto).trim(),
            monto: Number(d.monto)
        }));

    const deduccionesPersonales = [];
    for (const d of (p.deduccionesPersonales || [])) {
        const monto = Number(d.monto);
        if (!d.concepto || !(monto > 0)) continue;
        const uid = userMap[String(d.socio || '').toLowerCase()];
        if (!uid) throw new Error(`Ded. Personales: usuario "${d.socio}" no encontrado`);
        deduccionesPersonales.push({ userId: uid, concepto: String(d.concepto).trim(), monto });
    }

    const doc = {
        origen: p.origen,
        fecha: new Date(p.fecha),
        anestesias, ingresos, deduccionesGrupales, deduccionesPersonales,
        reservaGanancias: !!p.reservaGanancias,
        dedPersonalesInternas: p.dedPersonalesInternas !== false,
        creadoPor
    };

    // ── Prorrateo por ingreso/egreso al grupo ───────────────────────────────
    // Excluye del pozo las anestesias previas al ingreso (o posteriores al
    // egreso) de un socio con participación parcial, y reduce las deducciones
    // grupales en esa misma proporción. Muta doc.anestesias y
    // doc.deduccionesGrupales. Las personales e ingresos[] no se tocan.
    const ventanas = ventanasDeParticipacion(groupPeriods);
    const usernamePorUid = new Map(
        Object.entries(userMap).map(([username, uid]) => [String(uid), username])
    );

    // Diagnóstico: qué llegó del scraper y qué ventanas hay. Va al log del job
    // para poder ver por qué el prorrateo no corre, en vez de adivinar.
    const diagnostico = _diagnosticarPayload(p, userMap, ventanas, usernamePorUid);
    diagnostico.push(
        `DIAG atribuidas a un socio: ` +
        `${anestesias.filter(a => a.userId).length}/${anestesias.length}`
    );
    diagnostico.forEach(l => console.log(l));

    const prorrateo = aplicarProrrateo(doc, ventanas, usernamePorUid);
    if (prorrateo) {
        doc.prorrateo = prorrateo;
        warnings.push(...prorrateo.warnings);
        for (const s of prorrateo.socios) {
            warnings.push(
                `Prorrateo ${s.username}: ${s.anestesiasExcluidas}/${s.anestesiasTotales} ` +
                `anestesia(s) excluidas por estar fuera de su participación; ` +
                `proporción ${(s.proporcion * 100).toFixed(2)}%`
            );
        }
    } else {
        doc.prorrateo = null;
    }

    // Control (punto 5): un socio con participación parcial que quedó sin
    // prorratear. El cuadre del microservicio no lo detecta —cierra igual con
    // prorrateo y sin él—, así que hace falta este control del lado de la app.
    const alertas = controlarProrrateo(doc, ventanas, usernamePorUid);
    if (alertas.length) warnings.push(...alertas.map(a => `⚠ ${a}`));

    // upsert por (origen, día de la fecha)
    const d0 = new Date(p.fecha);
    const d1 = new Date(d0); d1.setUTCDate(d1.getUTCDate() + 1);
    const existente = await Liquidacion.findOne({ origen: doc.origen, fecha: { $gte: d0, $lt: d1 } });

    let accion;
    if (existente) {
        Object.assign(existente, doc);
        await existente.save();
        accion = 'actualizada';
    } else {
        await new Liquidacion(doc).save();
        accion = 'creada';
    }
    return {
        origen: doc.origen, fecha: p.fecha, accion,
        // doc.anestesias, no `anestesias`: el prorrateo pudo excluir algunas
        anestesias: doc.anestesias.length, ingresos: ingresos.length,
        anestesiasRecibidas: recibidas,
        anestesiasPropias: statsAnest.propias,
        diagnostico,
        deduccionesPersonales: deduccionesPersonales.length,
        prorrateo: doc.prorrateo
            ? {
                anestesiasExcluidas: doc.prorrateo.anestesiasExcluidas,
                socios: doc.prorrateo.socios.map(s => ({
                    username: s.username,
                    proporcion: s.proporcion,
                    anestesiasExcluidas: s.anestesiasExcluidas
                }))
            }
            : null,
        warnings
    };
}

// POST /liquidaciones/auto  { desde, hasta, origen? }
exports.generarAutomatico = async (req, res) => {
    try {
        if (!config.liquidacionesServiceUrl || !config.liquidacionesServiceSecret) {
            return res.status(503).json({ success: false, message: 'Servicio de generación no configurado' });
        }
        const { desde, hasta, origen = 'ambos' } = req.body || {};
        if (!desde || !hasta) {
            return res.status(400).json({ success: false, message: 'desde y hasta son requeridos (YYYY-MM-DD)' });
        }

        const r = await fetch(`${config.liquidacionesServiceUrl.replace(/\/$/, '')}/jobs`, {
            method: 'POST',
            headers: _svcHeaders(),
            body: JSON.stringify({ desde, hasta, origen })
        });
        const data = await r.json();
        if (!r.ok) {
            return res.status(502).json({ success: false, message: data.detail || 'El servicio rechazó el pedido' });
        }
        res.json({ success: true, jobId: data.jobId });
    } catch (error) {
        console.error('generarAutomatico:', error);
        res.status(502).json({ success: false, message: 'No se pudo contactar el servicio de generación' });
    }
};

// GET /liquidaciones/auto/:jobId
exports.estadoGeneracionAutomatica = async (req, res) => {
    try {
        if (!config.liquidacionesServiceUrl || !config.liquidacionesServiceSecret) {
            return res.status(503).json({ success: false, message: 'Servicio de generación no configurado' });
        }
        const { jobId } = req.params;

        if (_jobsGuardados.has(jobId)) {
            return res.json({ success: true, estado: 'guardado', ..._jobsGuardados.get(jobId) });
        }

        const r = await fetch(`${config.liquidacionesServiceUrl.replace(/\/$/, '')}/jobs/${jobId}`, {
            headers: _svcHeaders()
        });
        const job = await r.json();
        if (!r.ok) {
            return res.status(r.status === 404 ? 404 : 502).json({ success: false, message: job.detail || 'Error consultando el job' });
        }

        if (job.estado === 'error') {
            return res.json({ success: true, estado: 'error', log: job.log || [], error: job.error });
        }
        if (job.estado !== 'listo') {
            return res.json({ success: true, estado: job.estado, log: job.log || [] });
        }

        // listo -> guardar todas
        const users = await User.find().select('_id username');
        const userMap = {};
        users.forEach(u => { userMap[String(u.username).toLowerCase()] = u._id; });

        // Los GroupPeriod resuelven ingreso/egreso vía participaciones al 0%
        const groupPeriods = await GroupPeriod.find().sort({ fechaInicio: 1 });

        const resumen = [];
        const errores = [];
        for (const payload of (job.resultado || [])) {
            try {
                resumen.push(await _guardarDesdePayload(payload, userMap, req.user._id, groupPeriods));
            } catch (e) {
                errores.push(`${payload.origen} ${payload.fecha}: ${e.message}`);
            }
        }

        const out = { log: job.log || [], resumen, errores };
        if (errores.length === 0) _jobsGuardados.set(jobId, out);

        res.json({ success: true, estado: errores.length ? 'guardado_con_errores' : 'guardado', ...out });
    } catch (error) {
        console.error('estadoGeneracionAutomatica:', error);
        res.status(502).json({ success: false, message: 'Error consultando el estado' });
    }
};

// POST /liquidaciones/importar — parsea Excel (.xlsx) con 3 hojas
// Hoja "Anestesias": paciente, fechaPractica, obraSocial, lugarPractica, montoFacturado, iva
// Hoja "Deducciones Grupales": concepto, monto
// Hoja "Deducciones Personales": socio (username), concepto, monto
exports.importarCSV = async (req, res) => {
    try {
        const body = req.body; // base64 string enviado desde el frontend

        if (!body || typeof body !== 'string') {
            return res.status(400).json({ success: false, message: 'Body inválido' });
        }

        // Decodificar base64 → buffer → workbook
        const buffer = Buffer.from(body, 'base64');
        const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

        // Cargar usuarios para mapear username → _id
        const users = await User.find().select('_id username');
        const userMap = {};
        users.forEach(u => { userMap[u.username.toLowerCase()] = u._id; });

        const warnings = [];

        // ── Hoja Datos Generales ─────────────────────────────────────────
        const wsDG_gen = wb.Sheets['Datos Generales'];
        let datosGenerales = {};
        if (wsDG_gen) {
            const rows = XLSX.utils.sheet_to_json(wsDG_gen, { defval: '' });
            rows.forEach(row => {
                const campo = String(row['campo'] || '').trim();
                const valor = row['valor'];
                if (campo) datosGenerales[campo] = valor;
            });
        }

        // Parsear fecha
        let fechaGeneral = null;
        if (datosGenerales['fecha']) {
            const f = datosGenerales['fecha'];
            if (f instanceof Date) {
                fechaGeneral = f.toISOString().substring(0, 10);
            } else {
                fechaGeneral = String(f).trim();
            }
        }
        const origenGeneral = String(datosGenerales['origen'] || '').trim() || null;

        // ── Hoja Ingresos ────────────────────────────────────────────────
        const wsIng = wb.Sheets['Ingresos'];
        const ingresos = [];
        if (wsIng) {
            const rows = XLSX.utils.sheet_to_json(wsIng, { defval: '' });
            rows.forEach((row, i) => {
                const monto = parseFloat(row['monto']);
                const tipoRaw = String(row['tipo'] || '').trim().toLowerCase();
                if (isNaN(monto) || monto <= 0) {
                    warnings.push(`Ingresos fila ${i + 2}: omitida (monto inválido)`);
                    return;
                }
                if (tipoRaw === 'empresa') {
                    ingresos.push({ tipo: 'empresa', userId: null, monto });
                } else {
                    const socioUsername = String(row['socio'] || '').trim().toLowerCase();
                    const userId = socioUsername ? userMap[socioUsername] : null;
                    if (!userId) {
                        warnings.push(`Ingresos fila ${i + 2}: usuario "${row['socio']}" no encontrado, omitida`);
                        return;
                    }
                    ingresos.push({ tipo: 'socio', userId, monto });
                }
            });
        }

        // ── Hoja Anestesias ──────────────────────────────────────────────
        const wsAn = wb.Sheets['Anestesias'];
        const anestesias = [];
        if (wsAn) {
            const rows = XLSX.utils.sheet_to_json(wsAn, { defval: '' });
            rows.forEach((row, i) => {
                const monto = parseFloat(row['montoFacturado']);
                const fechaRaw = row['fechaPractica'];
                if (!fechaRaw || isNaN(monto)) {
                    warnings.push(`Anestesias fila ${i + 2}: omitida (fecha o monto inválido)`);
                    return;
                }
                // Si XLSX devuelve un Date, formatearlo; si es string, usarlo directo
                let fechaStr;
                if (fechaRaw instanceof Date) {
                    fechaStr = fechaRaw.toISOString().substring(0, 10);
                } else {
                    fechaStr = String(fechaRaw).trim();
                }
                anestesias.push({
                    paciente: String(row['paciente'] || '').trim(),
                    fechaPractica: fechaStr,
                    obraSocial: String(row['obraSocial'] || '').trim(),
                    lugarPractica: String(row['lugarPractica'] || '').trim(),
                    montoFacturado: monto,
                    iva: parseFloat(row['iva']) || 0
                });
            });
        } else {
            warnings.push('No se encontró la hoja "Anestesias"');
        }

        // ── Hoja Deducciones Grupales ────────────────────────────────────
        const wsDG = wb.Sheets['Deducciones Grupales'];
        const deduccionesGrupales = [];
        if (wsDG) {
            const rows = XLSX.utils.sheet_to_json(wsDG, { defval: '' });
            rows.forEach((row, i) => {
                const monto = parseFloat(row['monto']);
                const concepto = String(row['concepto'] || '').trim();
                if (!concepto || isNaN(monto)) {
                    warnings.push(`Ded. Grupales fila ${i + 2}: omitida (concepto o monto inválido)`);
                    return;
                }
                deduccionesGrupales.push({ concepto, monto });
            });
        }

        // ── Hoja Deducciones Personales ──────────────────────────────────
        const wsDP = wb.Sheets['Deducciones Personales'];
        const deduccionesPersonales = [];
        if (wsDP) {
            const rows = XLSX.utils.sheet_to_json(wsDP, { defval: '' });
            rows.forEach((row, i) => {
                const monto = parseFloat(row['monto']);
                const concepto = String(row['concepto'] || '').trim();
                const socioUsername = String(row['socio'] || '').trim().toLowerCase();
                const userId = socioUsername ? userMap[socioUsername] : null;

                if (!concepto || isNaN(monto)) {
                    warnings.push(`Ded. Personales fila ${i + 2}: omitida (concepto o monto inválido)`);
                    return;
                }
                if (socioUsername && !userId) {
                    warnings.push(`Ded. Personales fila ${i + 2}: usuario "${row['socio']}" no encontrado, omitida`);
                    return;
                }
                deduccionesPersonales.push({ userId, concepto, monto });
            });
        }

        res.json({
            success: true,
            data: { fecha: fechaGeneral, origen: origenGeneral, ingresos, anestesias, deduccionesGrupales, deduccionesPersonales },
            warnings
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al procesar el archivo' });
    }
};
