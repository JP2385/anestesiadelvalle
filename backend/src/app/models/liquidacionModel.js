const mongoose = require('mongoose');

const anestesiaSchema = new mongoose.Schema({
    paciente: { type: String, trim: true },
    fechaPractica: { type: Date, required: true },
    obraSocial: { type: String, trim: true },
    lugarPractica: { type: String, trim: true },
    montoFacturado: { type: Number, required: true, min: 0 },
    iva: { type: Number, default: 0, min: 0 },
    // Socio que facturó la anestesia. null = anestesia del pozo del grupo
    // (distribución grupal) o histórica, cargada antes de que existiera el
    // campo. Se usa para excluir el trabajo previo al ingreso de un socio
    // nuevo: sin atribución no se puede distinguir una anestesia del 15/8 de
    // JBO (previa a su ingreso) de la de un socio histórico (del grupo).
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
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

// Detalle del ajuste por ingreso/egreso al grupo, para que quede visible en la
// UI qué socio se prorrateó y con qué proporción.
const prorrateoSocioSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, trim: true },
    ingreso: { type: Date, default: null },
    egreso: { type: Date, default: null },
    proporcion: { type: Number, required: true },
    anestesiasTotales: { type: Number, default: 0 },
    anestesiasExcluidas: { type: Number, default: 0 },
    montoTotal: { type: Number, default: 0 },
    montoExcluido: { type: Number, default: 0 }
}, { _id: false });

const prorrateoSchema = new mongoose.Schema({
    socios: { type: [prorrateoSocioSchema], default: [] },
    anestesiasExcluidas: { type: Number, default: 0 },
    montoExcluido: { type: Number, default: 0 },
    factorDeduccionesGrupales: { type: Number, default: 1 },
    warnings: { type: [String], default: [] },
    aplicadoEn: { type: Date, default: Date.now }
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
    // null = no hubo socios con participación parcial en este período
    prorrateo: { type: prorrateoSchema, default: null },
    creadoEn: { type: Date, default: Date.now },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Liquidacion', liquidacionSchema);
