const express = require('express');
const router = express.Router();
const Profile = require('../models/profileSchema');
const Case = require('../models/caseSchema');

router.get('/', async (req, res) => {
    try {
        const { query, type } = req.query;
  
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
  
        const regex = new RegExp(query, 'i');
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
            } else if (type === 'middleName') {
                filter = {
                    $or: [
                        { 'middleNameEnglish': regex },
                        { 'middleNameHindi': regex }
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

            results = await Profile.find(filter)
                .limit(4)
                .select('firstNameEnglish firstNameHindi middleNameEnglish middleNameHindi lastNameEnglish lastNameHindi');
        }

        res.json(results);
    } catch (error) {
        console.error('Error in suggestions route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
