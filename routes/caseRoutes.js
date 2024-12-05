const express = require('express');
const router = express.Router();
const Case = require('../models/caseSchema');
const Profile = require('../models/profileSchema');

// Link profile to case
router.post('/:caseId/link-profile', async (req, res) => {
    try {
        const { caseId } = req.params;
        const { profileId, role } = req.body;

        const case_ = await Case.findById(caseId);
        const profile = await Profile.findById(profileId);

        if (!case_ || !profile) {
            return res.status(404).json({ error: 'Case or Profile not found' });
        }

        // Check if profile is already linked
        if (case_.profiles.some(p => p.profile.toString() === profileId)) {
            return res.status(400).json({ error: 'Profile already linked to this case' });
        }

        // Add profile to case
        case_.profiles.push({
            profile: profileId,
            role,
            addedAt: new Date()
        });

        // Add case to profile
        profile.cases.push({
            case: caseId,
            role,
            addedAt: new Date()
        });

        await Promise.all([case_.save(), profile.save()]);

        res.json({ success: true, message: 'Profile linked successfully' });
    } catch (error) {
        console.error('Error linking profile:', error);
        res.status(500).json({ error: 'Failed to link profile' });
    }
});

// Unlink profile from case
router.delete('/:caseId/unlink-profile/:profileId', async (req, res) => {
    try {
        const { caseId, profileId } = req.params;

        await Promise.all([
            Case.findByIdAndUpdate(caseId, {
                $pull: { profiles: { profile: profileId } }
            }),
            Profile.findByIdAndUpdate(profileId, {
                $pull: { cases: { case: caseId } }
            })
        ]);

        res.json({ success: true, message: 'Profile unlinked successfully' });
    } catch (error) {
        console.error('Error unlinking profile:', error);
        res.status(500).json({ error: 'Failed to unlink profile' });
    }
});

// Update case status
router.patch('/:caseId/status', async (req, res) => {
    try {
        const { caseId } = req.params;
        const { status } = req.body;

        const case_ = await Case.findById(caseId);
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
        res.json({ success: true, message: 'Case status updated successfully' });
    } catch (error) {
        console.error('Error updating case status:', error);
        res.status(500).json({ error: 'Failed to update case status' });
    }
});

module.exports = router; 