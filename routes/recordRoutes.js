const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Profile = require('../models/profileSchema');
const recordController = require('../controllers/recordController');

// View a specific record - Update to handle both sequential ID and MongoDB _id
router.get('/:id', async (req, res, next) => {
    try {
        let record;
        const { id } = req.params;

        // Check if the ID is a valid MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            // Try to find by MongoDB _id first
            record = await Profile.findById(id)
                .populate({
                    path: 'cases.case',
                    select: 'caseNumber status description location'
                });
        }

        // If not found and the id is a number, try finding by sequential id
        if (!record && !isNaN(id)) {
            record = await Profile.findOne({ id: Number(id) })
                .populate({
                    path: 'cases.case',
                    select: 'caseNumber status description location'
                });
        }

        if (!record) {
            req.flash('error', 'Record not found');
            return res.redirect('/');
        }

        res.render('records/view', { record });
    } catch (error) {
        console.error('Error viewing record:', error);
        next(error);
    }
});

// Edit form for a record
router.get('/:id/edit', recordController.editRecordForm);

// Update a record
router.put('/:id', recordController.updateRecord);

// Delete a record
router.delete('/:id', recordController.deleteRecord);

module.exports = router; 