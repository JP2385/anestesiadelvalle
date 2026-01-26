const User = require('../models/userModel');

exports.getPublicUserData = async (req, res) => {
    try {
        // Selecciona solo los campos necesarios
        const users = await User.find().select('username phoneNumber');
        res.send(users);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};
