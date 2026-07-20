const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.put('/', authenticateToken, settingsController.updateSettings);

module.exports = router;
