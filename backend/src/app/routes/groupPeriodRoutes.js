const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorization');
const {
    getAllPeriods,
    createPeriod,
    deletePeriod
} = require('../controllers/groupPeriodController');

router.get('/', authMiddleware, getAllPeriods);
router.post('/', authMiddleware, requireAdmin, createPeriod);
router.delete('/:id', authMiddleware, requireAdmin, deletePeriod);

module.exports = router;
