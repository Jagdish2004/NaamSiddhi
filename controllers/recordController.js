const mongoose = require('mongoose');
const Profile = require('../models/profileSchema');
const { getSoundex } = require('../utils/soundex');
const { handleUpload } = require('../utils/cloudinary');
const { 
    detectHindiScript, 
    transliterateToHindi, 
    transliterateToEnglish, 
    translateToHindi,
    translateToEnglish
} = require('../utils/translator');

// Helper function to process bilingual fields
async function processField(text, fieldType = 'text') {
    if (!text) return { english: '', hindi: '' };
    
    try {
        const isHindi = detectHindiScript(text);
        let english, hindi;

        if (isHindi) {
            hindi = text;
            if (fieldType === 'name') {
                english = await transliterateToEnglish(text, 'name');
            } else {
                english = await translateToEnglish(text);
            }
        } else {
            english = text;
            if (fieldType === 'name') {
                hindi = await transliterateToHindi(text, 'name');
            } else {
                hindi = await translateToHindi(text);
            }
        }

        return {
            english: english.trim(),
            hindi: hindi.trim()
        };
    } catch (error) {
        console.error(`Error processing field ${fieldType}:`, error);
        return {
            english: text.trim(),
            hindi: text.trim()
        };
    }
}

module.exports = {
    createRecord: (req, res) => {
        res.render('records/new.ejs');
    },

    saveRecord: [handleUpload, async (req, res) => {
        try {
            // Store uploaded files in session
            if (req.processedFiles) {
                req.session.uploadedFiles = req.processedFiles;
            }

            const formData = {
                ...req.body,
                uploadedFiles: req.processedFiles
            };
            res.render('records/preview', { formData });
        } catch (err) {
            console.error('Error processing preview:', err);
            req.flash('error', 'Error processing form data');
            res.redirect('/newrecord');
        }
    }],

    submitRecord: [handleUpload, async (req, res) => {
        try {
            
            const {
                firstName, lastName, occupation, dob, gender, role, mNumber,
                address, description, familyDetails, caseDetails, appearance
            } = req.body;

            // Process uploaded files first
            const images = [];
            
            // Get files from session
            const uploadedFiles = req.session.uploadedFiles;
            
            if (uploadedFiles?.profileImage?.[0]) {
                const profileImage = uploadedFiles.profileImage[0];
                
                images.push({
                    url: profileImage.cloudinaryUrl,
                    filename: profileImage.filename,
                    type: 'profile',
                    uploadedAt: new Date()
                });
            }
            
            if (uploadedFiles?.idProof?.[0]) {
                const idProof = uploadedFiles.idProof[0];
                
                images.push({
                    url: idProof.cloudinaryUrl,
                    filename: idProof.filename,
                    type: 'identification',
                    uploadedAt: new Date()
                });
            }

            // Clear the session files after using them
            delete req.session.uploadedFiles;

            // Process name fields with new transliteration
            const firstNameResult = await processField(firstName, 'name');
            const lastNameResult = await processField(lastName, 'name');
            
            // Process occupation
            const occupationResult = await processField(occupation, 'occupation');

            // Process description
            const descriptionResult = await processField(description, 'text');

            // Process address fields
            const locationResult = await processField(address.location, 'address');
            const cityResult = await processField(address.city, 'address');
            const districtResult = await processField(address.district, 'address');
            const stateResult = await processField(address.state, 'address');

            // Generate Soundex codes from English versions
            const firstNameSoundex = getSoundex(firstNameResult.english, false, false);
            const lastNameSoundex = getSoundex(lastNameResult.english, false, false);

            // Process family details
            const processedFamilyDetails = await Promise.all((familyDetails?.name || []).map(async (_, index) => {
                const nameResult = await processField(familyDetails.name[index], 'name');
                const relationResult = await processField(familyDetails.relation[index], 'text');

                return {
                    name: {
                        english: nameResult.english,
                        hindi: nameResult.hindi
                    },
                    relation: {
                        english: relationResult.english,
                        hindi: relationResult.hindi
                    },
                    contact: familyDetails.contact[index]
                };
            }));

            // Create new profile with images
            const profile = new Profile({
                soundexCode: {
                    firstName: firstNameSoundex,
                    lastName: lastNameSoundex,
                },
                firstNameHindi: firstNameResult.hindi,
                firstNameEnglish: firstNameResult.english,
                lastNameHindi: lastNameResult.hindi,
                lastNameEnglish: lastNameResult.english,
                occupationHindi: occupationResult.hindi,
                occupationEnglish: occupationResult.english,
                dob,
                gender,
                role,
                mNumber,
                address: {
                    locationHindi: locationResult.hindi,
                    locationEnglish: locationResult.english,
                    cityHindi: cityResult.hindi,
                    cityEnglish: cityResult.english,
                    districtHindi: districtResult.hindi,
                    districtEnglish: districtResult.english,
                    stateHindi: stateResult.hindi,
                    stateEnglish: stateResult.english
                },
                descriptionHindi: descriptionResult.hindi,
                descriptionEnglish: descriptionResult.english,
                familyDetails: processedFamilyDetails,
                appearance,
                images: images.length > 0 ? images : []
            });
            
            const savedProfile = await profile.save();

            req.flash('success', 'Profile created successfully');
            res.redirect(`/record/${savedProfile.id}`);
        } catch (error) {
            console.error('Error in submitRecord:', error);
            req.flash('error', 'Failed to create profile: ' + error.message);
            res.redirect('/newrecord');
        }
    }],

    editRecordForm: async (req, res) => {
        try {
            const record = await Profile.findOne({ id: req.params.id });
            if (!record) {
                req.flash('error', 'Record not found');
                return res.redirect('/');
            }
            res.render('records/edit', { record });
        } catch (error) {
            console.error('Error loading record:', error);
            req.flash('error', 'Error loading record');
            res.redirect('/');
        }
    },

    updateRecord: [handleUpload, async (req, res) => {
        try {
            let record;
            const { id } = req.params;

            // Check if the ID is a valid MongoDB ObjectId
            if (mongoose.Types.ObjectId.isValid(id)) {
                record = await Profile.findById(id);
            }

            // If not found and the id is a number, try finding by sequential id
            if (!record && !isNaN(id)) {
                record = await Profile.findOne({ id: Number(id) });
            }

            if (!record) {
                req.flash('error', 'Record not found');
                return res.redirect('/');
            }

            const {
                firstName, lastName, occupation, dob, gender, role, mNumber,
                address, familyDetails, caseDetails, appearance
            } = req.body;

            console.log('Processing update for names:', { firstName, lastName });

            // Process name fields
            const firstNameResult = await processField(firstName, 'name');
            const lastNameResult = await processField(lastName, 'name');
            
            // Process other fields
            const occupationResult = await processField(occupation, 'text');

            // Process address fields
            const locationResult = await processField(address.location, 'text');
            const cityResult = await processField(address.city, 'text');
            const districtResult = await processField(address.district, 'text');
            const stateResult = await processField(address.state, 'text');

            // Generate Soundex codes from English versions
            const firstNameSoundex = getSoundex(firstNameResult.english, false, false);
            const lastNameSoundex = getSoundex(lastNameResult.english, false, false);

            // Process family details if present
            const processedFamilyDetails = familyDetails?.name ? 
                await Promise.all(familyDetails.name.map(async (_, index) => {
                    const nameResult = await processField(familyDetails.name[index], 'name');
                    const relationResult = await processField(familyDetails.relation[index], 'text');
                    return {
                        name: {
                            english: nameResult.english,
                            hindi: nameResult.hindi
                        },
                        relation: {
                            english: relationResult.english,
                            hindi: relationResult.hindi
                        },
                        contact: familyDetails.contact[index]
                    };
                })) : [];

            // Process case details if present
            const processedCaseDetails = caseDetails?.caseNumber ? 
                await Promise.all(caseDetails.caseNumber.map(async (_, index) => {
                    const detailsResult = await processField(caseDetails.details[index], 'text');
                    return {
                        caseNumber: caseDetails.caseNumber[index],
                        section: caseDetails.section[index],
                        role: caseDetails.role[index],
                        details: {
                            english: detailsResult.english,
                            hindi: detailsResult.hindi
                        }
                    };
                })) : [];

            // Process appearance details
            const processedAppearance = appearance ? {
                height: appearance.height,
                weight: appearance.weight,
                complexion: appearance.complexion,
                build: appearance.build,
                facialFeatures: await processField(appearance.facialFeatures, 'text'),
                scars: await processField(appearance.scars, 'text'),
                tattoos: await processField(appearance.tattoos, 'text'),
                otherFeatures: await processField(appearance.otherFeatures, 'text')
            } : {};

            // Update the record
            record.soundexCode = {
                firstName: firstNameSoundex,
                lastName: lastNameSoundex,
            };
            record.firstNameHindi = firstNameResult.hindi;
            record.firstNameEnglish = firstNameResult.english;
            record.lastNameHindi = lastNameResult.hindi;
            record.lastNameEnglish = lastNameResult.english;
            record.occupationHindi = occupationResult.hindi;
            record.occupationEnglish = occupationResult.english;
            record.dob = dob;
            record.gender = gender;
            record.role = role;
            record.mNumber = mNumber;
            record.address = {
                locationHindi: locationResult.hindi,
                locationEnglish: locationResult.english,
                cityHindi: cityResult.hindi,
                cityEnglish: cityResult.english,
                districtHindi: districtResult.hindi,
                districtEnglish: districtResult.english,
                stateHindi: stateResult.hindi,
                stateEnglish: stateResult.english,
            };
            record.appearance = processedAppearance;
            record.familyDetails = processedFamilyDetails;
            record.caseDetails = processedCaseDetails;

            await record.save();
            req.flash('success', 'Record updated successfully');
            res.redirect(`/record/${record.id}`);
        } catch (error) {
            console.error('Error updating record:', error);
            req.flash('error', 'Error updating record: ' + error.message);
            res.redirect(`/record/${req.params.id}/edit`);
        }
    }],

    deleteRecord: async (req, res) => {
        try {
            await Profile.findOneAndDelete({ id: req.params.id });
            req.flash('success', 'Record deleted successfully');
            res.redirect('/');
        } catch (error) {
            req.flash('error', 'Error deleting record');
            res.redirect('/');
        }
    },

    createProfileForCase: async (req, res) => {
        try {
            const { caseId } = req.params;
            const profileData = req.body;

            // Create and save the profile
            const profile = new Profile({
                ...profileData,
                cases: [{
                    case: caseId,
                    role: profileData.role
                }]
            });

            const savedProfile = await profile.save();
            req.flash('success', 'Profile created and attached to case');
            res.redirect(`/cases/new?profileAdded=${savedProfile._id}`);
        } catch (error) {
            console.error('Error creating profile:', error);
            req.flash('error', 'Failed to create profile');
            res.redirect('/cases/new');
        }
    }
};