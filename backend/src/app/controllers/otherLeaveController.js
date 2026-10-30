const User = require('../models/userModel');
const { FILTRO_ACTIVO } = require('../utils/userFilters');

// Obtener las otras licencias de todos los usuarios
const getAllOtherLeaves = async (req, res) => {
    try {
        // Buscar todos los usuarios y traer username + otherLeaves
        const users = await User.find(FILTRO_ACTIVO, 'username otherLeaves');

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las otras licencias', error });
    }
};

module.exports = {
    getAllOtherLeaves
};
