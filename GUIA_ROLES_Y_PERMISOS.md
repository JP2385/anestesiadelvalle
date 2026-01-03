# 🔐 Sistema de Roles y Permisos - Guía de Implementación

## 📋 ¿Qué se ha implementado?

### ✅ Backend
1. **Modelo de Usuario actualizado** con campo `role`
2. **Sistema de permisos granular** por rol
3. **Middlewares de autorización** reutilizables
4. **Endpoints de gestión de roles** (solo admin)
5. **Ejemplos de rutas protegidas**

### ✅ Frontend
1. **Utilidades de autenticación** (`authUtils.js`)
2. **Funciones para mostrar/ocultar elementos** según permisos
3. **Ejemplo completo de página protegida**

---

## 🚀 Cómo usar el sistema

### 1. Registrar las rutas en tu servidor

En tu archivo principal del servidor (ej: `app.js` o `server.js`):

```javascript
// Importar las nuevas rutas
const roleRoutes = require('./src/app/routes/roleRoutes');

// Registrar las rutas
app.use('/api', roleRoutes);
```

### 2. Proteger rutas existentes

#### Ejemplo: Proteger ruta de programación semanal

**Antes:**
```javascript
router.post('/schedule/save-schedule', saveSchedule);
```

**Después:**
```javascript
const { authenticate } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/authorization');

router.post('/schedule/save-schedule',
    authenticate,
    requirePermission('weeklySchedule', 'create'),
    saveSchedule
);
```

#### Ejemplo: Solo admin puede eliminar

```javascript
router.delete('/shift-schedule/:id',
    authenticate,
    requireAdmin,
    deleteShiftSchedule
);
```

### 3. Usar en el Frontend

#### a) Importar utilidades en tu página

```javascript
import {
    initializePermissions,
    hasPermission,
    isAdmin,
    showIfHasRole
} from './js/authUtils.js';
```

#### b) Inicializar al cargar la página

```javascript
document.addEventListener('DOMContentLoaded', async function() {
    // Cargar permisos del usuario
    await initializePermissions();

    // Mostrar elementos solo para admin
    showIfHasRole('.admin-only', 'admin');

    // Tu código existente...
});
```

#### c) Agregar clases CSS a elementos que quieres controlar

```html
<!-- Solo visible para admin -->
<button class="admin-only">Gestionar Usuarios</button>

<!-- Solo visible para quien tenga permiso -->
<button id="assign-shifts-btn">Asignar Guardias</button>
```

```javascript
// En tu código JS
showIfHasPermission('#assign-shifts-btn', 'shiftSchedule', 'assign');
```

---

## 📝 Tipos de Roles Disponibles

### 1. **Admin** (`role: 'admin'`)
- Acceso total al sistema
- Puede gestionar usuarios
- Puede asignar guardias automáticamente
- Puede ver información de todos los usuarios
- Puede cambiar roles de otros usuarios

### 2. **User** (`role: 'user'`)
- Acceso limitado de solo lectura
- Solo puede ver sus propias guardias
- Puede gestionar solo sus propias vacaciones/licencias
- No puede modificar programaciones

---

## 🔧 Cómo personalizar permisos

Edita el archivo: `backend/src/app/config/permissions.js`

```javascript
const PERMISSIONS = {
    admin: {
        shiftSchedule: {
            create: true,
            read: true,
            update: true,
            delete: true,
            assign: true  // ← Cambia esto a false si no quieres que admin asigne
        }
    },
    user: {
        shiftSchedule: {
            read: true,   // ← Cambia a false para ocultar completamente
            create: false,
            update: false,
            delete: false
        }
    }
};
```

---

## 🎨 Ejemplos de Uso Común

### Ocultar botón "Imprimir" para usuarios normales

```html
<button id="print-button" class="admin-only">Imprimir Programación</button>
```

```javascript
showIfHasRole('.admin-only', 'admin');
```

### Verificar antes de ejecutar acción

```javascript
document.getElementById('assign-shifts').addEventListener('click', () => {
    if (!hasPermission('shiftSchedule', 'assign')) {
        alert('No tienes permisos para asignar guardias');
        return;
    }

    // Continuar con la asignación...
});
```

### Redirigir si no tiene permisos

```javascript
// Al inicio de una página
redirectIfNoRole('/index.html', 'admin');  // Solo admin puede entrar
```

---

## 🔑 Endpoints de API Disponibles

### Cambiar rol de usuario (solo admin)
```
PUT /api/users/:userId/role
Body: { "newRole": "admin" }  // o "user"
Headers: Authorization: Bearer {token}
```

### Ver lista de usuarios con roles (solo admin)
```
GET /api/users/roles
Headers: Authorization: Bearer {token}
```

### Ver MIS permisos (cualquier usuario)
```
GET /api/my-permissions
Headers: Authorization: Bearer {token}
```

### Ver permisos de un rol (solo admin)
```
GET /api/roles/:role/permissions
Headers: Authorization: Bearer {token}
```

---

## 🐛 Solución de Problemas

### "No aparece el badge de rol en el header"
- Verifica que hayas llamado `await initializePermissions()`
- Verifica que tu header tenga un `<h1>`

### "Los botones no se ocultan"
- Verifica que hayas agregado las clases CSS correctas
- Verifica que `initializePermissions()` se llame ANTES de `showIfHasRole()`

### "Error 403 Forbidden"
- El usuario no tiene permisos para esa acción
- Verifica que el middleware esté aplicado correctamente
- Verifica los permisos en `permissions.js`

---

## 📌 Próximos Pasos Recomendados

1. **Migrar usuarios existentes**: Todos los usuarios existentes tienen `role: 'user'` por defecto
2. **Asignar rol admin**: Manualmente en MongoDB o crear un script
3. **Proteger todas las rutas críticas**: Agregar middlewares a rutas existentes
4. **Actualizar frontend**: Agregar `initializePermissions()` a todas las páginas

---

## 🔒 Mejores Prácticas de Seguridad

1. ✅ **Siempre validar en el backend**: Nunca confíes solo en el frontend
2. ✅ **Usar HTTPS en producción**: Protege los tokens
3. ✅ **Verificar permisos en CADA endpoint**: No asumas que el frontend bloqueó
4. ✅ **Logs de acciones admin**: Registra quién cambia roles
5. ✅ **No permitir auto-promoción**: Un user no puede hacerse admin a sí mismo

---

## 📞 Contacto

Para dudas o personalizaciones, revisa:
- `backend/src/app/config/permissions.js` - Configuración de permisos
- `backend/src/app/middlewares/authorization.js` - Middlewares
- `frontend/js/authUtils.js` - Utilidades de frontend
