require('dotenv').config({ path: './backend/.env' });

const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const cors = require('cors');
const authRoutes = require('./src/app/routes/authRoutes');
const scheduleRoutes = require('./src/app/routes/scheduleRoutes');
const path = require('path');
const cron = require('node-cron');
const Schedule = require('./src/app/models/scheduleModel'); // Asegúrate de que la ruta sea correcta
const { getUsersAvailability } = require('./src/app/controllers/availabilityController');
const { getAllVacations } = require('./src/app/controllers/vacationController');  // Importa el controlador de vacaciones

const app = express();
app.use(express.json());

const corsOptions = {
    origin: ['http://localhost:3000', 'https://adv-37d5b772f5fd.herokuapp.com'],
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

// Ruta para consultar disponibilidad
app.get('/availability', getUsersAvailability);

// Nueva ruta para obtener las vacaciones de todos los usuarios
app.get('/vacations', getAllVacations);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
