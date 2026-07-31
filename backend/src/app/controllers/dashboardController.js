const Liquidacion = require('../models/liquidacionModel');
const GroupPeriod = require('../models/groupPeriodModel');
const PagoSocios = require('../models/pagoSociosModel');
const { calcularDistribucion } = require('./liquidacionController');
const { calcularSaldosAcumulados, calcularPagoNeto } = require('./pagoSociosController');

// GET /dashboard/individual — situación financiera propia del socio logueado.
// Solo expone datos del propio req.user._id; nunca incluye parteNeta/saldo de otros socios.
exports.getDashboardIndividual = async (req, res) => {
    try {
        const uid = req.user._id.toString();

        const liquidaciones = await Liquidacion.find()
            .sort({ fecha: -1 })
            .populate('deduccionesPersonales.userId', 'username')
            .populate('ingresos.userId', 'username');

        const groupPeriods = await GroupPeriod.find()
            .sort({ fechaInicio: 1 })
            .populate('participaciones.userId', 'username');

        const historial = [];
        for (const liquidacion of liquidaciones) {
            const { distribucion } = calcularDistribucion(liquidacion.toObject(), groupPeriods);
            const propio = distribucion.find(s => s.userId === uid);
            if (!propio) continue;
            historial.push({
                liquidacionId: liquidacion._id,
                origen: liquidacion.origen,
                fecha: liquidacion.fecha,
                parteSocietaria: propio.parteSocietaria,
                parteNeta: propio.parteNeta,
                ingresadoEnCuenta: propio.ingresadoEnCuenta,
                saldo: propio.saldo
            });
        }

        // Saldo flotante: liquidaciones aún no incluidas en ningún Pago a Socios.
        // idsUsados se calcula sobre TODOS los pagos (no solo los recientes) para no contar como
        // "flotante" una liquidación vieja que ya fue incluida en un PagoSocios fuera del límite.
        const todosLosPagosIds = await PagoSocios.find().select('liquidaciones');
        const idsUsados = new Set(todosLosPagosIds.flatMap(p => p.liquidaciones.map(l => l.toString())));
        const saldoTotalHistorico = historial
            .filter(h => !idsUsados.has(h.liquidacionId.toString()))
            .reduce((sum, h) => sum + h.saldo, 0);

        // Historial de pagos: se limita a los últimos LIMITE_PAGOS para no procesar/mostrar un
        // histórico que crece indefinidamente año tras año.
        const LIMITE_PAGOS = 24;
        const pagos = await PagoSocios.find()
            .sort({ fechaHasta: -1 })
            .limit(LIMITE_PAGOS)
            .populate('liquidaciones', 'origen fecha')
            .populate('socios.userId', 'username');

        // Historial de pagos donde el socio participa — mismo desglose que el informe individual en Excel:
        // le correspondía cobrar, ya ingresado por otras vías, descontado (con concepto), depositado, deuda.
        const historialPagos = [];
        for (const pago of pagos) {
            const socioDoc = pago.socios.find(s => s.userId._id.toString() === uid);
            if (!socioDoc) continue;

            // "Le correspondía cobrar" se basa en parteSocietaria (participación en la sociedad,
            // sin ajustes personales) y NO en parteNeta, para que dos socios con el mismo % de
            // participación muestren el mismo número acá aunque uno tenga muchas deducciones
            // personales y otro no — esas deducciones son una circunstancia individual, no un
            // reflejo de cuánto le corresponde por ser socio.
            let correspondiaCobrar = 0;
            let yaIngresadoOtrasVias = 0;
            let netoDeduccionesPersonales = 0; // parteSocietaria - parteNeta: efecto neto de sus descuentos/redistribución personales
            const liquidacionesDelPago = [];
            for (const liq of pago.liquidaciones) {
                const liqId = liq._id || liq; // populate('liquidaciones', ...) devuelve documentos, no solo ObjectIds
                const h = historial.find(hh => hh.liquidacionId.toString() === liqId.toString());
                if (!h) continue;
                correspondiaCobrar += h.parteSocietaria;
                yaIngresadoOtrasVias += h.ingresadoEnCuenta;
                netoDeduccionesPersonales += h.parteSocietaria - h.parteNeta;
                liquidacionesDelPago.push({
                    liquidacionId: h.liquidacionId,
                    origen: h.origen,
                    fecha: h.fecha,
                    parteSocietaria: h.parteSocietaria,
                    parteNeta: h.parteNeta,
                    ingresadoEnCuenta: h.ingresadoEnCuenta,
                    saldo: h.saldo
                });
            }
            liquidacionesDelPago.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            const saldoPorSocio = await calcularSaldosAcumulados(pago.liquidaciones.map(l => l._id));
            const saldoAcumulado = saldoPorSocio[uid]?.saldo || 0;
            const { pagoNeto } = calcularPagoNeto(saldoAcumulado, socioDoc);

            const aportes = (socioDoc.aportes || []).map(a => ({ concepto: a.concepto, monto: a.monto }));
            const deducciones = (socioDoc.deducciones || []).map(d => ({ concepto: d.concepto, monto: d.monto }));
            if (socioDoc.deudaArrastrada > 0) {
                deducciones.push({ concepto: 'Deuda de período anterior', monto: socioDoc.deudaArrastrada });
            }

            historialPagos.push({
                pagoSociosId: pago._id,
                fechaDesde: pago.fechaDesde,
                fechaHasta: pago.fechaHasta,
                fechaPago: pago.fechaPago,
                correspondiaCobrar: Math.round(correspondiaCobrar * 100) / 100,
                yaIngresadoOtrasVias: Math.round(yaIngresadoOtrasVias * 100) / 100,
                netoDeduccionesPersonales: Math.round(netoDeduccionesPersonales * 100) / 100,
                liquidaciones: liquidacionesDelPago,
                aportes,
                deducciones,
                pagoNeto: Math.round(pagoNeto * 100) / 100,
                pagado: socioDoc.pagado,
                montoPagado: socioDoc.montoPagado,
                deudaArrastrada: socioDoc.deudaArrastrada || 0,
                deudaActual: pagoNeto < 0 ? Math.round(Math.abs(pagoNeto) * 100) / 100 : 0
            });
        }

        historialPagos.sort((a, b) => new Date(b.fechaHasta) - new Date(a.fechaHasta));

        const proximoPago = historialPagos.find(p => !p.pagado) || null;
        const deudaActual = proximoPago && proximoPago.pagoNeto < 0 ? Math.abs(proximoPago.pagoNeto) : 0;

        // Evolución mensual por provincia: suma de parteSocietaria (participación, sin ajustes
        // personales) agrupada por mes calendario de la fecha de cada liquidación.
        const porMes = {}; // 'YYYY-MM' -> { periodo, neuquen, rioNegro }
        for (const h of historial) {
            const mes = new Date(h.fecha).toISOString().substring(0, 7);
            if (!porMes[mes]) porMes[mes] = { periodo: mes, neuquen: 0, rioNegro: 0 };
            if (h.origen === 'Neuquén') porMes[mes].neuquen += h.parteSocietaria;
            else if (h.origen === 'Río Negro') porMes[mes].rioNegro += h.parteSocietaria;
        }
        const evolucionMensual = Object.values(porMes)
            .sort((a, b) => a.periodo.localeCompare(b.periodo))
            .map(m => ({
                periodo: m.periodo,
                neuquen: Math.round(m.neuquen * 100) / 100,
                rioNegro: Math.round(m.rioNegro * 100) / 100,
                total: Math.round((m.neuquen + m.rioNegro) * 100) / 100
            }));

        res.json({
            success: true,
            socio: { userId: uid, username: req.user.username },
            saldoTotalHistorico: Math.round(saldoTotalHistorico * 100) / 100,
            proximoPago,
            deudaActual,
            historial,
            historialPagos,
            evolucionMensual
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener el dashboard individual' });
    }
};

// GET /dashboard/grupal — evolución mensual por provincia (mismo informe que ya se le mandaba
// a los socios): "correspondía cobrar" (suma de parteSocietaria de todos los socios — participación
// societaria pura, SIN restar deducciones personales de nadie, para no reducir artificialmente
// el total grupal por circunstancias individuales) y "facturado" (montoBruto, suma cruda de
// anestesias sin descontar nada).
exports.getDashboardGrupal = async (req, res) => {
    try {
        const { anio } = req.query;
        const query = anio
            ? { fecha: { $gte: new Date(`${anio}-01-01`), $lte: new Date(`${anio}-12-31T23:59:59.999Z`) } }
            : {};

        const todasLasFechas = await Liquidacion.find().select('fecha');
        const aniosDisponibles = [...new Set(todasLasFechas.map(l => new Date(l.fecha).getFullYear()))].sort((a, b) => b - a);

        const liquidaciones = await Liquidacion.find(query)
            .sort({ fecha: 1 })
            .populate('deduccionesPersonales.userId', 'username')
            .populate('ingresos.userId', 'username');

        const groupPeriods = await GroupPeriod.find()
            .sort({ fechaInicio: 1 })
            .populate('participaciones.userId', 'username');

        const porMes = {}; // 'YYYY-MM' -> { periodo, neuquen, rioNegro, neuquenBruto, rioNegroBruto }

        for (const liquidacion of liquidaciones) {
            const resultado = calcularDistribucion(liquidacion.toObject(), groupPeriods);
            const totalParteSocietaria = resultado.distribucion.reduce((s, d) => s + d.parteSocietaria, 0);

            const mes = new Date(liquidacion.fecha).toISOString().substring(0, 7);
            if (!porMes[mes]) porMes[mes] = { periodo: mes, neuquen: 0, rioNegro: 0, neuquenBruto: 0, rioNegroBruto: 0 };
            if (liquidacion.origen === 'Neuquén') {
                porMes[mes].neuquen += totalParteSocietaria;
                porMes[mes].neuquenBruto += resultado.montoBruto;
            } else if (liquidacion.origen === 'Río Negro') {
                porMes[mes].rioNegro += totalParteSocietaria;
                porMes[mes].rioNegroBruto += resultado.montoBruto;
            }
        }

        const meses = Object.values(porMes).sort((a, b) => a.periodo.localeCompare(b.periodo));

        const evolucionMensual = meses.map(m => ({
            periodo: m.periodo,
            neuquen: Math.round(m.neuquen * 100) / 100,
            rioNegro: Math.round(m.rioNegro * 100) / 100,
            total: Math.round((m.neuquen + m.rioNegro) * 100) / 100
        }));

        const evolucionFacturado = meses.map(m => ({
            periodo: m.periodo,
            neuquen: Math.round(m.neuquenBruto * 100) / 100,
            rioNegro: Math.round(m.rioNegroBruto * 100) / 100,
            total: Math.round((m.neuquenBruto + m.rioNegroBruto) * 100) / 100
        }));

        res.json({ success: true, evolucionMensual, evolucionFacturado, aniosDisponibles });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener el dashboard grupal' });
    }
};
