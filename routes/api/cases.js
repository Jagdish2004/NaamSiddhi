const express = require('express');
const router = express.Router();
const Case = require('../../models/caseSchema');

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

// Get case by ID
router.get('/cases/:id', async (req, res) => {
    try {
        const case_ = await Case.findById(req.params.id)
            .populate('profiles.profile')
            .populate('assignedOfficers.officer');

        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }

        res.json(case_);
    } catch (error) {
        console.error('Error fetching case:', error);
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
router.post('/cases/:id/profiles', async (req, res) => {
    try {
        const { profileId, role } = req.body;
        const case_ = await Case.findById(req.params.id);

        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }

        // Check if profile is already connected
        if (case_.profiles.some(p => p.profile.toString() === profileId)) {
            return res.status(400).json({ error: 'Profile already connected to this case' });
        }

        case_.profiles.push({
            profile: profileId,
            role
        });

        case_.timeline.push({
            action: 'PROFILE_ADDED',
            description: {
                english: `New profile added with role: ${role}`,
                hindi: `नई प्रोफ़ाइल जोड़ी गई, भूमिका: ${role}`
            }
        });

        await case_.save();

        // Update profile's cases array
        await Profile.findByIdAndUpdate(profileId, {
            $push: {
                cases: {
                    case: case_._id,
                    role
                }
            }
        });

        res.json(case_);
    } catch (error) {
        console.error('Error adding profile to case:', error);
        res.status(500).json({ error: 'Internal server error' });
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

module.exports = router; 