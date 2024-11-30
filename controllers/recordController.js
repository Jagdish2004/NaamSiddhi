const Profile = require('../models/profileSchema'); // Assuming your model file is at this path
const {getSoundex} = require('../utils/soundex');
const {Translate} = require('@google-cloud/translate').v2;
require('dotenv').config();

// Initialize Google Translate client
const translate = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API,
});

module.exports.createRecord = (req, res) => {
  res.render('records/new.ejs');
};


module.exports.saveRecord = async (req, res) => {
    try {
        // Pass the form data to preview page
        res.render('records/preview', { formData: req.body });
    } catch (err) {
        console.error('Error processing preview:', err);
        req.flash('error', 'Error processing form data');
        res.redirect('/newrecord');
    }
};

// Add new route for final submission
module.exports.submitRecord = async (req, res) => {
    try {
        console.log(req.body);
        const {
            firstName, lastName, occupation, dob, gender, role, mNumber,
            address, description, familyDetails, caseDetails, appearance
        } = req.body;

        const firstNameSoundex = getSoundex(firstName, false, false); // Generate Soundex code for first name
        const lastNameSoundex = getSoundex(lastName, false, false);

        // Translate fields to Hindi
        const translateText = async (text) => {
            try {
                const [translatedText] = await translate.translate(text, 'hi'); // 'hi' is the language code for Hindi
                return translatedText;
            } catch (error) {
                console.error('Error translating text:', error);
                return text;
            }
        };
        const transliterateToHindi = async (text) => {
            try {
                // Transliteration using Google Translate API by keeping the source language as `en` and target as `hi`
                const [transliteratedText] = await translate.translate(text, {
                    to: 'hi', // Target Hindi script
                    from: 'en', // Source English script
                    format: 'text', // Ensure it's treated as text, not translated
                    model: 'nmt', // Neural Machine Translation
                });
            
                // Return the transliterated text
                return transliteratedText;
            } catch (error) {
                console.error('Error during transliteration:', error.message);
                return text; // Return original text if transliteration fails
            }
        };
        

        // Translate the required fields
        const firstNameHindi = await transliterateToHindi(firstName);
        const lastNameHindi = await transliterateToHindi(lastName);
        const occupationHindi = await translateText(occupation);
        const locationHindi = await transliterateToHindi(address.location);
        const cityHindi = await transliterateToHindi(address.city);
        const districtHindi = await transliterateToHindi(address.district);
        const stateHindi = await translateText(address.state);
        const descriptionHindi = await translateText(description);

        // Process family details
        const processedFamilyDetails = await Promise.all((familyDetails?.name || []).map(async (_, index) => ({
            name: {
                english: familyDetails.name[index],
                hindi: await transliterateToHindi(familyDetails.name[index])
            },
            relation: {
                english: familyDetails.relation[index],
                hindi: await transliterateToHindi(familyDetails.relation[index])
            },
            contact: familyDetails.contact[index]
        })));

        // Process case details
        const processedCaseDetails = await Promise.all((caseDetails?.caseNumber || []).map(async (_, index) => ({
            caseNumber: caseDetails.caseNumber[index],
            section: caseDetails.section[index],
            role: caseDetails.role[index],
            details: {
                english: caseDetails.details[index],
                hindi: await translateText(caseDetails.details[index])
            }
        })));

        // In the saveRecord function, add translations for appearance details
        const facialFeaturesHindi = await transliterateToHindi(appearance.facialFeatures);
        const scarsHindi = await transliterateToHindi(appearance.scars);
        const tattoosHindi = await transliterateToHindi(appearance.tattoos);
        const otherFeaturesHindi = await transliterateToHindi(appearance.otherFeatures);

        // Create a new profile (id will be automatically generated)
        const profile = new Profile({
            soundexCode: {
                firstName: firstNameSoundex, // Store Soundex code for first name in the nested object
                lastName: lastNameSoundex,   // Store Soundex code for last name in the nested object
            },
            firstNameHindi,  // Translated first name to Hindi
            firstNameEnglish: firstName,
            lastNameHindi,   // Translated last name to Hindi
            lastNameEnglish: lastName,
            occupationHindi, // Translated occupation to Hindi
            occupationEnglish: occupation,
            dob,
            gender,
            role,
            mNumber,
            address: {
                locationHindi, // Translated location to Hindi
                locationEnglish: address.location,
                cityHindi,     // Translated city to Hindi
                cityEnglish: address.city,
                districtHindi, // Translated district to Hindi
                districtEnglish: address.district,
                stateHindi,    // Translated state to Hindi
                stateEnglish: address.state,
            },
            descriptionHindi, // Translated description to Hindi
            descriptionEnglish: description,
            appearance: {
                height: appearance.height,
                weight: appearance.weight,
                complexion: appearance.complexion,
                build: appearance.build,
                facialFeatures: {
                    english: appearance.facialFeatures,
                    hindi: facialFeaturesHindi
                },
                scars: {
                    english: appearance.scars,
                    hindi: scarsHindi
                },
                tattoos: {
                    english: appearance.tattoos,
                    hindi: tattoosHindi
                },
                otherFeatures: {
                    english: appearance.otherFeatures,
                    hindi: otherFeaturesHindi
                }
            },
            familyDetails: processedFamilyDetails,
            caseDetails: processedCaseDetails,
        });

        // Save the profile to the database
        console.log(profile);
        await profile.save();
        req.flash('success', 'Record created successfully');
        res.redirect(`/record/${profile.id}`);
  
    } catch (err) {
        console.error('Error saving record:', err);
        req.flash('error', 'Error saving record');
        res.redirect('/newrecord');
    }
};

// View a specific record
module.exports.viewRecord = async (req, res) => {
    try {
        const record = await Profile.findOne({ id: req.params.id });
        if (!record) {
            req.flash('error', 'Record not found');
            return res.redirect('/');
        }
        res.render('records/view', { record });
    } catch (error) {
        req.flash('error', 'Error viewing record');
        res.redirect('/');
    }
};

// Show edit form
module.exports.editRecordForm = async (req, res) => {
    try {
        const record = await Profile.findOne({ id: req.params.id });
        if (!record) {
            req.flash('error', 'Record not found');
            return res.redirect('/');
        }
        res.render('records/edit', { record });
    } catch (error) {
        req.flash('error', 'Error loading edit form');
        res.redirect('/');
    }
};

// Update record
module.exports.updateRecord = async (req, res) => {
    try {
        const { firstName, lastName, occupation, dob, gender, role, mNumber, address, description } = req.body;

        // Generate new Soundex codes
        const firstNameSoundex = getSoundex(firstName, false, false);
        const lastNameSoundex = getSoundex(lastName, false, false);

        // Translate new values
        const translate = new Translate({ key: process.env.GOOGLE_TRANSLATE_API });
        
        const transliterateToHindi = async (text) => {
            const [transliteratedText] = await translate.translate(text, {
                to: 'hi',
                from: 'en',
                format: 'text',
                model: 'nmt',
            });
            return transliteratedText;
        };

        const translateText = async (text) => {
            const [translatedText] = await translate.translate(text, 'hi');
            return translatedText;
        };

        // Perform translations
        const firstNameHindi = await transliterateToHindi(firstName);
        const lastNameHindi = await transliterateToHindi(lastName);
        const occupationHindi = await translateText(occupation);
        const locationHindi = await transliterateToHindi(address.location);
        const cityHindi = await transliterateToHindi(address.city);
        const districtHindi = await transliterateToHindi(address.district);
        const stateHindi = await translateText(address.state);
        const descriptionHindi = await translateText(description);

        const updatedRecord = await Profile.findOneAndUpdate(
            { id: req.params.id },
            {
                soundexCode: {
                    firstName: firstNameSoundex,
                    lastName: lastNameSoundex,
                },
                firstNameHindi,
                firstNameEnglish: firstName,
                lastNameHindi,
                lastNameEnglish: lastName,
                occupationHindi,
                occupationEnglish: occupation,
                dob,
                gender,
                role,
                mNumber,
                address: {
                    locationHindi,
                    locationEnglish: address.location,
                    cityHindi,
                    cityEnglish: address.city,
                    districtHindi,
                    districtEnglish: address.district,
                    stateHindi,
                    stateEnglish: address.state,
                },
                descriptionHindi,
                descriptionEnglish: description,
            },
            { new: true }
        );

        req.flash('success', 'Record updated successfully');
        res.redirect(`/record/${updatedRecord.id}`);
    } catch (error) {
        console.error('Error updating record:', error);
        req.flash('error', 'Error updating record');
        res.redirect(`/record/${req.params.id}/edit`);
    }
};

// Delete record
module.exports.deleteRecord = async (req, res) => {
    try {
        await Profile.findOneAndDelete({ id: req.params.id });
        req.flash('success', 'Record deleted successfully');
        res.redirect('/');
    } catch (error) {
        req.flash('error', 'Error deleting record');
        res.redirect('/');
    }
};

// Add this new method
module.exports.createProfileForCase = async (req, res) => {
    try {
        const { caseId } = req.params;
        const profileData = req.body;

        // Create and save the profile
        const profile = new Profile({
            // ... existing profile fields
            cases: [{
                case: caseId,
                role: profileData.role
            }]
        });

        const savedProfile = await profile.save();

        // Update the case with the new profile
        await Case.findByIdAndUpdate(caseId, {
            $push: {
                profiles: {
                    profile: savedProfile._id,
                    role: profileData.role
                }
            }
        });

        req.flash('success', 'Profile created and attached to case');
        res.redirect(`/cases/new?profileAdded=${savedProfile._id}`);
    } catch (error) {
        console.error('Error creating profile:', error);
        req.flash('error', 'Failed to create profile');
        res.redirect(`/cases/new`);
    }
};