const mongoose = require('mongoose');
const User = require('../models/userModel');
const { TIPOS_FIESTAS, getSeasonWeeks, formatISO } = require('../utils/holidayWeeks');

// Mismo filtro de padrón que userController.getAllUsers, para que las dos
// vistas de usuarios no se desalineen.
const FILTRO_PADRON = { allowedSite: null };

/** Valida la temporada recibida (query param o body). Devuelve el año o null. */
function parseTemporada(value) {
    const anio = Number(value);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return null;
    return anio;
}

/** Serializa las semanas para el cliente, con claves estables y fechas ISO cortas. */
function serializarSemanas(semanas) {
    return {
        navidad: {
            inicio: formatISO(semanas['Navidad'].inicio),
            fin: formatISO(semanas['Navidad'].fin)
        },
        anioNuevo: {
            inicio: formatISO(semanas['Año Nuevo'].inicio),
            fin: formatISO(semanas['Año Nuevo'].fin)
        }
    };
}

/**
 * Una licencia cuenta como "generada por esta temporada" si su tipo es uno de los
 * de fiestas Y su startDate coincide exactamente con el lunes de una de las dos
 * semanas. El match exacto es lo que evita confundirla con una licencia 'Navidad'
 * cargada a mano con otras fechas, o con la de otra temporada.
 */
function esLicenciaDeLaTemporada(leave, semanas) {
    if (!leave || !TIPOS_FIESTAS.includes(leave.type) || !leave.startDate) return false;
    const inicio = new Date(leave.startDate).getTime();
    return inicio === semanas[leave.type].inicio.getTime();
}

// Obtener las asignaciones de licencias de fiestas de una temporada
exports.getAsignaciones = async (req, res) => {
    try {
        const temporada = parseTemporada(req.query.temporada);
        if (temporada === null) {
            return res.status(400).json({
                success: false,
                message: 'La temporada debe ser un año válido (por ejemplo 2026).'
            });
        }

        const semanas = getSeasonWeeks(temporada);
        const users = await User.find(FILTRO_PADRON).select('otherLeaves');

        const asignaciones = [];
        users.forEach(user => {
            (user.otherLeaves || []).forEach(leave => {
                if (esLicenciaDeLaTemporada(leave, semanas)) {
                    asignaciones.push({ userId: user._id, holiday: leave.type });
                }
            });
        });

        res.json({
            success: true,
            temporada,
            // Si no hay ninguna licencia generada, la temporada nunca se guardó y el
            // frontend debe mostrar sugerencias en lugar del estado guardado.
            guardada: asignaciones.length > 0,
            semanas: serializarSemanas(semanas),
            asignaciones
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener las licencias de fiestas',
            error: error.message
        });
    }
};

// Guardar (reemplazar) las asignaciones de licencias de fiestas de una temporada
exports.guardarAsignaciones = async (req, res) => {
    try {
        const temporada = parseTemporada(req.body.temporada);
        if (temporada === null) {
            return res.status(400).json({
                success: false,
                message: 'La temporada debe ser un año válido (por ejemplo 2026).'
            });
        }

        const { asignaciones } = req.body;
        if (!Array.isArray(asignaciones)) {
            return res.status(400).json({
                success: false,
                message: 'El campo asignaciones debe ser un arreglo.'
            });
        }

        const vistos = new Set();
        for (const a of asignaciones) {
            if (!TIPOS_FIESTAS.includes(a.holiday)) {
                return res.status(400).json({
                    success: false,
                    message: `Licencia inválida: "${a.holiday}". Debe ser "Navidad" o "Año Nuevo".`
                });
            }
            if (!mongoose.Types.ObjectId.isValid(a.userId)) {
                return res.status(400).json({
                    success: false,
                    message: `Usuario inválido: "${a.userId}".`
                });
            }
            if (vistos.has(String(a.userId))) {
                return res.status(400).json({
                    success: false,
                    message: 'Cada usuario puede tener una sola semana de licencia por temporada.'
                });
            }
            vistos.add(String(a.userId));
        }

        const semanas = getSeasonWeeks(temporada);
        const lunes = TIPOS_FIESTAS.map(tipo => semanas[tipo].inicio);

        // 1) Limpiar las licencias generadas de ESTA temporada en TODO el padrón.
        //    Corre sobre todos los usuarios (no solo los asignados): es lo que hace
        //    que sacar a alguien de una semana y guardar realmente borre su licencia.
        //    Las condiciones van conjugadas, así que las licencias de otros tipos
        //    ('Enfermedad', 'Maternidad', …) y las de otras temporadas no se tocan.
        const ops = [{
            updateMany: {
                filter: FILTRO_PADRON,
                update: {
                    $pull: {
                        otherLeaves: {
                            type: { $in: TIPOS_FIESTAS },
                            startDate: { $in: lunes }
                        }
                    }
                }
            }
        }];

        // 2) Insertar las nuevas asignaciones.
        asignaciones.forEach(a => {
            const semana = semanas[a.holiday];
            ops.push({
                updateOne: {
                    filter: { _id: a.userId },
                    update: {
                        $push: {
                            otherLeaves: {
                                type: a.holiday,
                                startDate: semana.inicio,
                                endDate: semana.fin
                            }
                        }
                    }
                }
            });
        });

        // ordered: true garantiza que el $pull corre antes de los $push.
        await User.bulkWrite(ops, { ordered: true });

        res.json({
            success: true,
            message: `Licencias de fiestas guardadas para la temporada ${temporada}/${temporada + 1}.`,
            temporada,
            asignadas: asignaciones.length,
            semanas: serializarSemanas(semanas)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al guardar las licencias de fiestas',
            error: error.message
        });
    }
};
