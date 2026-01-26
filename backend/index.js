require('dotenv').config({ path: './backend/.env' });

const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const cors = require('cors');
const helmet = require('helmet');
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

// Trust proxy (Heroku) so req.secure/x-forwarded-proto work correctly
app.enable('trust proxy');

// Force HTTPS: redirect HTTP requests to HTTPS (works with Heroku's x-forwarded-proto)
app.use((req, res, next) => {
    if (req.secure || req.get('x-forwarded-proto') === 'https') return next();
    return res.redirect(301, 'https://' + req.get('host') + req.originalUrl);
});

// Security headers via Helmet
app.use(helmet());

// HSTS: tell browsers to always use HTTPS
app.use(helmet.hsts({
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false
}));

// Basic Content Security Policy - adjust if you rely on external CDNs
app.use(helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "frame-src": ["'none'"]
    }
}));

const corsOptions = {
    origin: ['http://localhost:3000', 'https://advalle-46fc1873b63d.herokuapp.com'],
    optionsSuccessStatus: 200,
    credentials: true
};

app.use(cors(corsOptions));

// Conexión a la base de datos
mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
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

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
