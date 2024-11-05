// controllers/holidayController.js
const Holiday = require('../models/holidayModel');

// Obtener todos los feriados
exports.getHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find().sort({ startDate: -1 });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los feriados', error });
    }
};

exports.createHoliday = async (req, res) => {
    const { name, startDate, endDate } = req.body;

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Verificar superposición de fechas
        const overlappingHoliday = await Holiday.findOne({
            $or: [
                { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
        });

        if (overlappingHoliday) {
            return res.status(400).json({ message: 'Ya existe un feriado en este rango de fechas.' });
        }

        const newHoliday = new Holiday({
            name,
            startDate: start,
            endDate: end
        });

        const savedHoliday = await newHoliday.save();
        res.status(201).json(savedHoliday);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el feriado', error });
    }
};


// Eliminar un feriado por su ID
exports.deleteHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findByIdAndDelete(req.params.id);

        if (!holiday) {
            return res.status(404).json({ message: 'Feriado no encontrado' });
        }

        res.json({ message: 'Feriado eliminado', holiday });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el feriado', error });
    }
};
