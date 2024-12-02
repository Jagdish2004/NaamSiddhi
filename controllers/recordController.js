const Profile = require('../models/profileSchema'); // Assuming your model file is at this path
const {getSoundex} = require('../utils/soundex');
const { detectLanguage, transliterateToHindi, transliterateToEnglish, containsHindi } = require('../utils/translator');

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
        const {
            firstName, lastName, occupation, dob, gender, role, mNumber,
            address, description, familyDetails, caseDetails, appearance
        } = req.body;

        // Helper function to process bilingual fields
        async function processField(text) {
            if (!text) return { english: '', hindi: '' };
            
            // Check if text contains Hindi characters
            const isHindi = containsHindi(text);
            let english, hindi;

            if (isHindi) {
                // If input is Hindi, keep Hindi as is and transliterate to English
                hindi = text;
                english = await transliterateToEnglish(text);
            } else {
                // If input is English, keep English as is and transliterate to Hindi
                english = text;
                hindi = await transliterateToHindi(text);
            }

            return {
                english: english.trim(),
                hindi: hindi.trim()
            };
        }

        // Process name fields
        const firstNameResult = await processField(firstName);
        const lastNameResult = await processField(lastName);
        
        // Process other fields
        const occupationResult = await processField(occupation);
        const descriptionResult = await processField(description);

        // Process address fields
        const locationResult = await processField(address.location);
        const cityResult = await processField(address.city);
        const districtResult = await processField(address.district);
        const stateResult = await processField(address.state);

        // Generate Soundex codes from English versions
        const firstNameSoundex = getSoundex(firstNameResult.english, false, false);
        const lastNameSoundex = getSoundex(lastNameResult.english, false, false);

        // Process family details
        const processedFamilyDetails = await Promise.all((familyDetails?.name || []).map(async (_, index) => {
            const nameResult = await processField(familyDetails.name[index]);
            const relationResult = await processField(familyDetails.relation[index]);

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

        // Process case details
        const processedCaseDetails = await Promise.all((caseDetails?.caseNumber || []).map(async (_, index) => {
            const detailsResult = await processField(caseDetails.details[index]);
            return {
                caseNumber: caseDetails.caseNumber[index],
                section: caseDetails.section[index],
                role: caseDetails.role[index],
                details: {
                    english: detailsResult.english,
                    hindi: detailsResult.hindi
                }
            };
        }));

        // Process appearance details
        const processedAppearance = {
            height: appearance.height,
            weight: appearance.weight,
            complexion: appearance.complexion,
            build: appearance.build,
            facialFeatures: await processField(appearance.facialFeatures),
            scars: await processField(appearance.scars),
            tattoos: await processField(appearance.tattoos),
            otherFeatures: await processField(appearance.otherFeatures)
        };

        // Create a new profile
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
                stateEnglish: stateResult.english,
            },
            descriptionHindi: descriptionResult.hindi,
            descriptionEnglish: descriptionResult.english,
            appearance: processedAppearance,
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
        const record = await Profile.findOne({ id: req.params.id })
            .populate({
                path: 'cases.case',
                select: 'caseNumber status description location'
            });

        if (!record) {
            req.flash('error', 'Record not found');
            return res.redirect('/');
        }

        res.render('records/view', { record });
    } catch (error) {
        console.error('Error viewing record:', error);
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