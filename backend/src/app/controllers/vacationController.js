const User = require('../models/userModel');  // Asegúrate de que la ruta al modelo sea correcta
const { FILTRO_ACTIVO } = require('../utils/userFilters');

// Función para obtener las vacaciones de todos los usuarios
const getAllVacations = async (req, res) => {
    try {
        // Buscar todos los usuarios y solo traer la propiedad 'username' y 'vacations'
        const users = await User.find(FILTRO_ACTIVO, 'username vacations');
        
        // Enviar la respuesta con los usuarios y sus vacaciones
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las vacaciones', error });
    }
};

module.exports = {
    getAllVacations
};
