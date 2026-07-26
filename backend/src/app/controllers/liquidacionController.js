const Liquidacion = require('../models/liquidacionModel');
const GroupPeriod = require('../models/groupPeriodModel');
const User = require('../models/userModel');
const XLSX = require('xlsx');

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
        const parteNeta = parteBruta - reserva - deduccionGrupal - deduccionPersonal + redistribucion;
        const ingresadoEnCuenta = ingresoPorSocio[uid] || 0;
        const saldo = parteNeta - ingresadoEnCuenta;

        return {
            userId: uid,
            username: usernames[uid] || uid,
            parteBruta: Math.round(parteBruta * 100) / 100,
            reserva: Math.round(reserva * 100) / 100,
            deduccionGrupal: Math.round(deduccionGrupal * 100) / 100,
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

        const distribucion = calcularDistribucion(liquidacion.toObject(), groupPeriods);

        res.json({ success: true, liquidacion, distribucion });
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
