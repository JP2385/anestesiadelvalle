// holidayWeeks.js
// Matemática de las semanas de licencias de fiestas (Navidad / Año Nuevo).
//
// ESPEJO: frontend/js/licenciasFiestasUtils.js tiene las mismas funciones en ESM.
// El frontend es ES modules y el backend CommonJS, sin build step entre ellos.
// Si tocás la lógica acá, replicala allá (y viceversa).
//
// Todas las fechas se manejan en UTC medianoche. Nunca usar new Date(y, m, d)
// ni getDay(): son hora local y dan off-by-one en Argentina (UTC-3).

const TIPOS_FIESTAS = ['Navidad', 'Año Nuevo'];

/**
 * Parsea a Date en UTC medianoche. Acepta 'YYYY-MM-DD', una fecha ISO larga o un
 * Date/objeto de Mongoose.
 *
 * Ojo: para un Date hay que pasar por toISOString(), NO por String(). String(date)
 * devuelve la fecha en hora local ('Fri Jan 01 2027 21:00:00 GMT-0300'), así que
 * recortar 10 caracteres daría 'Fri Jan 01' → Invalid Date, y además correría un día
 * en Argentina (UTC-3).
 */
function parseUTC(value) {
    if (!value) return null;
    const iso = (value instanceof Date)
        ? value.toISOString()
        : (typeof value.toISOString === 'function' ? value.toISOString() : String(value));
    const d = new Date(iso.substring(0, 10) + 'T00:00:00Z');
    return isNaN(d.getTime()) ? null : d;
}

/** Formatea un Date a 'YYYY-MM-DD'. */
function formatISO(date) {
    return date.toISOString().split('T')[0];
}

/** Devuelve un nuevo Date corrido `dias` días (puede ser negativo). */
function addDiasUTC(date, dias) {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + dias);
    return d;
}

/**
 * Lunes del bloque lunes→domingo que contiene a la fecha dada.
 * getUTCDay(): 0 = domingo … 6 = sábado. El domingo retrocede 6 días, el sábado 5.
 */
function lunesDeLaSemana(date) {
    return addDiasUTC(date, -((date.getUTCDay() + 6) % 7));
}

/**
 * Temporada Y: Navidad = 25/12/Y, Año Nuevo = 01/01/(Y+1).
 *
 * La semana de licencia es el bloque lunes→domingo que contiene al feriado.
 * Esto cubre las dos reglas del grupo con una sola fórmula:
 *   - feriado en día de semana → queda libre el fin de semana siguiente
 *     (p.ej. jue 25/12/2025 → lun 22/12 a dom 28/12);
 *   - feriado en fin de semana → ese finde es el libre y la semana libre es la
 *     previa (p.ej. sáb 25/12/2027 → lun 20/12 a dom 26/12).
 *
 * Verificado 2024-2035: siempre 7 días, arranca lunes, termina domingo, el
 * feriado queda dentro del bloque, y las dos semanas de cada temporada quedan
 * contiguas (sin hueco ni superposición).
 */
function getSeasonWeeks(temporada) {
    const anio = Number(temporada);
    const navInicio = lunesDeLaSemana(parseUTC(`${anio}-12-25`));
    const anInicio = lunesDeLaSemana(parseUTC(`${anio + 1}-01-01`));
    return {
        'Navidad': { inicio: navInicio, fin: addDiasUTC(navInicio, 6) },
        'Año Nuevo': { inicio: anInicio, fin: addDiasUTC(anInicio, 6) }
    };
}

module.exports = {
    TIPOS_FIESTAS,
    parseUTC,
    formatISO,
    addDiasUTC,
    lunesDeLaSemana,
    getSeasonWeeks
};
