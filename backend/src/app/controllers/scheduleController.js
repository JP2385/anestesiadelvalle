const Schedule = require('../models/scheduleModel');
const moment = require('moment');

const saveSchedule = async (req, res) => {
    const { timestamp, assignments, dayHeaders, selectConfig, longDaysCount, printedBy, longDaysInform, availabilityInform, mortalCombat } = req.body; // Incluir mortalCombat

    try {
        // Crear un nuevo documento en la colección de schedules
        const newSchedule = new Schedule({
            timestamp,
            assignments,
            dayHeaders,
            selectConfig,
            longDaysCount,
            printedBy,
            longDaysInform,
            availabilityInform,  // Asegurarse de incluir availabilityInform aquí
            mortalCombat  // Incluir estado de Mortal Kombat
        });
        await newSchedule.save();
        res.status(201).send('Schedule saved successfully');
    } catch (error) {
        console.error('Error saving schedule:', error);
        res.status(500).send('Error saving schedule');
    }
};

// Función para obtener el último schedule
const getLastSchedule = async (req, res) => {
    try {
        const lastSchedule = await Schedule.findOne().sort({ createdAt: -1 });
        if (!lastSchedule) {
            return res.status(404).send('No schedule found');
        }
        res.status(200).json(lastSchedule);
    } catch (error) {
        console.error('Error fetching last schedule:', error);
        res.status(500).send('Error fetching last schedule');
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