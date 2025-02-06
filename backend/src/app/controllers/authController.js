// backend/src/app/controllers/authController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const config = require('../../../config');

exports.register = async (req, res) => {
    try {
        let { username, email, password } = req.body;
        username = username.toLowerCase();

        // Verificar si el correo electrónico es válido
        if (!config.validEmails.includes(email)) {
            return res.status(400).send({ message: 'Email is not allowed to register' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send({ message: 'Username already exists' });
        }

        const user = new User({ username, email, password });
        await user.save();
        res.status(201).send({ message: 'User registered successfully' });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        let { username, password } = req.body;
        username = username.toLowerCase();
        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            throw new Error('Invalid username or password');
        }
        const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '6h' });
        res.send({ token });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            throw new Error('User not found');
        }
        res.send(user);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.userId; // Assuming you have middleware to extract userId from JWT

        const user = await User.findById(userId);
        if (!user || !(await user.comparePassword(currentPassword))) {
            throw new Error('Current password is incorrect');
        }

        user.password = newPassword;
        await user.save();
        res.send({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
};

exports.recoverPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Verificar si el correo electrónico es válido
        if (!config.validEmails.includes(email)) {
            return res.status(400).send({ message: 'Email is not allowed for password recovery' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('User with this email does not exist');
        }

        const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '1h' });
        const link = `https://https://advalle-46fc1873b63d.herokuapp.com//reset-password.html?token=${token}`;

        // Configura el transporter de nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.emailUser,
                pass: config.emailPass,
            }
        });

        // Enviar el correo
        const mailOptions = {
            from: config.emailUser,
            to: email,
            subject: 'Password Recovery',
            text: `Click the following link to reset your password: ${link}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).send({ message: 'Error sending email: ' + error.message });
            }
            res.send({ message: 'Password recovery email sent' });
        });

    } catch (error) {
        res.status(400).send({ message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.password = newPassword;
        await user.save();
        res.send({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
};


exports.updateProfile = async (req, res) => {
    try {
        const { userId } = req;
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