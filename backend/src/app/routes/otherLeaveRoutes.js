const express = require('express');
const router = express.Router();
const { getAllOtherLeaves } = require('../controllers/otherLeaveController');

router.get('/', getAllOtherLeaves);

module.exports = router;
