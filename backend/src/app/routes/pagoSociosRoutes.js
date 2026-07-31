const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorization');
const {
    getAllPagosSocios,
    getPagoSociosById,
    downloadExcel,
    createPagoSocios,
    updatePagoSocios,
    registrarPago,
    deletePagoSocios,
    getLiquidacionesDisponibles
} = require('../controllers/pagoSociosController');

router.get('/liquidaciones-disponibles', authMiddleware, requireAdmin, getLiquidacionesDisponibles);

router.get('/', authMiddleware, getAllPagosSocios);
router.get('/:id/excel', authMiddleware, requireAdmin, downloadExcel);
router.get('/:id', authMiddleware, getPagoSociosById);
router.post('/', authMiddleware, requireAdmin, createPagoSocios);
router.put('/:id', authMiddleware, requireAdmin, updatePagoSocios);
router.put('/:id/pago', authMiddleware, requireAdmin, registrarPago);
router.delete('/:id', authMiddleware, requireAdmin, deletePagoSocios);

module.exports = router;
