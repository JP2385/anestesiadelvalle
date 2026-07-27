const mongoose = require('mongoose');

const aporteSchema = new mongoose.Schema({
    concepto: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 0 }
}, { _id: false });

const deduccionExtraSchema = new mongoose.Schema({
    concepto: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 0 }
}, { _id: false });

const socioPagoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    aportes: { type: [aporteSchema], default: [] },
    deducciones: { type: [deduccionExtraSchema], default: [] },
    deudaArrastrada: { type: Number, default: 0 },
    pagado: { type: Boolean, default: false },
    montoPagado: { type: Number, default: null }
}, { _id: false });

const pagoSociosSchema = new mongoose.Schema({
    fechaDesde: { type: Date, required: true },
    fechaHasta: { type: Date, required: true },
    liquidaciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Liquidacion' }],
    socios: { type: [socioPagoSchema], default: [] },
    fechaPago: { type: Date, default: null },
    creadoEn: { type: Date, default: Date.now },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('PagoSocios', pagoSociosSchema);
