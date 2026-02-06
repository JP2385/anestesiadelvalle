/**
 * Utilidades de Autenticación y Autorización para el Frontend
 */

import toast from './toast.js';

const apiUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://adelvalle-88dd0d34d7bd.herokuapp.com';

// Cache de permisos del usuario
let userPermissions = null;
let userRole = null;

/**
 * Obtener permisos del usuario actual desde el backend
 */
async function fetchUserPermissions() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (!token) {
            console.warn('No hay token de autenticación');
            return null;
        }

        const response = await fetch(`${apiUrl}/my-permissions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            userPermissions = data.permissions;
            userRole = data.role;
            return data;
        } else {
            console.error('Error obteniendo permisos:', response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return null;
    }
}

/**
 * Verificar si el usuario tiene un permiso específico
 * @param {string} resource - El recurso (ej: 'users', 'weeklySchedule')
 * @param {string} action - La acción (ej: 'create', 'read', 'update', 'delete')
 * @returns {boolean}
 */
function hasPermission(resource, action) {
    if (!userPermissions) {
        console.warn('Permisos no cargados. Llama a fetchUserPermissions() primero.');
        return false;
    }

    if (!userPermissions[resource]) {
        return false;
    }

    return userPermissions[resource][action] === true;
}

/**
 * Verificar si el usuario tiene un rol específico
 * @param {...string} allowedRoles - Roles permitidos
 * @returns {boolean}
 */
function hasRole(...allowedRoles) {
    if (!userRole) {
        console.warn('Rol no cargado. Llama a fetchUserPermissions() primero.');
        return false;
    }

    return allowedRoles.includes(userRole);
}

/**
 * Verificar si el usuario es admin
 * @returns {boolean}
 */
function isAdmin() {
    return userRole === 'admin';
}

/**
 * Verificar si el usuario es un usuario regular
 * @returns {boolean}
 */
function isUser() {
    return userRole === 'user';
}

/**
 * Mostrar/ocultar elementos del DOM según permisos
 * @param {string} selector - Selector CSS del elemento
 * @param {string} resource - Recurso a verificar
 * @param {string} action - Acción a verificar
 */
function showIfHasPermission(selector, resource, action) {
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
        if (hasPermission(resource, action)) {
            element.style.display = ''; // Mostrar
        } else {
            element.style.display = 'none'; // Ocultar
        }
    });
}

/**
 * Mostrar/ocultar elementos del DOM según rol
 * @param {string} selector - Selector CSS del elemento
 * @param {...string} allowedRoles - Roles permitidos
 */
function showIfHasRole(selector, ...allowedRoles) {
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
        if (hasRole(...allowedRoles)) {
            element.style.display = ''; // Mostrar
        } else {
            element.style.display = 'none'; // Ocultar
        }
    });
}

/**
 * Deshabilitar elementos del DOM si no tiene permiso
 * @param {string} selector - Selector CSS del elemento
 * @param {string} resource - Recurso a verificar
 * @param {string} action - Acción a verificar
 */
function disableIfNoPermission(selector, resource, action) {
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
        if (!hasPermission(resource, action)) {
            element.disabled = true;
            element.title = 'No tienes permisos para realizar esta acción';
            element.style.cursor = 'not-allowed';
            element.style.opacity = '0.5';
        }
    });
}

/**
 * Redirigir si no tiene permiso
 * @param {string} resource
 * @param {string} action
 * @param {string} redirectUrl - URL a donde redirigir
 */
function redirectIfNoPermission(resource, action, redirectUrl = '/index.html') {
    if (!hasPermission(resource, action)) {
        toast.error('No tienes permisos para acceder a esta página.');
        setTimeout(() => window.location.href = redirectUrl, 1500);
    }
}

/**
 * Redirigir si no tiene rol
 * @param {string} redirectUrl
 * @param {...string} allowedRoles
 */
function redirectIfNoRole(redirectUrl = '/index.html', ...allowedRoles) {
    if (!hasRole(...allowedRoles)) {
        toast.error('No tienes permisos para acceder a esta página.');
        setTimeout(() => window.location.href = redirectUrl, 1500);
    }
}

/**
 * Agregar badge de rol al usuario en el header
 */
function addRoleBadge() {
    const header = document.querySelector('header h1');

    // Solo mostrar badge si el usuario es admin
    if (header && userRole === 'admin') {
        const badge = document.createElement('span');
        badge.style.cssText = `
            margin-left: 10px;
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 4px;
            background-color: #dc3545;
            color: white;
            font-weight: bold;
        `;
        badge.textContent = 'ADMIN';
        header.appendChild(badge);
    }
}

/**
 * Inicializar sistema de permisos en una página
 * Debe llamarse en DOMContentLoaded
 */
async function initializePermissions() {
    try {
        await fetchUserPermissions();
        addRoleBadge();
        console.log('✓ Sistema de permisos inicializado', { role: userRole });
    } catch (error) {
        console.error('Error inicializando permisos:', error);
    }
}

// Exportar funciones
export {
    fetchUserPermissions,
    hasPermission,
    hasRole,
    isAdmin,
    isUser,
    showIfHasPermission,
    showIfHasRole,
    disableIfNoPermission,
    redirectIfNoPermission,
    redirectIfNoRole,
    addRoleBadge,
    initializePermissions
};
