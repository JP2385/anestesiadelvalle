const User = require('../models/userModel');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('username email beginningDate phoneNumber doesCardio doesPediatrics doesRNM doesShifts worksInPrivateRioNegro worksInPublicRioNegro worksInPrivateNeuquen worksInPublicNeuquen workSchedule vacations otherLeaves worksInCmacOnly defaultAssignments');
        res.send(users);
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

        const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        res.send(user);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
};

exports.updateDefaultAssignments = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { defaultAssignments } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { defaultAssignments },
            { new: true, runValidators: true }
        ).select('username defaultAssignments');

        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        res.send({
            success: true,
            message: 'Default assignments updated successfully',
            user
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            message: error.message
        });
    }
};
