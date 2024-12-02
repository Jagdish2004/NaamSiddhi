const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Profile = require('../models/profileSchema');
const recordController = require('../controllers/recordController');
const Case = require('../models/caseSchema');

// View a specific record - Update to handle both sequential ID and MongoDB _id
router.get('/:id', async (req, res, next) => {
    try {
        let record;
        const { id } = req.params;

        const populateOptions = {
            path: 'cases.case',
            select: 'caseNumber status description location',
            populate: [
                {
                    path: 'location.district',
                    select: 'english hindi'
                },
                {
                    path: 'location.state',
                    select: 'english hindi'
                }
            ]
        };

        if (mongoose.Types.ObjectId.isValid(id)) {
            record = await Profile.findById(id).populate(populateOptions);
        } else if (!isNaN(id)) {
            record = await Profile.findOne({ id: Number(id) }).populate(populateOptions);
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

// Add this route
router.post('/:id/link-case', async (req, res) => {
    try {
        const { id } = req.params;
        const { caseNumber, role } = req.body;

        // Find the profile
        const profile = await Profile.findOne({ id });
        if (!profile) {
            req.flash('error', 'Profile not found');
            return res.redirect('back');
        }

        // Find the case
        const case_ = await Case.findOne({ caseNumber });
        if (!case_) {
            req.flash('error', 'Case not found');
            return res.redirect('back');
        }

        // Link profile to case
        await Profile.findByIdAndUpdate(profile._id, {
            $addToSet: {
                cases: {
                    case: case_._id,
                    role
                }
            }
        });

        // Link case to profile
        await Case.findByIdAndUpdate(case_._id, {
            $addToSet: {
                profiles: {
                    profile: profile._id,
                    role
                }
            }
        });

        req.flash('success', 'Profile linked to case successfully');
        res.redirect('back');
    } catch (error) {
        console.error('Error linking case:', error);
        req.flash('error', 'Failed to link case');
        res.redirect('back');
    }
});

// Add this route for unlinking cases
router.post('/:id/unlink-case/:caseId', async (req, res) => {
    try {
        const { id, caseId } = req.params;

        // Find the profile
        const profile = await Profile.findOne({ id });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Find the case
        const case_ = await Case.findById(caseId);
        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }

        // Remove case from profile
        await Profile.findByIdAndUpdate(profile._id, {
            $pull: {
                cases: {
                    case: case_._id
                }
            }
        });

        // Remove profile from case
        await Case.findByIdAndUpdate(case_._id, {
            $pull: {
                profiles: {
                    profile: profile._id
                }
            }
        });

        res.json({ success: true, message: 'Case unlinked successfully' });
    } catch (error) {
        console.error('Error unlinking case:', error);
        res.status(500).json({ error: 'Failed to unlink case' });
    }
});

module.exports = router; 