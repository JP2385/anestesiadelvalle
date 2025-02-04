// controllers/holidayController.js
const Holiday = require('../models/holidayModel');

// Obtener todos los feriados
exports.getHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find().sort({ startDate: -1 }).populate('users', 'username'); 
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los feriados', error });
    }
};

exports.createHoliday = async (req, res) => {
    const { name, startDate, endDate, users } = req.body;

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

        // Validar que users sea un array
        const userIds = Array.isArray(users) ? users : [];

        const newHoliday = new Holiday({
            name,
            startDate: start,
            endDate: end,
            users: userIds // Almacena los ObjectId de los usuarios
        });

        const savedHoliday = await newHoliday.save();
        res.status(201).json(savedHoliday);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el feriado', error });
    }
};



// Eliminar un feriado por su ID
const mongoose = require('mongoose');

exports.deleteHoliday = async (req, res) => {
    try {
        // Verifica si el ID es un ObjectId válido
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID de feriado no válido' });
        }

        const holiday = await Holiday.findByIdAndDelete(req.params.id);

        if (!holiday) {
            return res.status(404).json({ message: 'Feriado no encontrado' });
        }

        console.log('Feriado eliminado:', holiday); // ✅ Debug en servidor

        return res.status(200).json({ message: 'Feriado eliminado correctamente', deletedHoliday: holiday });
    } catch (error) {
        console.error('Error al eliminar el feriado:', error);
        return res.status(500).json({ message: 'Error al eliminar el feriado', error: error.message });
    }
};

exports.updateHoliday = async (req, res) => {
    const { name, startDate, endDate, users } = req.body;

    try {
        const updatedHoliday = await Holiday.findByIdAndUpdate(
            req.params.id,
            { 
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                users: Array.isArray(users) ? users : []
            },
            { new: true } // Devuelve el documento actualizado
        );

        if (!updatedHoliday) {
            return res.status(404).json({ message: 'Feriado no encontrado' });
        }

        console.log('Feriado actualizado correctamente:', updatedHoliday);

        // ✅ Asegura que se devuelve JSON con estado 200
        return res.status(200).json(updatedHoliday);
    } catch (error) {
        console.error('Error al actualizar el feriado:', error);
        return res.status(500).json({ message: 'Error al actualizar el feriado', error: error.message });
    }
};



