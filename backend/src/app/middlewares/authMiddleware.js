const jwt = require('jsonwebtoken');
const config = require('../../../config');
const User = require('../models/userModel');

module.exports = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).send({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).send({ message: 'Invalid token format' });
    }

    jwt.verify(token, config.jwtSecret, async (err, decoded) => {
        if (err) {
            return res.status(500).send({ message: 'Failed to authenticate token' });
        }

        try {
            // Obtener el usuario completo de la base de datos para incluir el rol
            const user = await User.findById(decoded.userId).select('_id username email role activo');

            if (!user) {
                return res.status(404).send({ message: 'Usuario no encontrado' });
            }

            // El token dura 7 días, así que una baja tiene que cortar también las
            // sesiones ya abiertas y no sólo impedir nuevos logins.
            if (user.activo === false) {
                return res.status(403).send({ message: 'Este usuario está dado de baja.' });
            }

            // Asignar tanto req.userId como req.user para compatibilidad
            req.userId = decoded.userId;  // Mantener compatibilidad con el código existente
            req.user = {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role || 'user'  // Incluir el rol (por defecto 'user')
            };

            next();
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            return res.status(500).send({ message: 'Error de autenticación' });
        }
    });
};
