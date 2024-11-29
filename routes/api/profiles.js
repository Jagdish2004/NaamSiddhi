const express = require('express');
const router = express.Router();
const Profile = require('../../models/profileSchema');

// Get all profiles (with pagination)
router.get('/profiles', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchQuery = req.query.q || '';

        const query = searchQuery ? {
            $or: [
                { firstNameEnglish: new RegExp(searchQuery, 'i') },
                { lastNameEnglish: new RegExp(searchQuery, 'i') },
                { firstNameHindi: new RegExp(searchQuery, 'i') },
                { lastNameHindi: new RegExp(searchQuery, 'i') },
                { mNumber: new RegExp(searchQuery, 'i') }
            ]
        } : {};

        const profiles = await Profile.find(query)
            .select('id firstNameEnglish lastNameEnglish firstNameHindi lastNameHindi role status')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Profile.countDocuments(query);

        res.json({
            profiles,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total,
                perPage: limit
            }
        });
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get profile by ID
router.get('/profiles/:id', async (req, res) => {
    try {
        const profile = await Profile.findOne({ id: req.params.id })
            .populate('cases.case', 'caseNumber status');

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search profiles with advanced filters
router.post('/profiles/search', async (req, res) => {
    try {
        const {
            name,
            age,
            gender,
            location,
            appearance,
            dateRange,
            status
        } = req.body;

        let query = {};

        // Build query based on provided filters
        if (name) {
            query.$or = [
                { firstNameEnglish: new RegExp(name, 'i') },
                { lastNameEnglish: new RegExp(name, 'i') },
                { firstNameHindi: new RegExp(name, 'i') },
                { lastNameHindi: new RegExp(name, 'i') }
            ];
        }

        if (gender) query.gender = gender;
        if (status) query.status = status;

        // Age filter
        if (age) {
            const today = new Date();
            const birthYear = today.getFullYear() - age;
            query.dob = {
                $gte: new Date(birthYear - 1, today.getMonth(), today.getDate()),
                $lte: new Date(birthYear + 1, today.getMonth(), today.getDate())
            };
        }

        // Location filter
        if (location) {
            query.$or = [
                { 'address.cityEnglish': new RegExp(location, 'i') },
                { 'address.districtEnglish': new RegExp(location, 'i') },
                { 'address.stateEnglish': new RegExp(location, 'i') }
            ];
        }

        // Appearance filters
        if (appearance) {
            if (appearance.height) query['appearance.height'] = appearance.height;
            if (appearance.complexion) query['appearance.complexion'] = appearance.complexion;
            if (appearance.build) query['appearance.build'] = appearance.build;
        }

        // Date range filter
        if (dateRange) {
            query.createdAt = {
                $gte: new Date(dateRange.start),
                $lte: new Date(dateRange.end)
            };
        }

        const profiles = await Profile.find(query)
            .select('id firstNameEnglish lastNameEnglish status createdAt')
            .sort('-createdAt');

        res.json(profiles);
    } catch (error) {
        console.error('Error searching profiles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 