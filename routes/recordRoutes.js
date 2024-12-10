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
            select: 'caseNumber status description location profiles',
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
            record = await Profile.findById(id)
                .populate(populateOptions)
                .lean();
        } else if (!isNaN(id)) {
            record = await Profile.findOne({ id: Number(id) })
                .populate(populateOptions)
                .lean();
        }

        if (!record) {
            req.flash('error', 'Record not found');
            return res.redirect('/');
        }

        // Ensure all case details are properly populated
        if (record.cases) {
            record.cases = record.cases.map(caseLink => {
                const caseData = caseLink.case;
                return {
                    ...caseLink,
                    case: {
                        ...caseData,
                        description: caseData.description || { english: '', hindi: '' },
                        location: caseData.location || {}
                    }
                };
            });
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
        const { 
            caseNumber, 
            role, 
            details,
            articles,
            arrestDetails,
            courtDetails 
        } = req.body;

        // Find the profile
        const profile = await Profile.findOne({ id });
        if (!profile) {
            return res.status(400).json({ error: 'Profile not found' });
        }

        // Find the case
        const case_ = await Case.findOne({ caseNumber });
        if (!case_) {
            return res.status(400).json({ error: 'Case not found' });
        }

        // Check if already linked
        const isAlreadyLinked = profile.cases.some(c => c.case?.toString() === case_._id.toString());
        if (isAlreadyLinked) {
            return res.status(400).json({ error: 'Case is already linked to this profile' });
        }

        // Add timeline entry to case
        case_.timeline.push({
            action: 'PROFILE_LINKED',
            description: {
                english: `Profile ${profile.firstNameEnglish} ${profile.lastNameEnglish} linked as ${role}`,
                hindi: `प्रोफ़ाइल ${profile.firstNameHindi || profile.firstNameEnglish} ${profile.lastNameHindi || profile.lastNameEnglish} को ${role} के रूप में जोड़ा गया`
            },
            date: new Date()
        });

        // Prepare profile data for case
        const profileData = {
            profile: profile._id,
            role,
            addedAt: new Date()
        };

        // Add additional fields if they exist
        if (details) profileData.details = details;
        if (articles && articles.length > 0) profileData.articles = articles;
        if (arrestDetails && arrestDetails.isArrested) {
            profileData.arrestDetails = {
                isArrested: true,
                arrestDate: arrestDetails.arrestDate,
                arrestLocation: {
                    english: typeof arrestDetails.arrestLocation === 'string' 
                        ? arrestDetails.arrestLocation 
                        : arrestDetails.arrestLocation.english || '',
                    hindi: typeof arrestDetails.arrestLocation === 'string'
                        ? ''
                        : arrestDetails.arrestLocation.hindi || ''
                },
                arrestingOfficer: arrestDetails.arrestingOfficer
            };
        }
        if (courtDetails) {
            profileData.courtDetails = {
                courtName: courtDetails.courtName,
                caseNumber: courtDetails.caseNumber,
                nextHearingDate: courtDetails.nextHearingDate,
                judgeName: courtDetails.judgeName,
                status: courtDetails.status
            };
        }

        // Add profile to case's profiles array with all details
        case_.profiles.push(profileData);

        // Prepare case data for profile
        const caseData = {
            case: case_._id,
            role,
            addedAt: new Date()
        };

        // Add the same details to the profile's case reference
        if (details) caseData.details = details;
        if (articles && articles.length > 0) caseData.articles = articles;
        if (arrestDetails && arrestDetails.isArrested) {
            caseData.arrestDetails = {
                isArrested: true,
                arrestDate: arrestDetails.arrestDate,
                arrestLocation: {
                    english: typeof arrestDetails.arrestLocation === 'string' 
                        ? arrestDetails.arrestLocation 
                        : arrestDetails.arrestLocation.english || '',
                    hindi: typeof arrestDetails.arrestLocation === 'string'
                        ? ''
                        : arrestDetails.arrestLocation.hindi || ''
                },
                arrestingOfficer: arrestDetails.arrestingOfficer
            };
        }
        if (courtDetails) {
            caseData.courtDetails = {
                courtName: courtDetails.courtName,
                caseNumber: courtDetails.caseNumber,
                nextHearingDate: courtDetails.nextHearingDate,
                judgeName: courtDetails.judgeName,
                status: courtDetails.status
            };
        }

        // Link profile to case with all details
        await Profile.findByIdAndUpdate(profile._id, {
            $addToSet: {
                cases: caseData
            }
        });

        // Save case with timeline and profile updates
        await case_.save();

        return res.json({ success: true, message: 'Case linked successfully' });
    } catch (error) {
        console.error('Error linking case:', error);
        return res.status(500).json({ error: 'Failed to link case' });
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