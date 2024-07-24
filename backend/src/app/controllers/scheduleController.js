// backend/src/app/controllers/scheduleController.js
const Schedule = require('../models/scheduleModel');

// Función para guardar un schedule
const saveSchedule = async (req, res) => {
    const { timestamp, assignments, dayHeaders } = req.body;

    try {
        // Crear un nuevo documento en la colección de schedules
        const newSchedule = new Schedule({ timestamp, assignments, dayHeaders });
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

module.exports = { saveSchedule, getLastSchedule };

