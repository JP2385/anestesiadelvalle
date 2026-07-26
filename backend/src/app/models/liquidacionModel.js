const mongoose = require('mongoose');

const anestesiaSchema = new mongoose.Schema({
    paciente: { type: String, trim: true },
    fechaPractica: { type: Date, required: true },
    obraSocial: { type: String, trim: true },
    lugarPractica: { type: String, trim: true },
    montoFacturado: { type: Number, required: true, min: 0 },
    iva: { type: Number, default: 0, min: 0 }
}, { _id: false });

const deduccionGrupalSchema = new mongoose.Schema({
    concepto: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 0 }
}, { _id: false });

const deduccionPersonalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    concepto: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 0 }
}, { _id: false });

const ingresoSchema = new mongoose.Schema({
    tipo: { type: String, enum: ['empresa', 'socio'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    monto: { type: Number, required: true, min: 0 }
}, { _id: false });

const liquidacionSchema = new mongoose.Schema({
    origen: { type: String, enum: ['Neuquén', 'Río Negro'], required: true },
    fecha: { type: Date, required: true },
    anestesias: { type: [anestesiaSchema], default: [] },
    ingresos: { type: [ingresoSchema], default: [] },
    deduccionesGrupales: { type: [deduccionGrupalSchema], default: [] },
    deduccionesPersonales: { type: [deduccionPersonalSchema], default: [] },
    reservaGanancias: { type: Boolean, default: false },
    dedPersonalesInternas: { type: Boolean, default: true },
    creadoEn: { type: Date, default: Date.now },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Liquidacion', liquidacionSchema);
