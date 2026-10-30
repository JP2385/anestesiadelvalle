// Filtros de usuarios compartidos, para que las distintas vistas del padrón no
// se desalineen entre sí.

// Padrón activo: los socios que hoy usan la app.
//
// - allowedSite: null  -> excluye las cuentas de kiosko (acceso a un solo sitio),
//                         que no son socios del padrón.
// - activo: { $ne: false } -> excluye a los dados de baja. Se usa $ne en lugar de
//                         true para que los usuarios creados antes de que el campo
//                         existiera (sin la propiedad en Mongo) sigan contando como
//                         activos, sin necesidad de migrar la colección.
const FILTRO_PADRON = { allowedSite: null, activo: { $ne: false } };

// Sólo la condición de baja, para colecciones que no distinguen kioskos.
const FILTRO_ACTIVO = { activo: { $ne: false } };

module.exports = { FILTRO_PADRON, FILTRO_ACTIVO };
