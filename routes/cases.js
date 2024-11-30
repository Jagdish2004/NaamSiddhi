const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');

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

module.exports = router; 