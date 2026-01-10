const ExtraAssignment = require('../models/extraAssignmentModel');
const User = require('../models/userModel');

/**
 * Obtener asignaciones extras de una semana específica
 */
exports.getExtraAssignmentsByWeek = async (req, res) => {
    try {
        const { weekStart } = req.params;
        const weekDate = new Date(weekStart);

        const extraAssignment = await ExtraAssignment.findOne({ weekStart: weekDate });

        if (!extraAssignment) {
            return res.json({
                success: true,
                data: {}
            });
        }

        // Convertir Map a objeto plano para JSON
        const assignmentsObj = {};
        if (extraAssignment.assignments) {
            extraAssignment.assignments.forEach((value, key) => {
                assignmentsObj[key] = value;
            });
        }

        res.json({
            success: true,
            data: assignmentsObj
        });

    } catch (error) {
        console.error('Error getting extra assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asignaciones extras'
        });
    }
};

/**
 * Guardar/actualizar asignaciones extras de una semana
 */
exports.saveExtraAssignments = async (req, res) => {
    try {
        const { weekStart, assignments } = req.body;
        const userId = req.userId; // Del middleware de autenticación

        if (!weekStart) {
            return res.status(400).json({
                success: false,
                message: 'weekStart es requerido'
            });
        }

        const weekDate = new Date(weekStart);

        // Buscar si ya existe un registro para esta semana
        let extraAssignment = await ExtraAssignment.findOne({ weekStart: weekDate });

        if (extraAssignment) {
            // Actualizar existente
            extraAssignment.assignments = assignments;
            extraAssignment.updatedBy = userId;
            await extraAssignment.save();
        } else {
            // Crear nuevo
            extraAssignment = new ExtraAssignment({
                weekStart: weekDate,
                assignments: assignments,
                createdBy: userId,
                updatedBy: userId
            });
            await extraAssignment.save();
        }

        res.json({
            success: true,
            message: 'Asignaciones extras guardadas exitosamente',
            data: extraAssignment
        });

    } catch (error) {
        console.error('Error saving extra assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar asignaciones extras'
        });
    }
};

/**
 * Generar reporte mensual de asignaciones extras por usuario
 */
exports.getMonthlyReport = async (req, res) => {
    try {
        const { year, month } = req.params;

        // Calcular rango de fechas del mes
        const startDate = new Date(year, month - 1, 1); // Primer día del mes
        const endDate = new Date(year, month, 0); // Último día del mes

        // Obtener todos los usuarios para calcular asignaciones por defecto
        const users = await User.find({});

        console.log(`Generating report for ${year}/${month}`);
        console.log(`Date range: ${startDate} to ${endDate}`);
        console.log(`Total users: ${users.length}`);

        // Contabilizar asignaciones por defecto del mes
        const defaultAssignmentsStats = {};
        let totalDefaultAssignments = 0;

        // Obtener todos los lunes del mes
        const mondaysInMonth = [];
        let currentDate = new Date(startDate);

        // Ajustar al primer lunes del mes o antes
        while (currentDate <= endDate) {
            if (currentDate.getDay() === 1) { // Es lunes
                mondaysInMonth.push(new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Calcular número de semana del año
        function getWeekNumber(date) {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        }

        // Recorrer cada semana del mes
        mondaysInMonth.forEach(monday => {
            const weekNumber = getWeekNumber(monday);
            const isOddWeek = weekNumber % 2 !== 0;
            const weekKey = isOddWeek ? 'oddWeeks' : 'evenWeeks';

            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

            // Calcular qué día del mes corresponde a cada día de la semana
            days.forEach((day, dayIndex) => {
                const dayDate = new Date(monday);
                dayDate.setDate(monday.getDate() + dayIndex);

                // Solo contar si el día está dentro del mes
                if (dayDate.getMonth() === month - 1) {
                    // Recorrer usuarios y contar sus asignaciones por defecto
                    users.forEach(user => {
                        if (user.defaultAssignments && user.defaultAssignments[weekKey]) {
                            const dayAssignments = user.defaultAssignments[weekKey][day];
                            if (dayAssignments && Array.isArray(dayAssignments) && dayAssignments.length > 0) {
                                // El usuario tiene asignaciones por defecto este día
                                if (!defaultAssignmentsStats[user._id.toString()]) {
                                    defaultAssignmentsStats[user._id.toString()] = {
                                        count: 0,
                                        details: [],
                                        username: user.username
                                    };
                                }

                                // Contar una asignación por defecto
                                defaultAssignmentsStats[user._id.toString()].count++;
                                totalDefaultAssignments++;

                                const dayStr = dayDate.toLocaleDateString('es-AR');
                                defaultAssignmentsStats[user._id.toString()].details.push(`${dayStr} - ${day}`);
                            }
                        }
                    });
                }
            });
        });

        // Buscar todas las asignaciones extras del mes
        const extraAssignments = await ExtraAssignment.find({
            weekStart: {
                $gte: startDate,
                $lte: endDate
            }
        });

        // Contabilizar asignaciones extras por usuario
        const extraAssignmentsStats = {};
        let totalExtraAssignments = 0;

        extraAssignments.forEach(weekAssignment => {
            if (weekAssignment.assignments) {
                weekAssignment.assignments.forEach((dayAssignments, workSiteId) => {
                    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

                    days.forEach(day => {
                        const userId = dayAssignments[day];
                        if (userId) {
                            // Verificar que este día esté dentro del mes
                            const weekStart = new Date(weekAssignment.weekStart);
                            const dayIndex = days.indexOf(day);
                            const dayDate = new Date(weekStart);
                            dayDate.setDate(weekStart.getDate() + dayIndex);

                            if (dayDate.getMonth() === month - 1) {
                                if (!extraAssignmentsStats[userId]) {
                                    // Buscar el usuario comparando tanto con _id como string
                                    const user = users.find(u =>
                                        u._id.toString() === userId ||
                                        u._id.toString() === userId.toString()
                                    );

                                    if (!user) {
                                        console.warn('User not found for userId:', userId);
                                    }

                                    extraAssignmentsStats[userId] = {
                                        count: 0,
                                        details: [],
                                        username: user ? user.username : `Usuario ${userId}`
                                    };
                                }
                                extraAssignmentsStats[userId].count++;
                                totalExtraAssignments++;

                                // Agregar detalle de la asignación
                                const dayStr = dayDate.toLocaleDateString('es-AR');
                                extraAssignmentsStats[userId].details.push(`${dayStr} - ${day}`);
                            }
                        }
                    });
                });
            }
        });

        console.log(`Default assignments found for ${Object.keys(defaultAssignmentsStats).length} users`);
        console.log(`Extra assignments found for ${Object.keys(extraAssignmentsStats).length} users`);
        console.log(`Total default assignments: ${totalDefaultAssignments}`);
        console.log(`Total extra assignments: ${totalExtraAssignments}`);

        // Calcular totales y porcentajes
        const totalAssignments = totalDefaultAssignments + totalExtraAssignments;
        const defaultPercentage = totalAssignments > 0 ? ((totalDefaultAssignments / totalAssignments) * 100).toFixed(2) : 0;
        const extraPercentage = totalAssignments > 0 ? ((totalExtraAssignments / totalAssignments) * 100).toFixed(2) : 0;

        // Combinar asignaciones por usuario (default + extra) y calcular porcentajes
        const userTotals = {};

        // Agregar asignaciones por defecto
        Object.entries(defaultAssignmentsStats).forEach(([userId, data]) => {
            if (!userTotals[userId]) {
                userTotals[userId] = {
                    username: data.username,
                    defaultCount: 0,
                    extraCount: 0,
                    totalCount: 0,
                    percentage: 0
                };
            }
            userTotals[userId].defaultCount = data.count;
            userTotals[userId].totalCount += data.count;
        });

        // Agregar asignaciones extras
        Object.entries(extraAssignmentsStats).forEach(([userId, data]) => {
            if (!userTotals[userId]) {
                userTotals[userId] = {
                    username: data.username,
                    defaultCount: 0,
                    extraCount: 0,
                    totalCount: 0,
                    percentage: 0
                };
            }
            userTotals[userId].extraCount = data.count;
            userTotals[userId].totalCount += data.count;
        });

        // Calcular porcentajes por usuario
        Object.keys(userTotals).forEach(userId => {
            userTotals[userId].percentage = totalAssignments > 0
                ? parseFloat(((userTotals[userId].totalCount / totalAssignments) * 100).toFixed(2))
                : 0;
        });

        res.json({
            success: true,
            data: {
                defaultAssignments: defaultAssignmentsStats,
                extraAssignments: extraAssignmentsStats,
                userTotals: userTotals,
                summary: {
                    totalDefaultAssignments,
                    totalExtraAssignments,
                    totalAssignments,
                    defaultPercentage: parseFloat(defaultPercentage),
                    extraPercentage: parseFloat(extraPercentage)
                }
            },
            period: {
                year,
                month,
                startDate,
                endDate
            }
        });

    } catch (error) {
        console.error('Error generating monthly report:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar reporte mensual'
        });
    }
};

/**
 * Obtener todas las asignaciones extras (para administración)
 */
exports.getAllExtraAssignments = async (req, res) => {
    try {
        const extraAssignments = await ExtraAssignment.find()
            .populate('createdBy', 'username')
            .populate('updatedBy', 'username')
            .sort({ weekStart: -1 })
            .limit(100); // Últimas 100 semanas

        res.json({
            success: true,
            data: extraAssignments
        });

    } catch (error) {
        console.error('Error getting all extra assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asignaciones extras'
        });
    }
};

/**
 * Eliminar asignaciones extras de una semana
 */
exports.deleteExtraAssignments = async (req, res) => {
    try {
        const { weekStart } = req.params;
        const weekDate = new Date(weekStart);

        await ExtraAssignment.deleteOne({ weekStart: weekDate });

        res.json({
            success: true,
            message: 'Asignaciones extras eliminadas exitosamente'
        });

    } catch (error) {
        console.error('Error deleting extra assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar asignaciones extras'
        });
    }
};
