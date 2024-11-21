const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.post('/profile', settingsController.updateProfile);
router.post('/password', settingsController.updatePassword);
router.post('/notifications', settingsController.updateNotifications);

module.exports = router; 