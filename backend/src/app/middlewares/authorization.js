const { hasPermission } = require('../config/permissions');

/**
 * Middleware para verificar si el usuario tiene un rol específico
 * @param {...string} allowedRoles - Roles permitidos ('admin', 'user')
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        // Verificar que el usuario esté autenticado
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado. Por favor inicia sesión.'
            });
        }

        // Verificar que el usuario tenga uno de los roles permitidos
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para realizar esta acción.',
                requiredRole: allowedRoles,
                yourRole: req.user.role
            });
        }

        next();
    };
}

/**
 * Middleware para verificar permisos granulares
 * @param {string} resource - El recurso (ej: 'users', 'weeklySchedule')
 * @param {string} action - La acción (ej: 'create', 'read', 'update', 'delete')
 */
function requirePermission(resource, action) {
    return (req, res, next) => {
        // Verificar que el usuario esté autenticado
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado. Por favor inicia sesión.'
            });
        }

        // Verificar que el usuario tenga el permiso específico
        const userRole = req.user.role;
        const hasAccess = hasPermission(userRole, resource, action);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: `No tienes permiso para ${action} en ${resource}.`,
                resource,
                action,
                role: userRole
            });
        }

        next();
    };
}

/**
 * Middleware para verificar que el usuario solo acceda a sus propios recursos
 * O sea administrador (que puede acceder a todo)
 */
function requireOwnershipOrAdmin(getUserIdFromRequest) {
    return (req, res, next) => {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado.'
            });
        }

        // Si es admin, permitir acceso
        if (req.user.role === 'admin') {
            return next();
        }

        // Obtener el ID del recurso que se está intentando acceder
        const resourceUserId = getUserIdFromRequest(req);

        // Verificar que el usuario sea dueño del recurso
        if (req.user._id.toString() !== resourceUserId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes acceder a tus propios recursos.'
            });
        }

        next();
    };
}

/**
 * Middleware para verificar que solo el admin pueda hacer algo
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'No autenticado.'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Esta acción requiere privilegios de administrador.'
        });
    }

    next();
}

module.exports = {
    requireRole,
    requirePermission,
    requireOwnershipOrAdmin,
    requireAdmin
};
