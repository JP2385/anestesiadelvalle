const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorization');
const {
    getAllInstitutions,
    getInstitutionById,
    createInstitution,
    updateInstitution,
    deleteInstitution
} = require('../controllers/institutionController');

// Todas las rutas requieren autenticación y rol de admin
router.get('/', authMiddleware, requireAdmin, getAllInstitutions);
router.get('/:id', authMiddleware, requireAdmin, getInstitutionById);
router.post('/', authMiddleware, requireAdmin, createInstitution);
router.put('/:id', authMiddleware, requireAdmin, updateInstitution);
router.delete('/:id', authMiddleware, requireAdmin, deleteInstitution);

module.exports = router;
