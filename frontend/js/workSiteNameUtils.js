/**
 * Utilidades compartidas para formatear nombres de workSites
 * Usado por weekly-schedule.html y print-view.html
 */

/**
 * Construye el nombre completo de un workSite
 * Formato: Institución + Abreviatura (si aplica) + Régimen (si tiene múltiples)
 *
 * @param {Object} workSite - Objeto workSite con institution, name, abbreviation
 * @param {Object} institution - Objeto institución con name
 * @param {string} regime - 'matutino', 'vespertino', o 'largo'
 * @param {boolean} hasMultipleSites - Si la institución tiene múltiples sitios
 * @param {boolean} hasMultipleRegimes - Si este workSite específico tiene múltiples regímenes
 * @returns {string} Nombre formateado del workSite
 */
export function buildWorkSiteName(workSite, institution, regime, hasMultipleSites = false, hasMultipleRegimes = false) {
    let workSiteName = '';

    // 1. Agregar nombre de institución
    if (institution && institution.name) {
        workSiteName = institution.name;
    }

    // 2. Agregar abreviatura del workSite (solo si tiene múltiples sitios)
    if (hasMultipleSites) {
        if (workSite.abbreviation) {
            workSiteName += ' ' + workSite.abbreviation;
        } else if (workSite.name) {
            workSiteName += ' ' + workSite.name;
        }
    }

    // 3. Agregar régimen (solo si tiene múltiples regímenes)
    if (hasMultipleRegimes) {
        const regimeLabel = regime === 'matutino' ? ' Matutino' :
                          regime === 'vespertino' ? ' Vespertino' : ' Largo';
        workSiteName += regimeLabel;
    }

    return workSiteName.trim();
}

/**
 * Determina si un workSite tiene múltiples regímenes activos
 * Analiza todos los assignments de todos los días para el mismo workSiteId
 *
 * @param {string} workSiteId - ID del workSite a verificar
 * @param {Object} assignments - Objeto con assignments por día {monday: [...], tuesday: [...], ...}
 * @returns {boolean} True si tiene más de un régimen
 */
export function hasMultipleRegimes(workSiteId, assignments) {
    const regimes = new Set();
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    days.forEach(day => {
        if (assignments[day] && Array.isArray(assignments[day])) {
            assignments[day].forEach(assignment => {
                const assignmentWsId = assignment.workSiteId?._id?.toString() || assignment.workSiteId?.toString();
                if (assignmentWsId === workSiteId.toString()) {
                    regimes.add(assignment.regime);
                }
            });
        }
    });

    return regimes.size > 1;
}

/**
 * Mapea todos los workSites y sus regímenes desde los assignments
 * Útil para determinar cuáles tienen múltiples regímenes
 *
 * @param {Object} assignments - Objeto con assignments por día
 * @returns {Map} Map de workSiteId -> Set de regímenes
 */
export function mapWorkSiteRegimes(assignments) {
    const workSiteRegimes = new Map();
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    days.forEach(day => {
        if (assignments[day] && Array.isArray(assignments[day])) {
            assignments[day].forEach(assignment => {
                const wsId = (assignment.workSiteId?._id || assignment.workSiteId).toString();
                if (!workSiteRegimes.has(wsId)) {
                    workSiteRegimes.set(wsId, new Set());
                }
                workSiteRegimes.get(wsId).add(assignment.regime);
            });
        }
    });

    return workSiteRegimes;
}

/**
 * Retorna el orden de prioridad según la institución del workSite
 * Orden: Fundación → CMAC → Imágenes → COI → Públicas Río Negro → Públicas Neuquén
 *
 * @param {string} workSiteName - Nombre completo del workSite
 * @returns {number} Prioridad para ordenamiento
 */
export function getInstitutionOrder(workSiteName) {
    const name = workSiteName.toLowerCase();

    // 1. Fundación
    if (name.includes('fundación') || name.includes('fundacion')) {
        return 1000;
    }

    // 2. CMAC
    if (name.includes('cmac')) {
        return 2000;
    }

    // 3. Imágenes
    if (name.includes('imágenes') || name.includes('imagenes')) {
        return 3000;
    }

    // 4. COI
    if (name.includes('coi')) {
        return 4000;
    }

    // 5. Públicas Río Negro (Hospital Castro Rendon, URPA RN)
    if (name.includes('castro rendon') || name.includes('castro rendón') ||
        (name.includes('urpa') && name.includes('rn'))) {
        return 5000;
    }

    // 6. Públicas Neuquén (Hospital Bouquet Roldán, URPA NQN, etc)
    if (name.includes('bouquet') || name.includes('roldán') || name.includes('roldan') ||
        (name.includes('urpa') && name.includes('nqn'))) {
        return 6000;
    }

    // Por defecto, al final
    return 9000;
}

/**
 * Ordena un array de nombres de workSites según el orden de instituciones
 *
 * @param {Array<string>} workSiteNames - Array de nombres de workSites
 * @returns {Array<string>} Array ordenado
 */
export function sortWorkSitesByInstitution(workSiteNames) {
    return workSiteNames.sort((a, b) => {
        const orderA = getInstitutionOrder(a);
        const orderB = getInstitutionOrder(b);

        // Primero ordenar por institución
        if (orderA !== orderB) {
            return orderA - orderB;
        }

        // Si son de la misma institución, ordenar alfabéticamente
        return a.localeCompare(b, 'es');
    });
}
