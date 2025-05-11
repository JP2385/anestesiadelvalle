const CoverageRequest = require('../models/coverageRequestModel');

exports.createRequest = async (req, res) => {
  try {
    const {
      requestType,
      requestDate,
      requesterWorkScheme,
      substitute,
      substituteWorkScheme
    } = req.body;

    const requester = req.user._id; // 👈 usar _id, no id

    const newRequest = new CoverageRequest({
      requestType,
      requestDate,
      requester,
      requesterWorkScheme,
      substitute,
      substituteWorkScheme
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    console.error('Error al crear la solicitud:', err);
    res.status(500).json({ message: 'Error al crear la solicitud', error: err.message });
  }
};

exports.getUserRequests = async (req, res) => {
  try {
    const requests = await CoverageRequest.find({ requester: req.user._id })
      .populate('requester', 'username email')
      .populate('substitute', 'username email')
      .sort({ requestDate: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener las solicitudes', error: err.message });
  }
};
