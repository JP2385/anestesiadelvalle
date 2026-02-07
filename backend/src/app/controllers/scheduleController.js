const Schedule = require('../models/scheduleModel');
const moment = require('moment');

const saveSchedule = async (req, res) => {
    const { weekStart, weekEnd, assignments, mortalCombat, createdBy, longDaysCount, longDaysInform } = req.body;

    try {
        // Validar que tenemos los datos necesarios
        if (!weekStart || !weekEnd || !assignments || !createdBy) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos: weekStart, weekEnd, assignments, createdBy'
            });
        }

        // Calcular longDaysCount desde assignments como backup/validación
        const calculatedLongDaysCount = calculateLongDaysCount(assignments);

        // Usar el longDaysCount del frontend si existe, sino usar el calculado
        const finalLongDaysCount = longDaysCount || calculatedLongDaysCount;

        // Crear un nuevo documento en la colección de schedules
        const newSchedule = new Schedule({
            weekStart: new Date(weekStart),
            weekEnd: new Date(weekEnd),
            assignments,
            mortalCombat: mortalCombat || { globalMode: false, dailyModes: {} },
            longDaysCount: finalLongDaysCount,
            longDaysInform: longDaysInform || '',
            createdBy
        });

        await newSchedule.save();

        res.status(201).json({
            success: true,
            message: 'Schedule saved successfully',
            scheduleId: newSchedule._id
        });
    } catch (error) {
        console.error('Error saving schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving schedule',
            error: error.message
        });
    }
};

/**
 * Calcula el conteo de días largos por usuario desde los assignments
 * @param {Object} assignments - Assignments por día
 * @returns {Object} Objeto de userId -> { count: N }
 */
function calculateLongDaysCount(assignments) {
    const longDaysCount = {};

    // Iterar todos los días
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
        if (assignments[day] && Array.isArray(assignments[day])) {
            assignments[day].forEach(assignment => {
                // Si el régimen es "largo", incrementar el contador
                if (assignment.regime === 'largo' && assignment.userId) {
                    const userId = assignment.userId.toString();
                    if (!longDaysCount[userId]) {
                        longDaysCount[userId] = { count: 0 };
                    }
                    longDaysCount[userId].count++;
                }
            });
        }
    });

    return longDaysCount;
}

// Función para obtener el último schedule con populate de relaciones (formato optimizado)
const getLastSchedule = async (req, res) => {
    try {
        // Calcular el weekStart relevante según el día actual
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday
        
        // Calcular el sábado de la semana relevante
        let relevantSaturday = new Date(now);
        
        if (dayOfWeek === 0) {
            // Si es domingo, buscar el sábado anterior (ayer)
            relevantSaturday.setDate(now.getDate() - 1);
        } else if (dayOfWeek === 6) {
            // Si es sábado, buscar schedules desde hoy en adelante
            // (la semana que empieza, no la que termina)
            relevantSaturday.setDate(now.getDate());
        } else {
            // Si es lunes (1) a viernes (5), buscar el sábado anterior
            const daysToSubtract = dayOfWeek + 1;
            relevantSaturday.setDate(now.getDate() - daysToSubtract);
        }
        
        relevantSaturday.setHours(0, 0, 0, 0);
        
        // Buscar el schedule más reciente cuyo weekStart sea >= relevantSaturday
        const lastSchedule = await Schedule.findOne({ weekStart: { $gte: relevantSaturday } })
            .sort({ weekStart: 1, createdAt: -1 }) // Primero por weekStart ascendente, luego por createdAt descendente
            .populate('createdBy', 'username email firstName lastName')
            .populate('assignments.monday.userId', 'username firstName lastName')
            .populate({
                path: 'assignments.monday.workSiteId',
                select: 'name abbreviation institution',
                populate: { path: 'institution', select: 'name' }
            })
            .populate('assignments.tuesday.userId', 'username firstName lastName')
            .populate({
                path: 'assignments.tuesday.workSiteId',
                select: 'name abbreviation institution',
                populate: { path: 'institution', select: 'name' }
            })
            .populate('assignments.wednesday.userId', 'username firstName lastName')
            .populate({
                path: 'assignments.wednesday.workSiteId',
                select: 'name abbreviation institution',
                populate: { path: 'institution', select: 'name' }
            })
            .populate('assignments.thursday.userId', 'username firstName lastName')
            .populate({
                path: 'assignments.thursday.workSiteId',
                select: 'name abbreviation institution',
                populate: { path: 'institution', select: 'name' }
            })
            .populate('assignments.friday.userId', 'username firstName lastName')
            .populate({
                path: 'assignments.friday.workSiteId',
                select: 'name abbreviation institution',
                populate: { path: 'institution', select: 'name' }
            });

        if (!lastSchedule) {
            return res.status(404).json({
                success: false,
                message: 'No schedule found'
            });
        }

        res.status(200).json({
            success: true,
            schedule: lastSchedule
        });
    } catch (error) {
        console.error('Error fetching last schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching last schedule',
            error: error.message
        });
    }
};


// Función para obtener el último Schedule de cada semana
const getLastScheduleOfEachWeek = async (req, res) => {
    try {
        // Pipeline de agregación para obtener el último schedule de cada semana, donde la semana empieza el sábado y termina el viernes
        const schedules = await Schedule.aggregate([
            {
                $addFields: {
                    adjustedDate: {
                        // Si el día es entre domingo (1) y viernes (6), restamos los días necesarios para contar como parte de la semana anterior
                        $cond: [
                            { $in: [{ $dayOfWeek: "$createdAt" }, [1, 2, 3, 4, 5, 6]] }, // Días de domingo (1) a viernes (6)
                            { $dateSubtract: { startDate: "$createdAt", unit: "day", amount: { $mod: [{ $dayOfWeek: "$createdAt" }, 7] } } }, // Restamos días para que caiga en la semana anterior
                            "$createdAt" // Si es sábado (7), dejamos la fecha igual
                        ]
                    }
                }
            },
            {
                $addFields: {
                    weekYear: {
                        $isoWeekYear: "$adjustedDate"
                    },
                    weekNumber: {
                        $isoWeek: "$adjustedDate"
                    }
                }
            },
            {
                $sort: { createdAt: -1 } // Ordenar por fecha de creación (de más reciente a más antiguo)
            },
            {
                $group: {
                    _id: { weekYear: "$weekYear", weekNumber: "$weekNumber" }, // Agrupar por año y número de semana ajustado
                    lastSchedule: { $first: "$$ROOT" } // Tomar el primer documento de cada grupo, que es el más reciente de la semana
                }
            },
            {
                $replaceRoot: { newRoot: "$lastSchedule" } // Reemplazar la raíz del documento con el último schedule de cada semana
            },
            {
                $sort: { createdAt: -1 } // Ordenar nuevamente por la fecha de creación de los resultados
            }
        ]);

        if (schedules.length === 0) {
            return res.status(404).send('No schedules found');
        }

        res.status(200).json(schedules);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).send('Error fetching schedules');
    }
};


module.exports = { saveSchedule, getLastSchedule, getLastScheduleOfEachWeek };