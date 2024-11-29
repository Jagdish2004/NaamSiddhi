const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');

// Search routes (place these before /:id route to avoid conflicts)
router.get('/search', caseController.renderSearchPage);
router.get('/api/search', caseController.searchCases);

// Route to show the form for creating a new case
router.get('/new', caseController.renderNewCaseForm);

// Route to handle the creation of a new case
router.post('/', caseController.handleFormSubmission);

// Route to view a case
router.get('/:id', caseController.viewCase);

// Route to add a profile to a case
router.post('/:caseId/profiles', caseController.addProfileToCase);

// Route to remove a profile from a case
router.delete('/:caseId/profiles/:profileId', caseController.removeProfileFromCase);

module.exports = router; 