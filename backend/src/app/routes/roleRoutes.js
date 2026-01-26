const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin, requireRole } = require('../middlewares/authorization');
const {
    changeUserRole,
    getUsersWithRoles,
    getRolePermissionsEndpoint,
    getMyPermissions
} = require('../controllers/roleController');

// Cambiar el rol de un usuario (solo admin)
router.put('/users/:userId/role',
    authMiddleware,
    requireAdmin,
    changeUserRole
);

// Obtener lista de usuarios con roles (solo admin)
router.get('/users/roles',
    authMiddleware,
    requireAdmin,
    getUsersWithRoles
);

// Obtener permisos de un rol específico (solo admin)
router.get('/roles/:role/permissions',
    authMiddleware,
    requireAdmin,
    getRolePermissionsEndpoint
);

// Obtener MIS permisos (cualquier usuario autenticado)
router.get('/my-permissions',
    authMiddleware,
    requireRole('admin', 'user'),
    getMyPermissions
);

module.exports = router;
