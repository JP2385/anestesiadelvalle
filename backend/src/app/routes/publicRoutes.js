const express = require('express');
const { getPublicUserData } = require('../controllers/publicUserController');
const router = express.Router();

router.get('/public-users', getPublicUserData);

module.exports = router;
