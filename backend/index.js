require('dotenv').config({ path: './backend/.env' });

const dns = require('dns');
if (process.env.NODE_ENV !== 'production') {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
}
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const cors = require('cors');
const authRoutes = require('./src/app/routes/authRoutes');
const scheduleRoutes = require('./src/app/routes/scheduleRoutes');
const shiftScheduleRoutes = require('./src/app/routes/shiftScheduleRoutes'); // Ruta para los horarios específicos de guardias
const vacationSwapRoutes = require('./src/app/routes/vacationSwapRoutes');
const notificationRoutes = require('./src/app/routes/notificationRoutes');
const holidayRoutes = require('./src/app/routes/holidayRoutes');
const roleRoutes = require('./src/app/routes/roleRoutes');
const institutionRoutes = require('./src/app/routes/institutionRoutes');
const workSiteRoutes = require('./src/app/routes/workSiteRoutes');
const path = require('path');
const publicRoutes = require('./src/app/routes/publicRoutes');
const { getUsersAvailability } = require('./src/app/controllers/availabilityController');
const { getAllVacations } = require('./src/app/controllers/vacationController');
const coverageRequestRoutes = require('./src/app/routes/coverageRequestRoutes');
const otherLeaveRoutes = require('./src/app/routes/otherLeaveRoutes');
const extraAssignmentRoutes = require('./src/app/routes/extraAssignmentRoutes');
const groupPeriodRoutes = require('./src/app/routes/groupPeriodRoutes');
const liquidacionRoutes = require('./src/app/routes/liquidacionRoutes');
const cron = require('node-cron');
const User = require('./src/app/models/userModel');
const Notification = require('./src/app/models/notificationModel');

const app = express();
app.use(express.json());

const corsOptions = {
    origin: ['http://localhost:3000', 'https://anestesiadelvalle.ar', 'https://www.anestesiadelvalle.ar'],
    optionsSuccessStatus: 200,
    credentials: true
};

app.use(cors(corsOptions));

// Conexión a la base de datos
mongoose.connect(config.mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

// Cron job para notificaciones de cumpleaños (corre a medianoche hora Argentina)
function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

async function runBirthdayNotifications(overrideDate = null) {
    const now = overrideDate ? new Date(overrideDate) : new Date();

    // Eliminar notificaciones de cumpleaños de días anteriores
    await Notification.deleteMany({
        type: 'birthday',
        createdAt: { $lt: startOfDay(now) }
    });
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const isMarch1InNonLeapYear = month === 3 && day === 1 && !isLeapYear(now.getFullYear());

    let query;
    if (isMarch1InNonLeapYear) {
        query = {
            $expr: {
                $or: [
                    { $and: [{ $eq: [{ $month: '$birthDate' }, 3] }, { $eq: [{ $dayOfMonth: '$birthDate' }, 1] }] },
                    { $and: [{ $eq: [{ $month: '$birthDate' }, 2] }, { $eq: [{ $dayOfMonth: '$birthDate' }, 29] }] }
                ]
            }
        };
    } else {
        query = {
            $expr: {
                $and: [
                    { $eq: [{ $month: '$birthDate' }, month] },
                    { $eq: [{ $dayOfMonth: '$birthDate' }, day] }
                ]
            }
        };
    }

    const birthdayUsers = await User.find({ birthDate: { $exists: true, $ne: null }, ...query });
    if (birthdayUsers.length === 0) {
        console.log('No hay cumpleaños hoy.');
        return [];
    }

    const allUsers = await User.find({});

    for (const birthdayUser of birthdayUsers) {
        await Notification.deleteMany({
            type: 'birthday',
            sender: birthdayUser._id,
            createdAt: { $gte: startOfDay(now) }
        });

        for (const user of allUsers) {
            const isBirthdayPerson = user._id.toString() === birthdayUser._id.toString();
            const message = isBirthdayPerson
                ? 'Muy feliz cumpleaños! Que tengas un hermoso día!'
                : `Hoy es el cumpleaños de ${birthdayUser.username}! No te olvidés de saludarlo!`;

            const notification = new Notification({
                type: 'birthday',
                sender: birthdayUser._id,
                receiver: user._id,
                message,
                status: 'pending'
            });
            await notification.save();
        }
    }

    console.log(`Notificaciones de cumpleaños generadas para ${birthdayUsers.map(u => u.username).join(', ')}`);
    return birthdayUsers.map(u => u.username);
}

cron.schedule('0 0 * * *', () => runBirthdayNotifications().catch(err => console.error('Error en cron de cumpleaños:', err)), { timezone: 'America/Argentina/Buenos_Aires' });

// Definición de rutas
app.use('/auth', authRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/shift-schedule', shiftScheduleRoutes); // Ruta para horarios específicos de guardias

// Ruta para el intercambio de vacaciones
app.use('/vacation-swap', vacationSwapRoutes);

// Ruta para manejar las notificaciones
app.use('/notifications', notificationRoutes);

app.use('/holidays', holidayRoutes); // Rutas para feriados

// Rutas para gestión de roles y permisos
app.use('/', roleRoutes);

// Ruta para consultar disponibilidad
app.get('/availability', getUsersAvailability);

// Ruta para obtener las vacaciones de todos los usuarios
app.get('/vacations', getAllVacations);

app.use('/public', publicRoutes);

app.use('/coverage-requests', coverageRequestRoutes);

app.use('/other-leaves', otherLeaveRoutes);

app.use('/institutions', institutionRoutes);

app.use('/work-sites', workSiteRoutes);

app.use('/extra-assignments', extraAssignmentRoutes);

app.use('/group-periods', groupPeriodRoutes);
app.use('/liquidaciones', liquidacionRoutes);

// Manejador de errores para rutas API no encontradas
app.use('/auth/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de autenticación no encontrada' });
});

app.use('/schedule/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de horarios no encontrada' });
});

app.use('/shift-schedule/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de guardias no encontrada' });
});

app.use('/vacation-swap/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de intercambio de vacaciones no encontrada' });
});

app.use('/notifications/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de notificaciones no encontrada' });
});

app.use('/holidays/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de feriados no encontrada' });
});

app.use('/coverage-requests/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de solicitudes de cobertura no encontrada' });
});

app.use('/other-leaves/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de permisos no encontrada' });
});

app.use('/institutions/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de instituciones no encontrada' });
});

app.use('/work-sites/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de sitios de trabajo no encontrada' });
});

app.use('/extra-assignments/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de asignaciones extra no encontrada' });
});

app.use('/group-periods/*', (req, res) => {
    res.status(404).json({ message: 'Ruta de períodos grupales no encontrada' });
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
