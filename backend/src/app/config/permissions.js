/**
 * Sistema de Permisos por Rol
 *
 * Define qué acciones puede realizar cada rol en el sistema
 */

const PERMISSIONS = {
    // Rol: Administrador - Acceso total al sistema
    admin: {
        // Gestión de usuarios
        users: {
            create: true,
            read: true,
            update: true,
            delete: true,
            changeRole: true,      // Solo admin puede cambiar roles
            viewAll: true          // Ver todos los usuarios
        },

        // Gestión de programación semanal
        weeklySchedule: {
            create: true,
            read: true,
            update: true,
            delete: true,
            print: true,
            assign: true           // Auto-asignar anestesiólogos
        },

        // Gestión de guardias (shift schedule)
        shiftSchedule: {
            create: true,
            read: true,
            update: true,
            delete: true,
            assign: true,          // Auto-asignar guardias
            print: true
        },

        // Gestión de feriados
        holidays: {
            create: true,
            read: true,
            update: true,
            delete: true,
            assign: true           // Asignar guardias en feriados
        },

        // Gestión de vacaciones
        vacations: {
            create: true,
            read: true,
            update: true,
            delete: true,
            viewAll: true          // Ver vacaciones de todos
        },

        // Gestión de licencias (other leaves)
        otherLeaves: {
            create: true,
            read: true,
            update: true,
            delete: true,
            viewAll: true          // Ver licencias de todos
        },

        // Configuración del sistema
        settings: {
            read: true,
            update: true
        },

        // Reportes y estadísticas
        reports: {
            view: true,
            export: true
        }
    },

    // Rol: Usuario regular - Acceso limitado
    user: {
        // Gestión de usuarios
        users: {
            create: false,
            read: true,            // Solo puede ver su propio perfil
            update: true,          // Solo puede actualizar su propio perfil
            delete: false,
            changeRole: false,
            viewAll: false         // NO puede ver lista de todos los usuarios
        },

        // Gestión de programación semanal
        weeklySchedule: {
            create: false,
            read: true,            // Solo puede ver programaciones
            update: false,
            delete: false,
            print: false,
            assign: false
        },

        // Gestión de guardias
        shiftSchedule: {
            create: false,
            read: true,            // Solo puede ver SUS propias guardias
            update: false,
            delete: false,
            assign: false,
            print: false
        },

        // Gestión de feriados
        holidays: {
            create: false,
            read: true,            // Solo puede ver asignaciones de feriados
            update: false,
            delete: false,
            assign: false
        },

        // Gestión de vacaciones
        vacations: {
            create: true,          // Puede cargar SUS vacaciones
            read: true,            // Puede ver SUS vacaciones
            update: true,          // Puede modificar SUS vacaciones
            delete: true,          // Puede eliminar SUS vacaciones
            viewAll: false         // NO puede ver vacaciones de otros
        },

        // Gestión de licencias
        otherLeaves: {
            create: true,          // Puede cargar SUS licencias
            read: true,            // Puede ver SUS licencias
            update: true,          // Puede modificar SUS licencias
            delete: true,          // Puede eliminar SUS licencias
            viewAll: false         // NO puede ver licencias de otros
        },

        // Configuración del sistema
        settings: {
            read: false,
            update: false
        },

        // Reportes y estadísticas
        reports: {
            view: false,           // NO puede ver reportes generales
            export: false
        }
    }
};

/**
 * Verifica si un rol tiene un permiso específico
 * @param {string} role - El rol del usuario ('admin' o 'user')
 * @param {string} resource - El recurso (ej: 'users', 'weeklySchedule')
 * @param {string} action - La acción (ej: 'create', 'read', 'update', 'delete')
 * @returns {boolean} - true si tiene permiso, false si no
 */
function hasPermission(role, resource, action) {
    if (!PERMISSIONS[role]) {
        return false; // Rol inválido
    }

    if (!PERMISSIONS[role][resource]) {
        return false; // Recurso no encontrado para este rol
    }

    return PERMISSIONS[role][resource][action] === true;
}

/**
 * Obtiene todos los permisos de un rol
 * @param {string} role - El rol del usuario
 * @returns {object} - Objeto con todos los permisos del rol
 */
function getRolePermissions(role) {
    return PERMISSIONS[role] || {};
}

module.exports = {
    PERMISSIONS,
    hasPermission,
    getRolePermissions
};
