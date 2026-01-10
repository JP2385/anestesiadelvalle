const express = require('express');
const router = express.Router();
const extraAssignmentController = require('../controllers/extraAssignmentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorization');

// Obtener asignaciones extras de una semana específica
router.get('/week/:weekStart', authMiddleware, extraAssignmentController.getExtraAssignmentsByWeek);

// Guardar/actualizar asignaciones extras de una semana
router.post('/week', authMiddleware, extraAssignmentController.saveExtraAssignments);

// Generar reporte mensual
router.get('/report/:year/:month', authMiddleware, extraAssignmentController.getMonthlyReport);

// Obtener todas las asignaciones extras (solo admin)
router.get('/all', authMiddleware, requireAdmin, extraAssignmentController.getAllExtraAssignments);

// Eliminar asignaciones extras de una semana (solo admin)
router.delete('/week/:weekStart', authMiddleware, requireAdmin, extraAssignmentController.deleteExtraAssignments);

module.exports = router;
