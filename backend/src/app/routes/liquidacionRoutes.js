const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorization');
const {
    getAllLiquidaciones,
    getLiquidacionById,
    createLiquidacion,
    updateLiquidacion,
    deleteLiquidacion,
    downloadPlantilla,
    importarCSV
} = require('../controllers/liquidacionController');

router.get('/plantilla', authMiddleware, requireAdmin, downloadPlantilla);
router.post('/importar', authMiddleware, requireAdmin, express.text({ limit: '5mb' }), importarCSV);

router.get('/', authMiddleware, getAllLiquidaciones);
router.get('/:id', authMiddleware, getLiquidacionById);
router.post('/', authMiddleware, requireAdmin, createLiquidacion);
router.put('/:id', authMiddleware, requireAdmin, updateLiquidacion);
router.delete('/:id', authMiddleware, requireAdmin, deleteLiquidacion);

module.exports = router;
