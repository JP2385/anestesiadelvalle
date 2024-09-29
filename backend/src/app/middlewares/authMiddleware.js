const jwt = require('jsonwebtoken');
const config = require('../../../config');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).send({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).send({ message: 'Invalid token format' });
    }

    jwt.verify(token, config.jwtSecret, (err, decoded) => {
        if (err) {
            return res.status(500).send({ message: 'Failed to authenticate token' });
        }

        // Asignar tanto req.userId como req.user._id para compatibilidad
        req.userId = decoded.userId;  // Mantener compatibilidad con el código existente
        req.user = { _id: decoded.userId };  // Añadir compatibilidad con req.user._id
        console.log('Usuario autenticado ID:', req.user._id);  // Log para verificar el IDs
        next();
    });
};
