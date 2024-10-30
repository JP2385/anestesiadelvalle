const ShiftSchedule = require('../models/shiftScheduleModel');

// Guardar o actualizar el horario del mes actual
const saveShiftSchedule = async (req, res) => {
    const { month, shiftSchedule, shiftCounts, selectConfig, printedBy } = req.body;

    try {
        // Buscar si ya existe un horario para este mes específico
        let existingSchedule = await ShiftSchedule.findOne({ month });

        if (existingSchedule) {
            // Actualizar el documento existente
            existingSchedule.shiftSchedule = shiftSchedule;
            existingSchedule.shiftCounts = shiftCounts;
            existingSchedule.selectConfig = selectConfig;
            existingSchedule.printedBy = printedBy;
            await existingSchedule.save();
            res.status(200).json({ message: 'Shift schedule updated successfully' });
        } else {
            // Crear un nuevo documento
            const newSchedule = new ShiftSchedule({
                month,
                shiftSchedule,
                shiftCounts,
                selectConfig,
                printedBy
            });
            await newSchedule.save();
            res.status(201).json({ message: 'Shift schedule saved successfully' });
        }
    } catch (error) {
        console.error('Error saving shift schedule:', error);
        res.status(500).json({ error: 'Error saving shift schedule', details: error.message });
    }
};

// Obtener el horario de un mes específico
const getShiftScheduleByMonth = async (req, res) => {
    const { yearMonth } = req.params;
    console.log("Received yearMonth parameter:", yearMonth); // Log de verificación
    try {
        const schedule = await ShiftSchedule.findOne({ month: yearMonth });
        if (!schedule) {
            console.log("No schedule found for:", yearMonth);
            return res.status(404).json({ message: 'No schedule found for this month' });
        }
        res.status(200).json(schedule);
    } catch (error) {
        console.error('Error fetching shift schedule:', error);
        res.status(500).json({ error: 'Error fetching shift schedule' });
    }
};

// Obtener todos los horarios de cada mes
const getAllMonthlySchedules = async (req, res) => {
    try {
        const allSchedules = await ShiftSchedule.find({});
        res.status(200).json(allSchedules);
    } catch (error) {
        console.error('Error al obtener todos los horarios mensuales:', error);
        res.status(500).json({ error: 'Error al obtener todos los horarios mensuales' });
    }
};

module.exports = {
    saveShiftSchedule,
    getShiftScheduleByMonth,
    getAllMonthlySchedules
};
