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
    importarCSV,
    generarAutomatico,
    estadoGeneracionAutomatica
} = require('../controllers/liquidacionController');

router.get('/plantilla', authMiddleware, requireAdmin, downloadPlantilla);
router.post('/importar', authMiddleware, requireAdmin, express.text({ limit: '5mb' }), importarCSV);

// Generación automática (scrapea saludng + evweb vía microservicio y guarda todo)
router.post('/auto', authMiddleware, requireAdmin, generarAutomatico);
router.get('/auto/:jobId', authMiddleware, requireAdmin, estadoGeneracionAutomatica);

router.get('/', authMiddleware, getAllLiquidaciones);
router.get('/:id', authMiddleware, getLiquidacionById);
router.post('/', authMiddleware, requireAdmin, createLiquidacion);
router.put('/:id', authMiddleware, requireAdmin, updateLiquidacion);
router.delete('/:id', authMiddleware, requireAdmin, deleteLiquidacion);

module.exports = router;
