require('dotenv').config({ path: './backend/.env' });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');
const mongoose = require('mongoose');
const config = require('./backend/config');
const Liquidacion = require('./backend/src/app/models/liquidacionModel');
const GroupPeriod = require('./backend/src/app/models/groupPeriodModel');
const PagoSocios = require('./backend/src/app/models/pagoSociosModel');
const { calcularDistribucion } = require('./backend/src/app/controllers/liquidacionController');

function money(v) {
    return (v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

(async () => {
    await mongoose.connect(config.mongoUri);

    // El pago del 24/07 al 24/07, con montoPagado real ~$3.848.979,32
    const pago = await PagoSocios.findOne({
        fechaDesde: { $gte: new Date('2026-07-24T00:00:00Z'), $lt: new Date('2026-07-25T00:00:00Z') },
        fechaHasta: { $gte: new Date('2026-07-24T00:00:00Z'), $lt: new Date('2026-07-25T00:00:00Z') }
    }).populate('liquidaciones').populate('socios.userId', 'username');

    if (!pago) {
        console.log('No se encontró el PagoSocios del 24/07');
        process.exit(0);
    }

    console.log('PagoSocios encontrado:', pago._id);
    console.log('Liquidaciones incluidas:', pago.liquidaciones.map(l => `${l._id} [${l.origen}] ${new Date(l.fecha).toISOString().substring(0,10)}`));
    console.log('Cantidad de anestesias en cada liquidación:', pago.liquidaciones.map(l => l.anestesias.length));

    // Encontrar el socio con montoPagado ~3.848.979,32
    const socioBuscado = pago.socios.find(s => Math.abs((s.montoPagado || 0) - 3848979.32) < 1);
    if (!socioBuscado) {
        console.log('No se encontró el socio con ese montoPagado exacto, listando todos:');
        pago.socios.forEach(s => console.log(`  ${s.userId.username}: montoPagado=${money(s.montoPagado)} pagado=${s.pagado}`));
        await mongoose.disconnect();
        return;
    }

    const uid = socioBuscado.userId._id.toString();
    console.log('\nSocio analizado:', socioBuscado.userId.username, uid);

    const groupPeriods = await GroupPeriod.find().sort({ fechaInicio: 1 }).populate('participaciones.userId', 'username');

    for (const liq of pago.liquidaciones) {
        const liqPopulada = await Liquidacion.findById(liq._id)
            .populate('deduccionesPersonales.userId', 'username')
            .populate('ingresos.userId', 'username');
        const r = calcularDistribucion(liqPopulada.toObject(), groupPeriods);
        const propio = r.distribucion.find(d => d.userId === uid);
        console.log(`\nLiquidación ${liq._id} [${liq.origen}] ${new Date(liq.fecha).toISOString().substring(0,10)}:`);
        console.log('  cantidad anestesias:', liq.anestesias.length);
        console.log('  cantidad en distribucion[] total:', r.distribucion.length);
        console.log('  socio aparece en distribucion?', !!propio);
        if (propio) console.log('  datos del socio:', propio);

        // Verificar si el socio está en las participaciones del GroupPeriod vigente
        const period = groupPeriods.filter(gp => new Date(gp.fechaInicio) <= new Date(liq.fecha)).pop();
        if (period) {
            const estaEnParticipaciones = period.participaciones.some(p => (p.userId?._id || p.userId).toString() === uid);
            console.log('  GroupPeriod vigente:', period._id, period.motivo, '- socio en participaciones?', estaEnParticipaciones);
        } else {
            console.log('  No hay GroupPeriod vigente para esta fecha');
        }
    }

    await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });
