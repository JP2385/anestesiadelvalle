const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getDashboardIndividual, getDashboardGrupal } = require('../controllers/dashboardController');

router.get('/individual', authMiddleware, getDashboardIndividual);
router.get('/grupal', authMiddleware, getDashboardGrupal);

module.exports = router;
