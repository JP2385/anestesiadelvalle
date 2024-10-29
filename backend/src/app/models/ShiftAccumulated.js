// models/ShiftAccumulated.js
const mongoose = require('mongoose');

const ShiftAccumulatedSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    week: { type: Number, default: 0 },
    weekend: { type: Number, default: 0 },
    saturday: { type: Number, default: 0 }
});

module.exports = mongoose.model('ShiftAccumulated', ShiftAccumulatedSchema);
