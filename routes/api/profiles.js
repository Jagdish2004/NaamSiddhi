const express = require('express');
const router = express.Router();
const Profile = require('../../models/profileSchema');
const Case = require('../../models/caseSchema');
const mongoose = require('mongoose');

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

// Add this route
router.get('/suggestions', async (req, res) => {
    try {
        const { type, query } = req.query;
        if (!query || query.length < 2) {
            return res.json([]);
        }

        let searchField = type === 'firstName' ? 'firstNameEnglish' : 'lastNameEnglish';
        let searchQuery = {};
        searchQuery[searchField] = new RegExp('^' + query, 'i');

        const suggestions = await Profile.find(searchQuery)
            .select('firstNameEnglish firstNameHindi lastNameEnglish lastNameHindi')
            .limit(5);

        res.json(suggestions);
    } catch (error) {
        console.error('Error getting suggestions:', error);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});

// Add case to profile
router.post('/:profileId/cases', async (req, res) => {
    try {
        const { profileId } = req.params;
        const { caseId, role } = req.body;

        console.log('Received link request:', { profileId, caseId, role });

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(profileId) || !mongoose.Types.ObjectId.isValid(caseId)) {
            return res.status(400).json({ error: 'Invalid profile or case ID' });
        }

        const profile = await Profile.findById(profileId);
        const case_ = await Case.findById(caseId);

        if (!profile || !case_) {
            return res.status(404).json({ error: 'Profile or Case not found' });
        }

        // Check if already linked
        const isAlreadyLinked = profile.cases.some(c => c.case?.toString() === caseId);
        if (isAlreadyLinked) {
            return res.status(400).json({ error: 'Case already linked to this profile' });
        }

        // Add case to profile
        profile.cases.push({
            case: caseId,
            role,
            addedAt: new Date()
        });

        // Add profile to case
        case_.profiles.push({
            profile: profileId,
            role,
            addedAt: new Date()
        });

        // Save both documents
        await Promise.all([
            profile.save(),
            case_.save()
        ]);

        console.log('Successfully linked case to profile');

        return res.json({
            success: true,
            message: 'Case linked successfully',
            profile: profile._id,
            case: case_._id
        });

    } catch (error) {
        console.error('Error linking case:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to link case: ' + error.message
        });
    }
});

// Remove case from profile
router.delete('/:profileId/cases/:caseId', async (req, res) => {
    try {
        const { profileId, caseId } = req.params;

        await Promise.all([
            Profile.findByIdAndUpdate(profileId, {
                $pull: { cases: { case: caseId } }
            }),
            Case.findByIdAndUpdate(caseId, {
                $pull: { profiles: { profile: profileId } }
            })
        ]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error unlinking case:', error);
        res.status(500).json({ error: 'Failed to unlink case' });
    }
});

module.exports = router; 