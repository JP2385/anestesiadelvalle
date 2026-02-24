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
        const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '7d' });
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
        const link = `${config.baseUrl}/reset-password.html?token=${token}`;

        // Configura el transporter de nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.emailUser,
                pass: config.emailPass,
            },
            secure: true,
            pool: true,
            maxConnections: 5,
            maxMessages: 10,
            tls: {
                rejectUnauthorized: false
            },
            debug: false
        });

        // Enviar el correo
        const mailOptions = {
            from: `"Anestesiólogos del Valle" <${config.emailUser}>`,
            replyTo: config.emailUser,
            to: email,
            subject: 'Recuperación de Contraseña - Anestesiólogos del Valle',
            headers: {
                'X-Entity-Ref-ID': `password-reset-${Date.now()}`,
                'X-Priority': '1',
                'Importance': 'high'
            },
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 20px; background-color: #f4f4f4;">
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
                        <h2 style="color: #0056b3; margin-top: 0;">Recuperación de Contraseña</h2>
                        <p style="color: #333; line-height: 1.6;">Hola,</p>
                        <p style="color: #333; line-height: 1.6;">Recibiste este correo porque solicitaste restablecer tu contraseña en <strong>Anestesiólogos del Valle</strong>.</p>
                        <p style="color: #333; line-height: 1.6;">Para continuar, haz clic en el siguiente botón:</p>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${link}" 
                               style="background-color: #0056b3; color: white; padding: 14px 35px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                Restablecer mi Contraseña
                            </a>
                        </div>
                        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
                            <p style="color: #856404; margin: 0; font-size: 14px;">
                                <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por tu seguridad.
                            </p>
                        </div>
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            Si no solicitaste este cambio, ignora este correo y tu contraseña permanecerá sin cambios.
                        </p>
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px; line-height: 1.6;">
                            Si el botón no funciona, copia y pega esta URL en tu navegador:<br>
                            <span style="color: #0056b3; word-break: break-all;">${link}</span>
                        </p>
                        <p style="color: #999; font-size: 11px; margin-top: 30px;">
                            Este correo fue enviado automáticamente desde Anestesiólogos del Valle.<br>
                            Por favor no respondas a este mensaje.
                        </p>
                    </div>
                </body>
                </html>
            `,
            text: `Recuperación de Contraseña - Anestesiólogos del Valle

Hola,

Recibiste este correo porque solicitaste restablecer tu contraseña en Anestesiólogos del Valle.

Para continuar, copia y pega el siguiente enlace en tu navegador:
${link}

⚠️ IMPORTANTE: Este enlace expirará en 1 hora por tu seguridad.

Si no solicitaste este cambio, ignora este correo y tu contraseña permanecerá sin cambios.

---
Este correo fue enviado automáticamente desde Anestesiólogos del Valle.
Por favor no respondas a este mensaje.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send({ 
                    message: 'Error sending email: ' + error.message,
                    details: error.code || 'Unknown error'
                });
            }
            console.log('Email sent successfully:', info.messageId);
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
        await user.save({ validateBeforeSave: false });
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