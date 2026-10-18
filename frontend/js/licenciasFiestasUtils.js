// licenciasFiestasUtils.js
// Núcleo puro (sin DOM) de la página de licencias de fiestas.
//
// ESPEJO: backend/src/app/utils/holidayWeeks.js tiene la matemática de semanas en
// CommonJS. El frontend es ES modules y el backend CommonJS, sin build step entre
// ellos. Si tocás getSemanasTemporada / lunesDeLaSemana / addDiasUTC, replicalo allá.
//
// Todas las fechas se manejan en UTC medianoche, siguiendo la convención de
// vacationSwapUtils.js. Nunca usar new Date(y, m, d) ni getDay(): son hora local y
// dan off-by-one en Argentina (UTC-3).

export const TIPOS_FIESTAS = ['Navidad', 'Año Nuevo'];

/**
 * Tolerancia en días para considerar que unas vacaciones "pegan" con un feriado.
 * Se mide contra el feriado (25/12 o 1/1), así que 7 días cubre toda la semana
 * anterior y posterior, sin importar en qué día de la semana caiga el feriado.
 */
export const TOLERANCIA_DIAS = 7;

/** Ventana alrededor de las semanas para mostrar vacaciones como contexto. */
export const VENTANA_CONTEXTO_DIAS = 21;

const MS_DIA = 24 * 60 * 60 * 1000;

/**
 * Parsea a Date en UTC medianoche. Acepta 'YYYY-MM-DD', una fecha ISO larga o un
 * Date/objeto de Mongoose.
 *
 * Ojo: para un Date hay que pasar por toISOString(), NO por String(). String(date)
 * devuelve la fecha en hora local ('Fri Jan 01 2027 21:00:00 GMT-0300'), así que
 * recortar 10 caracteres daría 'Fri Jan 01' → Invalid Date, y además correría un día
 * en Argentina (UTC-3).
 */
export function parseUTC(value) {
    if (!value) return null;
    const iso = (value instanceof Date)
        ? value.toISOString()
        : (typeof value.toISOString === 'function' ? value.toISOString() : String(value));
    const d = new Date(iso.substring(0, 10) + 'T00:00:00Z');
    return isNaN(d.getTime()) ? null : d;
}

/** Formatea un Date a 'YYYY-MM-DD'. */
export function formatISO(date) {
    return date.toISOString().split('T')[0];
}

/** Devuelve un nuevo Date corrido `dias` días (puede ser negativo). */
export function addDiasUTC(date, dias) {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + dias);
    return d;
}

/**
 * Lunes del bloque lunes→domingo que contiene a la fecha dada.
 * getUTCDay(): 0 = domingo … 6 = sábado. El domingo retrocede 6 días, el sábado 5.
 */
export function lunesDeLaSemana(date) {
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
 */
export function getSemanasTemporada(temporada) {
    const anio = Number(temporada);
    const navInicio = lunesDeLaSemana(parseUTC(`${anio}-12-25`));
    const anInicio = lunesDeLaSemana(parseUTC(`${anio + 1}-01-01`));
    return {
        'Navidad': { inicio: navInicio, fin: addDiasUTC(navInicio, 6) },
        'Año Nuevo': { inicio: anInicio, fin: addDiasUTC(anInicio, 6) }
    };
}

/**
 * Temporada que corresponde gestionar hoy.
 * La semana de Año Nuevo de la temporada Y cae en enero de Y+1, así que durante
 * enero la temporada vigente sigue siendo la anterior.
 */
export function temporadaPorDefecto(hoy = new Date()) {
    const anio = hoy.getUTCFullYear();
    return hoy.getUTCMonth() === 0 ? anio - 1 : anio;
}

/** Diferencia en días enteros entre dos Date (a - b). */
function diffDias(a, b) {
    return Math.round((a - b) / MS_DIA);
}

/** Etiqueta de la categoría de trabajo privado de un usuario. */
export function etiquetaPrivado(user) {
    const nqn = !!user.worksInPrivateNeuquen;
    const rn = !!user.worksInPrivateRioNegro;
    if (nqn && rn) return { texto: 'Ambos', clase: 'privado-ambos', categoria: 'ambos' };
    if (nqn) return { texto: 'Privado Neuquén', clase: 'privado-nqn', categoria: 'nqn' };
    if (rn) return { texto: 'Privado Río Negro', clase: 'privado-rn', categoria: 'rn' };
    return { texto: '—', clase: 'privado-ninguno', categoria: 'ninguno' };
}

/**
 * Sugerencia de licencia según las vacaciones del usuario.
 *
 * La cercanía se mide contra el FERIADO (25/12 y 1/1), no contra los bordes del
 * bloque lunes→domingo. Medir contra los bordes no funciona: las vacaciones del
 * grupo empiezan sábado, y el sábado anterior al domingo de cierre cae *dentro* de
 * la semana, así que la sugerencia de Año Nuevo nunca se disparaba (es el caso de
 * las vacaciones que arrancan el 2 de enero).
 *
 *   - Navidad   si unas vacaciones TERMINAN cerca del 25/12 (o lo contienen).
 *   - Año Nuevo si unas vacaciones EMPIEZAN cerca del 1/1 (o lo contienen).
 *   - Si coinciden ambas gana Navidad (es la semana más temprana; desempate
 *     determinístico) y se avisa en el motivo para que el admin lo revise.
 *
 * Devuelve { holiday: 'Navidad'|'Año Nuevo'|'', motivo: string }.
 */
export function sugerirLicencia(vacations, semanas, tolerancia = TOLERANCIA_DIAS) {
    const nav = semanas['Navidad'];
    const an = semanas['Año Nuevo'];

    // Los feriados son los días que contiene cada bloque: 25/12 y 1/1.
    const navidad = parseUTC(`${nav.inicio.getUTCFullYear()}-12-25`);
    const anioNuevo = parseUTC(`${an.fin.getUTCFullYear()}-01-01`);

    let pegaNav = false;
    let pegaAn = false;

    (vacations || []).forEach(v => {
        const ini = parseUTC(v.startDate);
        const fin = parseUTC(v.endDate);
        if (!ini || !fin) return;

        // Vacaciones que terminan hasta `tolerancia` días antes de Navidad, o que
        // la contienen (en ese caso la licencia prolonga naturalmente ese descanso).
        const antesDeNav = diffDias(navidad, fin);
        if (antesDeNav >= -tolerancia && antesDeNav <= tolerancia) pegaNav = true;

        // Vacaciones que empiezan hasta `tolerancia` días después de Año Nuevo, o
        // que lo contienen.
        const despuesDeAn = diffDias(ini, anioNuevo);
        if (despuesDeAn >= -tolerancia && despuesDeAn <= tolerancia) pegaAn = true;
    });

    if (pegaNav && pegaAn) {
        return { holiday: 'Navidad', motivo: 'Coincide con ambas; se sugiere Navidad' };
    }
    if (pegaNav) {
        return { holiday: 'Navidad', motivo: 'Sus vacaciones terminan cerca de Navidad' };
    }
    if (pegaAn) {
        return { holiday: 'Año Nuevo', motivo: 'Sus vacaciones comienzan cerca de Año Nuevo' };
    }
    return { holiday: '', motivo: '' };
}

/**
 * Vacaciones que intersecan la ventana de contexto alrededor de las dos semanas,
 * para que el admin pueda controlar la sugerencia. Ordenadas por fecha de inicio.
 */
export function vacacionesCercanas(vacations, semanas, ventana = VENTANA_CONTEXTO_DIAS) {
    const desde = addDiasUTC(semanas['Navidad'].inicio, -ventana);
    const hasta = addDiasUTC(semanas['Año Nuevo'].fin, ventana);

    return (vacations || [])
        .map(v => ({ inicio: parseUTC(v.startDate), fin: parseUTC(v.endDate) }))
        .filter(v => v.inicio && v.fin && v.inicio <= hasta && v.fin >= desde)
        .sort((a, b) => a.inicio - b.inicio);
}

/** Formatea un Date como 'dd/mm' cortando el ISO a mano (sin toLocaleDateString). */
export function formatDiaMes(date) {
    const [, mes, dia] = formatISO(date).split('-');
    return `${dia}/${mes}`;
}

/** Formatea un Date como 'dd/mm/yyyy'. */
export function formatFechaCompleta(date) {
    const [anio, mes, dia] = formatISO(date).split('-');
    return `${dia}/${mes}/${anio}`;
}
