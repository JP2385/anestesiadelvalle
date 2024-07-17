const User = require('../models/userModel');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('username email worksInPublicNeuquen worksInPrivateNeuquen worksInPublicRioNegro worksInPrivateRioNegro'); // Incluye nuevas propiedades en la selección
        res.send(users); // Asegúrate de que esto devuelva un arreglo
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password'); // El usuario es devuelto sin la contraseña
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }
        res.send(user);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.userId; // Obtener userId de los parámetros de la URL
        const updates = req.body;

        console.log(`Updating user with ID: ${userId}`); // Agrega este console.log para verificar el userId

        const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        res.send(user);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
};
