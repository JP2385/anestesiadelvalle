// backend/index.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const cors = require('cors');
const authRoutes = require('./src/app/routes/authRoutes');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(config.mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

app.use('/auth', authRoutes);

app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
