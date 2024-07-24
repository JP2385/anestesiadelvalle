require('dotenv').config({ path: './backend/.env' }); 

const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const cors = require('cors');
const authRoutes = require('./src/app/routes/authRoutes');
const path = require('path');
const { getUsersAvailability } = require('./src/app/controllers/availabilityController');

const app = express();
app.use(express.json());

const corsOptions = {
    origin: 'https://adv-37d5b772f5fd.herokuapp.com', // Cambia esto a tu dominio frontend si es necesario
    optionsSuccessStatus: 200,
    credentials: true // Permitir el envío de credenciales (autenticación)
};

app.use(cors(corsOptions));

mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

app.use('/auth', authRoutes);

// Definir la ruta para obtener la disponibilidad de los usuarios
app.get('/availability', getUsersAvailability);

app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
