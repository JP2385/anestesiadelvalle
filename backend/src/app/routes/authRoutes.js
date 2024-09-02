// backend/src/app/routes/authRoutes.js
const express = require('express');
const { register, login, changePassword, getProfile, recoverPassword, resetPassword } = require('../controllers/authController');
const { getAllUsers, updateUser, getUserById } = require('../controllers/userController');
const { getUsersAvailability } = require('../controllers/availabilityController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/recover-password', recoverPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authMiddleware, changePassword);
router.get('/profile', authMiddleware, getProfile);
router.get('/user/:userId', authMiddleware, getUserById);
router.put('/user/:userId', authMiddleware, updateUser);

// Rutas de administración
router.get('/users', authMiddleware, getAllUsers);
router.get('/availability', authMiddleware, getUsersAvailability);

module.exports = router;
