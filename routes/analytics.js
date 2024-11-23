const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Analytics dashboard route
router.get('/', analyticsController.getAnalytics);

// Suggestions API route
router.get('/api/suggestions', analyticsController.getSuggestions);

module.exports = router; 