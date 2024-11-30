const express = require('express');
const router = express.Router();
const Case = require('../../models/caseSchema');
const Profile = require('../../models/profileSchema');
const mongoose = require('mongoose');

// Search route must come BEFORE any routes with :id parameter
router.get('/search', async (req, res) => {
    try {
        const { q: query, caseType, status, priority } = req.query;
        
        let searchQuery = {};

        // Build search query for case number or description
        if (query) {
            searchQuery.$or = [
                { caseNumber: new RegExp(query, 'i') },
                { 'description.english': new RegExp(query, 'i') },
                { 'location.district.english': new RegExp(query, 'i') }
            ];
        }

        if (caseType) searchQuery.caseType = caseType;
        if (status) searchQuery.status = status;
        if (priority) searchQuery.priority = priority;

        console.log('Search Query:', searchQuery); // Debug log

        const cases = await Case.find(searchQuery)
            .select('_id caseNumber caseType status location description profiles')
            .populate('profiles.profile', 'firstNameEnglish lastNameEnglish')
            .sort('-createdAt')
            .limit(10);

        console.log('Found Cases:', cases.length, 'cases'); // Debug log
        res.json({ cases });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get case by ID - Add ObjectId validation
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid case ID format' });
        }

        const case_ = await Case.findById(id)
            .select('_id caseNumber caseType status location description profiles')
            .populate('profiles.profile', 'firstNameEnglish lastNameEnglish');

        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }

        return res.json({
            success: true,
            case: case_
        });
    } catch (error) {
        console.error('Error fetching case:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all cases with pagination and filters
router.get('/cases', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const type = req.query.type;
        const priority = req.query.priority;
        const searchQuery = req.query.q || '';

        let query = {};

        // Apply filters
        if (status) query.status = status;
        if (type) query.caseType = type;
        if (priority) query.priority = priority;
        if (searchQuery) {
            query.$or = [
                { caseNumber: new RegExp(searchQuery, 'i') },
                { 'description.english': new RegExp(searchQuery, 'i') },
                { 'location.city.english': new RegExp(searchQuery, 'i') }
            ];
        }

        const cases = await Case.find(query)
            .populate('profiles.profile', 'id firstNameEnglish lastNameEnglish')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Case.countDocuments(query);

        res.json({
            cases,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total,
                perPage: limit
            }
        });
    } catch (error) {
        console.error('Error fetching cases:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update case status
router.patch('/cases/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const case_ = await Case.findById(req.params.id);

        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }

        case_.status = status;
        case_.timeline.push({
            action: 'STATUS_UPDATED',
            description: {
                english: `Case status updated to ${status}`,
                hindi: `केस की स्थिति ${status} में अपडेट की गई`
            }
        });

        await case_.save();
        res.json(case_);
    } catch (error) {
        console.error('Error updating case status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add profile to case
router.post('/:caseId/profiles', async (req, res) => {
    try {
        const { profileId, role } = req.body;
        const { caseId } = req.params;

        console.log('Linking profile:', { profileId, caseId, role });

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(caseId) || !mongoose.Types.ObjectId.isValid(profileId)) {
            return res.status(400).json({ error: 'Invalid case or profile ID' });
        }

        const case_ = await Case.findById(caseId);
        const profile = await Profile.findById(profileId);

        if (!case_ || !profile) {
            return res.status(404).json({ error: 'Case or Profile not found' });
        }

        // Check if already linked
        if (case_.profiles.some(p => p.profile.toString() === profileId)) {
            return res.status(400).json({ error: 'Profile already connected to this case' });
        }

        // Add profile to case
        case_.profiles.push({
            profile: profileId,
            role,
            addedAt: new Date()
        });

        // Add timeline entry with profile name
        case_.timeline.push({
            action: 'PROFILE_ADDED',
            description: {
                english: `Profile ${profile.firstNameEnglish} ${profile.lastNameEnglish} added as ${role}`,
                hindi: `प्रोफ़ाइल ${profile.firstNameHindi || profile.firstNameEnglish} ${profile.lastNameHindi || profile.lastNameEnglish} को ${role} के रूप में जोड़ा गया`
            },
            date: new Date()
        });

        // Add case to profile
        profile.cases.push({
            case: caseId,
            role,
            addedAt: new Date()
        });

        // Save both documents
        await Promise.all([
            case_.save(),
            profile.save()
        ]);

        console.log('Successfully linked profile to case');

        return res.json({
            success: true,
            message: 'Profile linked successfully',
            case: case_
        });
    } catch (error) {
        console.error('Error linking profile:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Failed to link profile: ' + error.message 
        });
    }
});

// Add evidence to case
router.post('/cases/:id/evidence', async (req, res) => {
    try {
        const { type, description, fileUrl } = req.body;
        const case_ = await Case.findById(req.params.id);

        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }

        case_.evidence.push({
            type,
            description,
            fileUrl
        });

        case_.timeline.push({
            action: 'EVIDENCE_ADDED',
            description: {
                english: `New evidence added: ${description.english}`,
                hindi: `नया सबूत जोड़ा गया: ${description.hindi}`
            }
        });

        await case_.save();
        res.json(case_);
    } catch (error) {
        console.error('Error adding evidence:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Unlink profile route
router.delete('/:caseId/profiles/:profileId', async (req, res) => {
    try {
        const { caseId, profileId } = req.params;
        console.log('Unlink request received:', { caseId, profileId });

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(caseId) || !mongoose.Types.ObjectId.isValid(profileId)) {
            return res.status(400).json({ error: 'Invalid case or profile ID' });
        }

        // Get both documents first
        const case_ = await Case.findById(caseId);
        const profile = await Profile.findById(profileId);

        if (!case_ || !profile) {
            return res.status(404).json({ error: 'Case or Profile not found' });
        }

        console.log('Before removal - Case profiles:', case_.profiles.length);

        // First add timeline entry
        case_.timeline.push({
            action: 'PROFILE_REMOVED',
            description: {
                english: `Profile ${profile.firstNameEnglish} ${profile.lastNameEnglish} was unlinked from case`,
                hindi: `प्रोफ़ाइल ${profile.firstNameHindi || profile.firstNameEnglish} ${profile.lastNameHindi || profile.lastNameEnglish} को केस से अनलिंक किया गया`
            },
            date: new Date()
        });

        // Save timeline update
        await case_.save();

        // Then remove profile from case using atomic operation
        const updatedCase = await Case.findByIdAndUpdate(
            caseId,
            {
                $pull: { 
                    profiles: { profile: profileId } 
                }
            },
            { 
                new: true, // Return updated document
                runValidators: true // Run schema validations
            }
        ).populate('profiles.profile', 'firstNameEnglish lastNameEnglish');

        // Remove case from profile using atomic operation
        await Profile.findByIdAndUpdate(
            profileId,
            {
                $pull: { 
                    cases: { case: caseId } 
                }
            },
            {
                runValidators: true
            }
        );

        console.log('After removal - Case profiles:', updatedCase.profiles.length);

        // Fetch the final updated case to ensure we have the latest data
        const finalCase = await Case.findById(caseId)
            .populate('profiles.profile', 'firstNameEnglish lastNameEnglish');

        // Return the updated case data
        return res.json({
            success: true,
            message: 'Profile unlinked successfully',
            case: finalCase
        });
    } catch (error) {
        console.error('Error unlinking profile:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to unlink profile: ' + error.message
        });
    }
});

module.exports = router; 