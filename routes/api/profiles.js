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

        // Add timeline entry to case
        case_.timeline.push({
            action: 'PROFILE_ADDED',
            description: {
                english: `Profile ${profile.firstNameEnglish} ${profile.lastNameEnglish} added as ${role}`,
                hindi: `प्रोफ़ाइल ${profile.firstNameHindi || profile.firstNameEnglish} ${profile.lastNameHindi || profile.lastNameEnglish} को ${role} के रूप में जोड़ा गया`
            },
            date: new Date()
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

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(profileId) || !mongoose.Types.ObjectId.isValid(caseId)) {
            return res.status(400).json({ error: 'Invalid profile or case ID' });
        }

        // Get both documents first
        const profile = await Profile.findById(profileId);
        const case_ = await Case.findById(caseId);

        if (!profile || !case_) {
            return res.status(404).json({ error: 'Profile or Case not found' });
        }

        // Remove case from profile
        profile.cases = profile.cases.filter(c => c.case.toString() !== caseId);

        // Remove profile from case
        case_.profiles = case_.profiles.filter(p => p.profile.toString() !== profileId);

        // Add timeline entry to case
        case_.timeline.push({
            action: 'PROFILE_REMOVED',
            description: {
                english: `Profile ${profile.firstNameEnglish} ${profile.lastNameEnglish} was unlinked from case`,
                hindi: `प्रोफ़ाइल ${profile.firstNameHindi || profile.firstNameEnglish} ${profile.lastNameHindi || profile.lastNameEnglish} को केस से अनलिंक किया गया`
            },
            date: new Date()
        });

        // Save both documents
        await Promise.all([
            profile.save(),
            case_.save()
        ]);

        // Return updated case data
        return res.json({ 
            success: true,
            message: 'Profile unlinked successfully',
            case: await Case.findById(caseId).populate('profiles.profile')
        });
    } catch (error) {
        console.error('Error unlinking case:', error);
        return res.status(500).json({ error: 'Failed to unlink case' });
    }
});

// Search profiles by name
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.json({ profiles: [] });
        }

        // Check if query is a number (ID search)
        if (/^\d+$/.test(q)) {
            const profile = await Profile.findOne({ id: parseInt(q) })
                .select('id firstNameEnglish middleNameEnglish lastNameEnglish firstNameHindi middleNameHindi lastNameHindi');
            
            return res.json({ 
                profiles: profile ? [profile] : [] 
            });
        }

        // Name search
        const regex = new RegExp(q, 'i');
        const profiles = await Profile.find({
            $or: [
                { firstNameEnglish: regex },
                { middleNameEnglish: regex },
                { lastNameEnglish: regex },
                { firstNameHindi: regex },
                { middleNameHindi: regex },
                { lastNameHindi: regex }
            ]
        })
        .select('id firstNameEnglish middleNameEnglish lastNameEnglish firstNameHindi middleNameHindi lastNameHindi')
        .limit(10);

        res.json({ profiles });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Add this route to check Aadhar number existence
router.get('/check-aadhar', async (req, res) => {
    try {
        const { aadharNumber } = req.query;
        
        if (!aadharNumber || !/^\d{12}$/.test(aadharNumber)) {
            return res.status(400).json({ error: 'Invalid Aadhar number format' });
        }

        const profile = await Profile.findOne({ aadharNumber });
        res.json({ exists: !!profile });
    } catch (error) {
        console.error('Error checking Aadhar number:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 