require('dotenv').config({ path: './backend/.env' });

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

const app = express();
app.use(express.json());

const corsOptions = {
    origin: ['http://localhost:3000', 'https://advalle-46fc1873b63d.herokuapp.com/'],
    optionsSuccessStatus: 200,
    credentials: true
};

app.use(cors(corsOptions));

// Conexión a la base de datos
mongoose.connect(config.mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

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

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
