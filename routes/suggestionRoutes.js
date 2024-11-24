const express = require('express');
const router = express.Router();
const { getNameSuggestions, getLocationSuggestions } = require('../utils/suggestions');

// Get name suggestions
router.get('/names', async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    
    const suggestions = await getNameSuggestions(q);
    res.json(suggestions);
});

// Get location suggestions
router.get('/locations', async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    
    const suggestions = await getLocationSuggestions(q);
    res.json(suggestions);
});

module.exports = router; 