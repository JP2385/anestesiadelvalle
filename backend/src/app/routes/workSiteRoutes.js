const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorization');
const {
    getAllWorkSites,
    getWorkSiteById,
    createWorkSite,
    updateWorkSite,
    deleteWorkSite
} = require('../controllers/workSiteController');

// Todas las rutas requieren autenticación y rol de admin
router.get('/', authMiddleware, requireAdmin, getAllWorkSites);
router.get('/:id', authMiddleware, requireAdmin, getWorkSiteById);
router.post('/', authMiddleware, requireAdmin, createWorkSite);
router.put('/:id', authMiddleware, requireAdmin, updateWorkSite);
router.delete('/:id', authMiddleware, requireAdmin, deleteWorkSite);

module.exports = router;
