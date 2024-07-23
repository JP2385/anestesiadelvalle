const express = require('express');
const app = express();
const port = 3000;

// Importar la función getUsersAvailability desde availabilityController.js
const { getUsersAvailability } = require('./backend/src/app/controllers/availabilityController');

// Definir la ruta para obtener la disponibilidad de los usuarios
app.get('/availability', getUsersAvailability);

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
