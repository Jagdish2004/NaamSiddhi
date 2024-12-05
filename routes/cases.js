const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const Case = require('../models/caseSchema');
const Profile = require('../models/profileSchema');

// Important: Order matters! Put static routes before dynamic routes
router.get('/search', caseController.renderSearchPage);
router.get('/new', caseController.renderNewCaseForm);
router.post('/', caseController.handleFormSubmission);

// API routes for search
router.get('/api/search', caseController.searchCases);

// Dynamic routes with parameters should come last
router.get('/:id([0-9a-fA-F]{24})', caseController.viewCase);
router.post('/:caseId/profiles', caseController.addProfileToCase);
router.delete('/:caseId/profiles/:profileId', caseController.removeProfileFromCase);

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