const express = require('express');
const router = express.Router();
const coverageRequestController = require('../controllers/coverageRequestController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, coverageRequestController.createRequest);
router.get('/', authMiddleware, coverageRequestController.getUserRequests);

module.exports = router;
