const ShiftSchedule = require('../models/shiftScheduleModel');
const nodemailer = require('nodemailer');
const config = require('../../../config');

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


const sendScheduleEmail = async (req, res) => {
    const { month, year, monthYearText } = req.body;
    const fundaEmail = 'anestesiafunda@gmail.com';
    const imagesEmail = 'jpserranogamarra@gmail.com';

    // Configurar nodemailer
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.emailUser,
            pass: config.emailPass,
        }
    });

    // Configuración del mensaje para Fundación
    const mailOptionsFunda = {
        from: config.emailUser,
        to: fundaEmail,
        subject: `Guardias de Anestesia del mes de ${month} de ${year}`,
        text: `Estimado/a:
        
Haciendo click en el siguiente link podrá acceder a las guardias de anestesia del mes de ${month} de ${year} de Fundación:
https://adv-37d5b772f5fd.herokuapp.com/shiftInform.html?year=${year}&month=${monthYearText}&site=Fn

Saludos,`
    };

    // Configuración del mensaje para Imágenes
    const mailOptionsImages = {
        from: config.emailUser,
        to: imagesEmail,
        subject: `Guardias de Anestesia del mes de ${month} de ${year}`,
        text: `Estimado/a:
        
Haciendo click en el siguiente link podrá acceder a las guardias de anestesia del mes de ${month} de ${year} de Imágenes:
https://adv-37d5b772f5fd.herokuapp.com/shiftInform.html?year=${year}&month=${monthYearText}&site=Im

Saludos,`
    };

    // Enviar correos electrónicos
    try {
        await transporter.sendMail(mailOptionsFunda);
        await transporter.sendMail(mailOptionsImages);

        res.json({ message: 'Correos enviados exitosamente a Fundación e Imágenes.' });
    } catch (error) {
        console.error('Error al enviar correos:', error);
        res.status(500).json({ message: 'Error al enviar los correos electrónicos: ' + error.message });
    }
};



module.exports = {
    saveShiftSchedule,
    getShiftScheduleByMonth,
    getAllMonthlySchedules,
    sendScheduleEmail
};
