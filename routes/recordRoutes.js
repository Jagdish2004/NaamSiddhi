const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

// View a specific record
router.get('/:id', recordController.viewRecord);

// Edit form for a record
router.get('/:id/edit', recordController.editRecordForm);

// Update a record
router.put('/:id', recordController.updateRecord);

// Delete a record
router.delete('/:id', recordController.deleteRecord);

module.exports = router; 