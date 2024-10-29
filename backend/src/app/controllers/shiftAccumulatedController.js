// controllers/shiftAccumulatedController.js
const ShiftAccumulated = require('../models/ShiftAccumulated.js');

// Obtener el acumulado de guardias para todos los usuarios
async function getAccumulatedShifts(req, res) {
    try {
        const accumulatedShifts = await ShiftAccumulated.find({});
        res.status(200).json(accumulatedShifts);
    } catch (error) {
        console.error('Error al obtener acumulado de guardias:', error);
        res.status(500).json({ error: 'Error al obtener acumulado de guardias' });
    }
}

// Actualizar el acumulado de guardias para cada usuario
async function updateAccumulatedShifts(req, res) {
    const shiftCounts = req.body;

    // Verificar si shiftCounts es válido y es un array
    if (!Array.isArray(shiftCounts) || shiftCounts.length === 0) {
        console.error('Error: shiftCounts no es un array o está vacío:', shiftCounts);
        return res.status(400).json({ error: 'Datos de conteo de guardias inválidos o vacíos' });
    }

    try {
        for (const { username, weekdayShifts, weekendShifts, saturdayShifts } of shiftCounts) {
            const existingAccumulated = await ShiftAccumulated.findOne({ username });

            if (existingAccumulated) {
                // Actualizar acumulado existente
                existingAccumulated.week += weekdayShifts;
                existingAccumulated.weekend += weekendShifts;
                existingAccumulated.saturday += saturdayShifts;
                await existingAccumulated.save();
            } else {
                // Crear un nuevo registro de acumulado si no existe
                await ShiftAccumulated.create({
                    username,
                    week: weekdayShifts,
                    weekend: weekendShifts,
                    saturday: saturdayShifts
                });
            }
        }
        res.status(200).json({ message: 'Acumulado de guardias actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar acumulado de guardias:', error);
        res.status(500).json({ error: 'Error al actualizar acumulado de guardias' });
    }
}

module.exports = {
    getAccumulatedShifts,
    updateAccumulatedShifts
};
