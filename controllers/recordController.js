const Profile = require('../models/profileSchema');
const { getSoundex } = require('../utils/soundex');
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

        console.log(`Processed ${fieldType}:`, { english, hindi });
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

    saveRecord: async (req, res) => {
        try {
            res.render('records/preview', { formData: req.body });
        } catch (err) {
            console.error('Error processing preview:', err);
            req.flash('error', 'Error processing form data');
            res.redirect('/newrecord');
        }
    },

    submitRecord: async (req, res) => {
        try {
            const {
                firstName, lastName, occupation, dob, gender, role, mNumber,
                address, description, familyDetails, caseDetails, appearance
            } = req.body;

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

            // Create new profile
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
                appearance
            });

            await profile.save();
            console.log('Profile saved successfully:', profile.id);

            req.flash('success', 'Profile created successfully');
            res.redirect(`/record/${profile.id}`);
        } catch (error) {
            console.error('Error creating profile:', error);
            req.flash('error', 'Failed to create profile');
            res.redirect('/newrecord');
        }
    },

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

    updateRecord: async (req, res) => {
        try {
            const updatedRecord = await Profile.findOneAndUpdate(
                { id: req.params.id },
                req.body,
                { new: true }
            );
            req.flash('success', 'Record updated successfully');
            res.redirect(`/record/${updatedRecord.id}`);
        } catch (error) {
            console.error('Error updating record:', error);
            req.flash('error', 'Error updating record');
            res.redirect(`/record/${req.params.id}/edit`);
        }
    },

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