const express = require('express');
const router = express.Router();
const Profile = require('../models/profileSchema');

router.get('/', async (req, res) => {
    try {
        const { query, type } = req.query;
        
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const regex = new RegExp(query, 'i');
        let filter = {};

        if (type === 'firstName') {
            filter = {
                $or: [
                    { firstNameEnglish: regex },
                    { firstNameHindi: regex }
                ]
            };
        } else if (type === 'lastName') {
            filter = {
                $or: [
                    { lastNameEnglish: regex },
                    { lastNameHindi: regex }
                ]
            };
        } else {
            return res.status(400).json({ error: 'Invalid type parameter' });
        }

        const suggestions = await Profile.find(filter)
            .select('firstNameEnglish firstNameHindi lastNameEnglish lastNameHindi')
            .limit(10);

        console.log('Suggestions found:', suggestions); // Debug log
        res.json(suggestions);
    } catch (error) {
        console.error('Error in suggestions route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
