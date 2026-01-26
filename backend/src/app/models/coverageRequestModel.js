const mongoose = require('mongoose');

const coverageRequestSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ['intercambio', 'cobertura'],
    required: true
  },
  requestDate: {
    type: Date,
    required: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterWorkScheme: {
    type: String,
    required: true
  },
  substitute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  substituteWorkScheme: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pendiente', 'aceptado', 'rechazado', 'cancelado'],
    default: 'pendiente'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CoverageRequest', coverageRequestSchema);
