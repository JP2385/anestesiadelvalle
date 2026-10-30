const User = require('../models/userModel');
const { FILTRO_ACTIVO } = require('../utils/userFilters');

exports.getPublicUserData = async (req, res) => {
    try {
        // Selecciona solo los campos necesarios
        const users = await User.find(FILTRO_ACTIVO).select('username phoneNumber');
        res.send(users);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};
