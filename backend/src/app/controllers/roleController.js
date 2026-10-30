const User = require('../models/userModel');
const { getRolePermissions } = require('../config/permissions');

/**
 * Cambiar el rol de un usuario (solo admin puede hacer esto)
 */
const changeUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { newRole } = req.body;

        // Validar que el nuevo rol sea válido
        if (!['admin', 'user'].includes(newRole)) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido. Debe ser "admin" o "user".'
            });
        }

        // No permitir que un usuario se quite a sí mismo el rol de admin
        if (req.user._id.toString() === userId && req.user.role === 'admin' && newRole !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'No puedes quitarte el rol de administrador a ti mismo.'
            });
        }

        // Buscar y actualizar el usuario
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }

        const oldRole = user.role;
        user.role = newRole;
        await user.save();

        res.json({
            success: true,
            message: `Rol de ${user.username} cambiado de ${oldRole} a ${newRole}.`,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error cambiando rol:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el rol del usuario.',
            error: error.message
        });
    }
};

/**
 * Dar de baja o reactivar un usuario (solo admin).
 *
 * Es una baja lógica: no se borra el documento porque los históricos
 * (liquidaciones, pagos a socios, group periods) referencian su _id.
 * El usuario deja de poder entrar y desaparece del padrón, pero sus
 * registros pasados se siguen resolviendo.
 */
const setUserActivo = async (req, res) => {
    try {
        const { userId } = req.params;
        const { activo } = req.body;

        if (typeof activo !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'El campo "activo" es requerido y debe ser true o false.'
            });
        }

        // Evitar que un admin se deje a sí mismo afuera de la app.
        if (req.user._id.toString() === userId && activo === false) {
            return res.status(400).json({
                success: false,
                message: 'No puedes darte de baja a ti mismo.'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }

        user.activo = activo;
        user.fechaBaja = activo ? null : new Date();
        await user.save();

        res.json({
            success: true,
            message: activo
                ? `${user.username} fue reactivado.`
                : `${user.username} fue dado de baja.`,
            user: {
                _id: user._id,
                username: user.username,
                activo: user.activo,
                fechaBaja: user.fechaBaja
            }
        });

    } catch (error) {
        console.error('Error cambiando estado del usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado del usuario.',
            error: error.message
        });
    }
};

/**
 * Obtener lista de todos los usuarios con sus roles (solo admin)
 */
const getUsersWithRoles = async (req, res) => {
    try {
        const users = await User.find()
            .select('username email role isVerified activo fechaBaja createdAt')
            .sort({ username: 1 });

        res.json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener lista de usuarios.',
            error: error.message
        });
    }
};

/**
 * Obtener permisos de un rol específico
 */
const getRolePermissionsEndpoint = async (req, res) => {
    try {
        const { role } = req.params;

        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido.'
            });
        }

        const permissions = getRolePermissions(role);

        res.json({
            success: true,
            role,
            permissions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Obtener permisos del usuario actual
 */
const getMyPermissions = async (req, res) => {
    try {
        const permissions = getRolePermissions(req.user.role);

        res.json({
            success: true,
            role: req.user.role,
            username: req.user.username,
            permissions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    changeUserRole,
    setUserActivo,
    getUsersWithRoles,
    getRolePermissionsEndpoint,
    getMyPermissions
};
