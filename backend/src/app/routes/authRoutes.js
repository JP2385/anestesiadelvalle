// backend/src/app/routes/authRoutes.js
const express = require('express');
const { register, login, changePassword, getProfile, recoverPassword, resetPassword } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/recover-password', recoverPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authMiddleware, changePassword);
router.get('/profile', getProfile);

module.exports = router;
