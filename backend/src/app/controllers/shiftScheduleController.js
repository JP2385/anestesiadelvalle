const ShiftSchedule = require('../models/shiftScheduleModel');

// Guardar o actualizar el horario del mes actual
const saveShiftSchedule = async (req, res) => {
    const { timestamp, shiftSchedule, shiftCounts, selectConfig, printedBy } = req.body;

    // Extraer el mes y año desde `timestamp` para almacenar en el campo `month`
    const month = timestamp.slice(0, 7); // Ej: '2024-10'

    try {
        // Buscar si ya existe un horario para este mes
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

// Obtener el horario del último mes
const getLastShiftSchedule = async (req, res) => {
    try {
        const lastSchedule = await ShiftSchedule.findOne().sort({ createdAt: -1 });
        if (!lastSchedule) {
            return res.status(404).json({ message: 'No schedule found' });
        }
        res.status(200).json(lastSchedule);
    } catch (error) {
        console.error('Error fetching last shift schedule:', error);
        res.status(500).json({ error: 'Error fetching last shift schedule' });
    }
};

module.exports = {
    saveShiftSchedule,
    getLastShiftSchedule
};
