const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

// Render the form for creating a new record
router.get('/', recordController.createRecord);

// Handle the POST request to save the record
router.post('/', recordController.saveRecord);

module.exports = router;
