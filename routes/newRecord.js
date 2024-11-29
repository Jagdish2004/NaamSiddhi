const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

// Render the form for creating a new record
router.get('/', recordController.createRecord);

// Handle the POST request to save the record
router.post('/', recordController.saveRecord);

// Handle the POST request to submit the record
router.post('/submit', recordController.submitRecord);

// New route for creating profile from case form
router.post('/case/:caseId', recordController.createProfileForCase);

module.exports = router;
