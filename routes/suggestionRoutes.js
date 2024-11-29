const express = require('express');
const router = express.Router();
const Profile = require('../models/profileSchema'); 

router.get('/api/suggestions', async (req, res) => {
    try {
        const { query, type } = req.query;
  
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
  
        const regex = new RegExp(query, 'i'); // Case-insensitive regex for matching

        let filter = {};
        if (type === 'firstName') {
            filter = {
                $or: [
                    { 'firstNameEnglish': regex },
                    { 'firstNameHindi': regex }
                ]
            };
        } else if (type === 'lastName') {
            filter = {
                $or: [
                    { 'lastNameEnglish': regex },
                    { 'lastNameHindi': regex }
                ]
            };
        } else {
            return res.status(400).json({ error: 'Invalid type parameter' });
        }

        const results = await Profile.find(filter)
            .limit(10)
            .select('firstNameEnglish firstNameHindi lastNameEnglish lastNameHindi');
  
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
