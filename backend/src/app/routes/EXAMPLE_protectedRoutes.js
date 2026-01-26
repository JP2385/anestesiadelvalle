/**
 * ARCHIVO DE EJEMPLO - Cómo proteger rutas con roles y permisos
 *
 * Este archivo muestra diferentes formas de proteger tus rutas existentes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth'); // Tu middleware de autenticación existente
const { requireRole, requirePermission, requireAdmin, requireOwnershipOrAdmin } = require('../middlewares/authorization');

// =====================================================
// EJEMPLO 1: Proteger por ROL
// =====================================================

// Solo ADMIN puede acceder
router.get('/admin-only-route',
    authenticate,              // Primero verifica que esté logueado
    requireAdmin,              // Luego verifica que sea admin
    (req, res) => {
        res.json({ message: 'Solo los admins ven esto' });
    }
);

// Admin O User pueden acceder
router.get('/authenticated-route',
    authenticate,
    requireRole('admin', 'user'),  // Cualquiera de estos roles puede acceder
    (req, res) => {
        res.json({ message: 'Cualquier usuario autenticado ve esto' });
    }
);

// =====================================================
// EJEMPLO 2: Proteger por PERMISO GRANULAR
// =====================================================

// Solo quien tenga permiso para CREAR usuarios
router.post('/users',
    authenticate,
    requirePermission('users', 'create'),  // Verifica permiso específico
    (req, res) => {
        // Solo admin tiene este permiso según permissions.js
        res.json({ message: 'Usuario creado' });
    }
);

// Solo quien tenga permiso para ELIMINAR horarios
router.delete('/weekly-schedule/:id',
    authenticate,
    requirePermission('weeklySchedule', 'delete'),
    (req, res) => {
        res.json({ message: 'Horario eliminado' });
    }
);

// =====================================================
// EJEMPLO 3: Proteger RECURSOS PROPIOS o ser ADMIN
// =====================================================

// Ver perfil: Solo tu propio perfil o ser admin
router.get('/users/:userId/profile',
    authenticate,
    requireOwnershipOrAdmin((req) => req.params.userId),  // Función que extrae el userId
    (req, res) => {
        // Si eres admin: puedes ver cualquier perfil
        // Si eres user: solo puedes ver tu propio perfil
        res.json({ message: 'Perfil del usuario' });
    }
);

// Actualizar vacaciones: Solo tus propias vacaciones o ser admin
router.put('/users/:userId/vacations/:vacationId',
    authenticate,
    requireOwnershipOrAdmin((req) => req.params.userId),
    (req, res) => {
        // Admin puede editar vacaciones de cualquiera
        // User solo puede editar sus propias vacaciones
        res.json({ message: 'Vacaciones actualizadas' });
    }
);

// =====================================================
// EJEMPLO 4: Combinar múltiples middlewares
// =====================================================

// Asignar guardias: Requiere ser admin Y tener permiso específico
router.post('/shift-schedule/assign',
    authenticate,
    requireAdmin,
    requirePermission('shiftSchedule', 'assign'),
    (req, res) => {
        // Doble verificación: admin + permiso específico
        res.json({ message: 'Guardias asignadas' });
    }
);

// =====================================================
// EJEMPLO 5: Lógica condicional por ROL en el controlador
// =====================================================

router.get('/vacations',
    authenticate,
    requireRole('admin', 'user'),
    async (req, res) => {
        try {
            let vacations;

            if (req.user.role === 'admin') {
                // Admin ve TODAS las vacaciones
                vacations = await Vacation.find();
            } else {
                // User solo ve SUS vacaciones
                vacations = await Vacation.find({ userId: req.user._id });
            }

            res.json({
                success: true,
                vacations,
                viewingAs: req.user.role
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

module.exports = router;
