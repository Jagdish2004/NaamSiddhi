const express = require('express');
const router = express.Router();
const Profile = require('../models/profileSchema');
const Case = require('../models/caseSchema');

router.get('/', async (req, res) => {
    try {
        console.log('Received suggestion request:', req.query);
        const { query, type } = req.query;
  
        if (!query) {
            console.log('No query provided');
            return res.status(400).json({ error: 'Query parameter is required' });
        }
  
        const regex = new RegExp(query, 'i'); // Case-insensitive regex for matching
        console.log('Searching with regex:', regex);

        let results;

        if (type === 'caseNumber') {
            // Search for case numbers
            results = await Case.find({ caseNumber: regex })
                .select('caseNumber description location')
                .limit(4);
        } else {
            // Profile search
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
                console.log('Invalid type:', type);
                return res.status(400).json({ error: 'Invalid type parameter' });
            }

            console.log('Using filter:', filter);

            results = await Profile.find(filter)
                .limit(4)
                .select('firstNameEnglish firstNameHindi lastNameEnglish lastNameHindi');
        }

        console.log('Found results:', results.length);
        res.json(results);
    } catch (error) {
        console.error('Error in suggestions route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
