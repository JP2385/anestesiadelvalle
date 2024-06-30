// backend/src/app/middlewares/authMiddleware.js
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

        req.userId = decoded.userId;
        next();
    });
};
