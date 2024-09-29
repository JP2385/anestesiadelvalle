const express = require('express');
const { getNotifications, respondToNotification, markAsNotified } = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');  // Middleware de autenticación
const router = express.Router();

// Ruta para obtener todas las notificaciones de un usuario, protegida con el middleware de autenticación
router.get('/', authMiddleware, getNotifications);

// Ruta para responder a una notificación, también protegida
router.post('/respond', authMiddleware, respondToNotification);

// Nueva ruta para marcar una notificación como 'notified'
router.post('/mark-as-notified', authMiddleware, markAsNotified);

module.exports = router;
