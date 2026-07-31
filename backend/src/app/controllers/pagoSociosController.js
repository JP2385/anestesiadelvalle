const PagoSocios = require('../models/pagoSociosModel');
const Liquidacion = require('../models/liquidacionModel');
const GroupPeriod = require('../models/groupPeriodModel');
const { calcularDistribucion } = require('./liquidacionController');
const XLSX = require('xlsx');

// Recalcula, para un conjunto de liquidaciones individuales, el saldo acumulado por socio
async function calcularSaldosAcumulados(liquidacionIds) {
    const liquidaciones = await Liquidacion.find({ _id: { $in: liquidacionIds } })
        .populate('deduccionesPersonales.userId', 'username')
        .populate('ingresos.userId', 'username');

    const groupPeriods = await GroupPeriod.find()
        .sort({ fechaInicio: 1 })
        .populate('participaciones.userId', 'username');

    const saldoPorSocio = {}; // uid → { saldo, username }

    for (const liquidacion of liquidaciones) {
        const distribucion = calcularDistribucion(liquidacion.toObject(), groupPeriods);
        for (const s of distribucion.distribucion) {
            if (!saldoPorSocio[s.userId]) saldoPorSocio[s.userId] = { saldo: 0, username: s.username };
            saldoPorSocio[s.userId].saldo += s.saldo;
        }
    }

    return saldoPorSocio;
}

function calcularPagoNeto(saldoAcumulado, socio) {
    const totalAportes = (socio.aportes || []).reduce((sum, a) => sum + a.monto, 0);
    const totalDeducciones = (socio.deducciones || []).reduce((sum, d) => sum + d.monto, 0);
    const deudaArrastrada = socio.deudaArrastrada || 0;
    const pagoNeto = saldoAcumulado + totalAportes - totalDeducciones - deudaArrastrada;
    return {
        totalAportes: Math.round(totalAportes * 100) / 100,
        totalDeducciones: Math.round(totalDeducciones * 100) / 100,
        pagoNeto: Math.round(pagoNeto * 100) / 100
    };
}

// GET /pagos-socios — lista todos
exports.getAllPagosSocios = async (req, res) => {
    try {
        const pagos = await PagoSocios.find().sort({ fechaHasta: -1 });

        const resumen = await Promise.all(pagos.map(async p => {
            const totalSocios = p.socios.length;
            const pagados = p.socios.filter(s => s.pagado).length;
            let estado = 'pendiente';
            if (totalSocios > 0 && pagados === totalSocios) estado = 'pagado';
            else if (pagados > 0) estado = 'pagado parcial';

            let totalDesembolso = 0;
            const pendientes = p.socios.filter(s => !s.pagado);
            if (pendientes.length > 0) {
                const saldoPorSocio = await calcularSaldosAcumulados(p.liquidaciones);
                for (const socio of pendientes) {
                    const uid = socio.userId.toString();
                    const saldoAcumulado = saldoPorSocio[uid]?.saldo || 0;
                    const { pagoNeto } = calcularPagoNeto(saldoAcumulado, socio);
                    if (pagoNeto > 0) totalDesembolso += pagoNeto;
                }
            }

            const totalPagado = p.socios
                .filter(s => s.pagado)
                .reduce((sum, s) => sum + (s.montoPagado || 0), 0);

            return {
                _id: p._id,
                fechaDesde: p.fechaDesde,
                fechaHasta: p.fechaHasta,
                fechaPago: p.fechaPago,
                cantidadLiquidaciones: p.liquidaciones.length,
                cantidadSocios: totalSocios,
                estado,
                totalDesembolso: Math.round(totalDesembolso * 100) / 100,
                totalPagado: Math.round(totalPagado * 100) / 100
            };
        }));

        res.json({ success: true, pagos: resumen });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener los pagos a socios' });
    }
};

// GET /pagos-socios/:id — detalle con saldo acumulado y pago neto por socio
exports.getPagoSociosById = async (req, res) => {
    try {
        const pago = await PagoSocios.findById(req.params.id)
            .populate('liquidaciones', 'origen fecha')
            .populate('socios.userId', 'username nombre apellido');

        if (!pago) {
            return res.status(404).json({ success: false, message: 'Pago a socios no encontrado' });
        }

        const saldoPorSocio = await calcularSaldosAcumulados(pago.liquidaciones.map(l => l._id));

        const socios = pago.socios.map(socio => {
            const uid = socio.userId._id.toString();
            const saldoAcumulado = saldoPorSocio[uid]?.saldo || 0;
            const { totalAportes, totalDeducciones, pagoNeto } = calcularPagoNeto(saldoAcumulado, socio);

            return {
                userId: uid,
                username: socio.userId.username,
                nombre: socio.userId.nombre || '',
                apellido: socio.userId.apellido || '',
                saldoAcumulado: Math.round(saldoAcumulado * 100) / 100,
                aportes: socio.aportes,
                deducciones: socio.deducciones,
                totalAportes,
                totalDeducciones,
                deudaArrastrada: socio.deudaArrastrada || 0,
                pagoNeto,
                pagado: socio.pagado,
                montoPagado: socio.montoPagado
            };
        });

        const nombreOrden = s => s.apellido ? `${s.apellido}, ${s.nombre}` : s.username;
        socios.sort((a, b) => nombreOrden(a).localeCompare(nombreOrden(b), 'es'));

        res.json({
            success: true,
            pago: {
                _id: pago._id,
                fechaDesde: pago.fechaDesde,
                fechaHasta: pago.fechaHasta,
                fechaPago: pago.fechaPago,
                liquidaciones: pago.liquidaciones,
                creadoEn: pago.creadoEn
            },
            socios
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener el pago a socios' });
    }
};

// GET /pagos-socios/:id/excel — descarga Excel con el monto a abonar por socio
exports.downloadExcel = async (req, res) => {
    try {
        const pago = await PagoSocios.findById(req.params.id)
            .populate('liquidaciones', 'origen fecha')
            .populate('socios.userId', 'username nombre apellido');

        if (!pago) {
            return res.status(404).json({ success: false, message: 'Pago a socios no encontrado' });
        }

        const saldoPorSocio = await calcularSaldosAcumulados(pago.liquidaciones.map(l => l._id));

        const socios = pago.socios.map(socio => {
            const uid = socio.userId._id.toString();
            const saldoAcumulado = saldoPorSocio[uid]?.saldo || 0;
            const { pagoNeto } = calcularPagoNeto(saldoAcumulado, socio);
            // Mismo criterio que registrarPago: si el neto es negativo no se le abona nada
            const monto = socio.pagado ? (socio.montoPagado || 0) : Math.max(0, pagoNeto);
            const nombreCompleto = socio.userId.apellido
                ? `${socio.userId.apellido}, ${socio.userId.nombre}`
                : socio.userId.username;
            return { nombreCompleto, monto: Math.round(monto * 100) / 100 };
        });

        socios.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));

        const wb = XLSX.utils.book_new();
        const filas = [
            ['Socio', 'Monto a abonar'],
            ...socios.map(s => [s.nombreCompleto, s.monto])
        ];
        const ws = XLSX.utils.aoa_to_sheet(filas);
        ws['!cols'] = [{ wch: 24 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Monto a abonar');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const fechaDesde = new Date(pago.fechaDesde).toISOString().substring(0, 10);
        const fechaHasta = new Date(pago.fechaHasta).toISOString().substring(0, 10);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="pago-socios-${fechaDesde}-a-${fechaHasta}.xlsx"`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al generar el Excel' });
    }
};

// POST /pagos-socios — crear
exports.createPagoSocios = async (req, res) => {
    try {
        const { liquidaciones } = req.body;

        if (!Array.isArray(liquidaciones) || liquidaciones.length === 0) {
            return res.status(400).json({ success: false, message: 'Seleccioná al menos una liquidación' });
        }

        // Validar que ninguna liquidación ya esté incluida en otro Pago a Socios
        const conflictos = await PagoSocios.find({ liquidaciones: { $in: liquidaciones } })
            .populate('liquidaciones', 'origen fecha');
        if (conflictos.length > 0) {
            const idsConflicto = new Set(liquidaciones.map(String));
            const detalles = [];
            for (const pago of conflictos) {
                for (const liq of pago.liquidaciones) {
                    if (idsConflicto.has(liq._id.toString())) {
                        detalles.push(`${liq.origen} ${new Date(liq.fecha).toISOString().substring(0, 10)}`);
                    }
                }
            }
            return res.status(400).json({
                success: false,
                message: `Las siguientes liquidaciones ya están incluidas en otro pago a socios: ${detalles.join(', ')}`
            });
        }

        // fechaHasta se deriva de la fecha máxima de las liquidaciones seleccionadas.
        // fechaDesde arranca el día siguiente al cierre del período anterior (períodos contiguos,
        // sin huecos), o la fecha mínima de las liquidaciones si es el primer Pago a Socios.
        const liquidacionesDocs = await Liquidacion.find({ _id: { $in: liquidaciones } }).select('fecha');
        const fechas = liquidacionesDocs.map(l => new Date(l.fecha));
        const fechaHasta = new Date(Math.max(...fechas));

        // Buscar el Pago a Socios anterior más reciente para precargar deuda arrastrada y continuar el período
        const pagoAnterior = await PagoSocios.findOne().sort({ fechaHasta: -1 });

        let fechaDesde;
        if (pagoAnterior) {
            fechaDesde = new Date(pagoAnterior.fechaHasta);
            fechaDesde.setDate(fechaDesde.getDate() + 1);
        } else {
            fechaDesde = new Date(Math.min(...fechas));
        }

        // Evitar que queden liquidaciones "sueltas" dentro del rango del período: si hay liquidaciones
        // existentes con fecha entre fechaDesde y fechaHasta que no fueron seleccionadas, avisar.
        const idsSeleccionados = new Set(liquidaciones.map(String));
        const liquidacionesEnRango = await Liquidacion.find({
            fecha: { $gte: fechaDesde, $lte: fechaHasta },
            _id: { $nin: Array.from(idsSeleccionados) }
        }).select('origen fecha');
        if (liquidacionesEnRango.length > 0) {
            const detalles = liquidacionesEnRango.map(l => `${l.origen} ${new Date(l.fecha).toISOString().substring(0, 10)}`);
            return res.status(400).json({
                success: false,
                message: `Hay liquidaciones dentro de este período (${fechaDesde.toISOString().substring(0, 10)} a ${fechaHasta.toISOString().substring(0, 10)}) que no seleccionaste: ${detalles.join(', ')}. Incluilas o seleccioná un rango distinto.`
            });
        }

        const saldoPorSocio = await calcularSaldosAcumulados(liquidaciones);

        let deudaPorSocio = {};
        if (pagoAnterior) {
            const saldoAnterior = await calcularSaldosAcumulados(pagoAnterior.liquidaciones);
            for (const socio of pagoAnterior.socios) {
                const uid = socio.userId.toString();
                const saldoAcumulado = saldoAnterior[uid]?.saldo || 0;
                const { pagoNeto } = calcularPagoNeto(saldoAcumulado, socio);
                // Si el pago neto quedó negativo, el socio queda debiendo independientemente
                // de si ya se registró el pago del período (el pago efectuado fue 0, no negativo)
                if (pagoNeto < 0) {
                    deudaPorSocio[uid] = -pagoNeto;
                }
            }
        }

        const socios = Object.keys(saldoPorSocio).map(uid => ({
            userId: uid,
            aportes: [],
            deducciones: [],
            deudaArrastrada: Math.round((deudaPorSocio[uid] || 0) * 100) / 100,
            pagado: false
        }));

        const pago = new PagoSocios({
            fechaDesde,
            fechaHasta,
            liquidaciones,
            socios,
            creadoPor: req.user._id
        });

        await pago.save();
        res.status(201).json({ success: true, message: 'Pago a socios creado exitosamente', pago });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear el pago a socios' });
    }
};

// PUT /pagos-socios/:id — editar (liquidaciones incluidas, aportes/deducciones/deudaArrastrada por socio)
exports.updatePagoSocios = async (req, res) => {
    try {
        const { liquidaciones, socios } = req.body;

        const pago = await PagoSocios.findById(req.params.id);
        if (!pago) {
            return res.status(404).json({ success: false, message: 'Pago a socios no encontrado' });
        }

        if (liquidaciones) {
            const conflictos = await PagoSocios.find({
                _id: { $ne: pago._id },
                liquidaciones: { $in: liquidaciones }
            }).populate('liquidaciones', 'origen fecha');

            if (conflictos.length > 0) {
                const idsConflicto = new Set(liquidaciones.map(String));
                const detalles = [];
                for (const p of conflictos) {
                    for (const liq of p.liquidaciones) {
                        if (idsConflicto.has(liq._id.toString())) {
                            detalles.push(`${liq.origen} ${new Date(liq.fecha).toISOString().substring(0, 10)}`);
                        }
                    }
                }
                return res.status(400).json({
                    success: false,
                    message: `Las siguientes liquidaciones ya están incluidas en otro pago a socios: ${detalles.join(', ')}`
                });
            }

            pago.liquidaciones = liquidaciones;

            // fechaDesde/fechaHasta se recalculan a partir de las liquidaciones seleccionadas
            const liquidacionesDocs = await Liquidacion.find({ _id: { $in: liquidaciones } }).select('fecha');
            const fechas = liquidacionesDocs.map(l => new Date(l.fecha));
            pago.fechaDesde = new Date(Math.min(...fechas));
            pago.fechaHasta = new Date(Math.max(...fechas));

            // Agregar socios nuevos que aparezcan en las liquidaciones y todavía no estén en el pago
            const saldoPorSocio = await calcularSaldosAcumulados(liquidaciones);
            const uidsExistentes = new Set(pago.socios.map(s => s.userId.toString()));
            for (const uid of Object.keys(saldoPorSocio)) {
                if (!uidsExistentes.has(uid)) {
                    pago.socios.push({ userId: uid, aportes: [], deducciones: [], deudaArrastrada: 0, pagado: false });
                }
            }
        }

        if (Array.isArray(socios)) {
            for (const socioInput of socios) {
                const socioDoc = pago.socios.find(s => s.userId.toString() === socioInput.userId);
                if (!socioDoc) continue;
                if (socioDoc.pagado) {
                    return res.status(400).json({
                        success: false,
                        message: 'No se puede editar un socio que ya fue pagado'
                    });
                }
                if (socioInput.aportes !== undefined) socioDoc.aportes = socioInput.aportes;
                if (socioInput.deducciones !== undefined) socioDoc.deducciones = socioInput.deducciones;
                if (socioInput.deudaArrastrada !== undefined) socioDoc.deudaArrastrada = socioInput.deudaArrastrada;
            }
        }

        await pago.save();
        res.json({ success: true, message: 'Pago a socios actualizado', pago });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar el pago a socios' });
    }
};

// PUT /pagos-socios/:id/pago — registrar el pago de todo el período (una sola fecha para todos los socios pendientes)
exports.registrarPago = async (req, res) => {
    try {
        const { fechaPago, montos } = req.body; // montos: [{ userId, montoPagado }]

        if (!fechaPago || !Array.isArray(montos) || montos.length === 0) {
            return res.status(400).json({ success: false, message: 'Fecha de pago y montos por socio son requeridos' });
        }

        const pago = await PagoSocios.findById(req.params.id);
        if (!pago) {
            return res.status(404).json({ success: false, message: 'Pago a socios no encontrado' });
        }

        const montoPorSocio = {};
        montos.forEach(m => { montoPorSocio[m.userId] = m.montoPagado; });

        for (const socioDoc of pago.socios) {
            const uid = socioDoc.userId.toString();
            if (socioDoc.pagado || !(uid in montoPorSocio)) continue;
            socioDoc.pagado = true;
            // Si el pago neto es negativo, el socio queda debiendo y no se le paga nada
            socioDoc.montoPagado = Math.max(0, montoPorSocio[uid]);
        }

        pago.fechaPago = fechaPago;

        await pago.save();
        res.json({ success: true, message: 'Pago registrado', pago });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al registrar el pago' });
    }
};

// DELETE /pagos-socios/:id
exports.deletePagoSocios = async (req, res) => {
    try {
        const pago = await PagoSocios.findByIdAndDelete(req.params.id);

        if (!pago) {
            return res.status(404).json({ success: false, message: 'Pago a socios no encontrado' });
        }

        res.json({ success: true, message: 'Pago a socios eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar el pago a socios' });
    }
};

exports.calcularSaldosAcumulados = calcularSaldosAcumulados;
exports.calcularPagoNeto = calcularPagoNeto;

// GET /pagos-socios/liquidaciones-disponibles — liquidaciones no incluidas en ningún pago a socios
exports.getLiquidacionesDisponibles = async (req, res) => {
    try {
        const pagos = await PagoSocios.find().select('liquidaciones');
        const idsUsados = pagos.flatMap(p => p.liquidaciones.map(id => id.toString()));

        const liquidaciones = await Liquidacion.find({ _id: { $nin: idsUsados } })
            .sort({ fecha: -1 })
            .select('origen fecha ingresos anestesias');

        const resumen = liquidaciones.map(l => ({
            _id: l._id,
            origen: l.origen,
            fecha: l.fecha,
            montoTotalCobrado: (l.ingresos || []).reduce((sum, i) => sum + i.monto, 0),
            cantidadAnestesias: l.anestesias.length
        }));

        res.json({ success: true, liquidaciones: resumen });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener liquidaciones disponibles' });
    }
};
