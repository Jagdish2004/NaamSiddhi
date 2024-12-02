const Case = require('../models/caseSchema');
const Profile = require('../models/profileSchema');
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

module.exports.renderNewCaseForm = async (req, res) => {
    try {
        const profiles = await Profile.find()
            .select('firstNameEnglish lastNameEnglish role id')
            .sort('firstNameEnglish');
        res.render('cases/new', { profiles });
    } catch (error) {
        console.error('Error loading profiles:', error);
        req.flash('error', 'Failed to load profiles');
        res.redirect('/');
    }
};

module.exports.createCase = async (req, res) => {
    try {
        console.log('Received case data:', req.body);

        // Extract data from form
        const {
            caseType,
            priority,
            incidentDate,
            description,
            location,
            city,
            district,
            state,
            reporterName,
            reporterContact,
            reporterEmail,
            reporterAddress,
            reporterCity,
            reporterDistrict,
            reporterState,
            reporterIdType,
            reporterIdNumber,
            connectedProfiles
        } = req.body;

        // Process all text fields for bilingual support
        const descriptionResult = await processField(description, 'text');
        const locationResult = await processField(location, 'text');
        const cityResult = await processField(city, 'text');
        const districtResult = await processField(district, 'text');
        const stateResult = await processField(state, 'text');
        const reporterNameResult = await processField(reporterName, 'name');
        const reporterAddressResult = await processField(reporterAddress, 'text');
        const reporterCityResult = await processField(reporterCity, 'text');
        const reporterDistrictResult = await processField(reporterDistrict, 'text');
        const reporterStateResult = await processField(reporterState, 'text');

        // Create new case object
        const newCase = new Case({
            caseType,
            priority,
            status: 'active',
            incidentDate: new Date(incidentDate),
            description: {
                english: descriptionResult.english,
                hindi: descriptionResult.hindi
            },
            location: {
                address: {
                    english: locationResult.english,
                    hindi: locationResult.hindi
                },
                city: {
                    english: cityResult.english,
                    hindi: cityResult.hindi
                },
                district: {
                    english: districtResult.english,
                    hindi: districtResult.hindi
                },
                state: {
                    english: stateResult.english,
                    hindi: stateResult.hindi
                }
            },
            reporter: {
                name: {
                    english: reporterNameResult.english,
                    hindi: reporterNameResult.hindi
                },
                contact: reporterContact,
                email: reporterEmail,
                address: {
                    location: {
                        english: reporterAddressResult.english,
                        hindi: reporterAddressResult.hindi
                    },
                    city: {
                        english: reporterCityResult.english,
                        hindi: reporterCityResult.hindi
                    },
                    district: {
                        english: reporterDistrictResult.english,
                        hindi: reporterDistrictResult.hindi
                    },
                    state: {
                        english: reporterStateResult.english,
                        hindi: reporterStateResult.hindi
                    }
                },
                idType: reporterIdType,
                idNumber: reporterIdNumber
            }
        });

        // Generate case number before saving
        const count = await Case.countDocuments();
        const year = new Date().getFullYear();
        const districtCode = districtResult.english?.substring(0, 3).toUpperCase() || 'DEL';
        newCase.caseNumber = `${districtCode}/${year}/${(count + 1).toString().padStart(6, '0')}`;

        // Handle connected profiles
        if (connectedProfiles && connectedProfiles !== '[]') {
            try {
                const profiles = JSON.parse(connectedProfiles);
                newCase.profiles = profiles.map(p => ({
                    profile: p.id,
                    role: p.role
                }));
            } catch (error) {
                console.error('Error parsing connected profiles:', error);
            }
        }

        // Save the case
        const savedCase = await newCase.save();
        console.log('Case saved:', savedCase);

        // Update profiles with case reference if any profiles are connected
        if (savedCase.profiles && savedCase.profiles.length > 0) {
            await Promise.all(savedCase.profiles.map(profile =>
                Profile.findByIdAndUpdate(profile.profile, {
                    $push: {
                        cases: {
                            case: savedCase._id,
                            role: profile.role
                        }
                    }
                })
            ));
        }

        req.flash('success', 'Case created successfully');
        res.redirect(`/cases/${savedCase._id}`);
    } catch (error) {
        console.error('Error creating case:', error);
        req.flash('error', 'Failed to create case: ' + error.message);
        res.redirect('/cases/new');
    }
};

module.exports.viewCase = async (req, res) => {
    try {
        // Force fresh data by disabling cache
        const case_ = await Case.findById(req.params.id)
            .populate({
                path: 'profiles.profile',
                select: '_id firstNameEnglish lastNameEnglish firstNameHindi lastNameHindi role'
            })
            .lean(); // Use lean() for better performance
        
        if (!case_) {
            req.flash('error', 'Case not found');
            return res.redirect('/');
        }
        
        // Add cache control headers
        res.set('Cache-Control', 'no-store');
        res.render('cases/show', { caseData: case_ });
    } catch (error) {
        console.error('Error viewing case:', error);
        req.flash('error', 'Failed to load case');
        res.redirect('/');
    }
};

module.exports.createProfileAndAttachToCase = async (req, res) => {
    try {
        const { caseId } = req.params;
        const profileData = req.body;

        // Create new profile
        const profile = new Profile({
            firstNameEnglish: profileData.firstName,
            lastNameEnglish: profileData.lastName,
            // ... other profile fields
        });

        // Save the profile
        const savedProfile = await profile.save();

        // Attach profile to case
        const case_ = await Case.findById(caseId);
        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }

        case_.profiles.push({
            profile: savedProfile._id,
            role: profileData.role
        });

        await case_.save();

        // Add case reference to profile
        savedProfile.cases.push({
            case: caseId,
            role: profileData.role
        });

        await savedProfile.save();

        res.json({
            success: true,
            profile: savedProfile,
            message: 'Profile created and attached to case'
        });
    } catch (error) {
        console.error('Error creating profile:', error);
        res.status(500).json({ error: 'Failed to create profile' });
    }
};

// Add this method to handle form submission
module.exports.handleFormSubmission = async (req, res) => {
    try {
        const formData = req.body;
        console.log('Form data received:', formData);

        // Create and save the case
        const result = await this.createCase(req, res);
        return result;
    } catch (error) {
        console.error('Form submission error:', error);
        req.flash('error', 'Form submission failed');
        res.redirect('/cases/new');
    }
};

module.exports.searchCases = async (req, res) => {
    try {
        const { q: query, caseType, status, priority } = req.query;
        
        let searchQuery = {};

        if (query) {
            searchQuery.$or = [
                { caseNumber: new RegExp(query, 'i') },
                { 'description.english': new RegExp(query, 'i') },
                { 'location.district.english': new RegExp(query, 'i') }
            ];
        }

        if (caseType) searchQuery.caseType = caseType;
        if (status) searchQuery.status = status;
        if (priority) searchQuery.priority = priority;

        const cases = await Case.find(searchQuery)
            .select('_id caseNumber caseType status location description profiles')
            .populate('profiles.profile', 'firstNameEnglish lastNameEnglish')
            .sort('-createdAt')
            .limit(10);

        res.json({ cases });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};

module.exports.renderSearchPage = (req, res) => {
    res.render('cases/search', { title: 'Search Cases' });
};

module.exports.addProfileToCase = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { profileId, role } = req.body;

        const case_ = await Case.findById(caseId);
        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }

        // Add profile to case
        case_.profiles.push({
            profile: profileId,
            role,
            addedAt: new Date()
        });

        // Add timeline entry
        case_.timeline.push({
            action: 'PROFILE_ADDED',
            description: {
                english: `Profile added with role: ${role}`,
                hindi: await translateText(`Profile added with role: ${role}`)
            }
        });

        await case_.save();

        // Update profile with case reference
        await Profile.findByIdAndUpdate(profileId, {
            $push: {
                cases: {
                    case: caseId,
                    role,
                    addedAt: new Date()
                }
            }
        });

        res.json({ success: true, message: 'Profile added successfully' });
    } catch (error) {
        console.error('Error adding profile:', error);
        res.status(500).json({ error: 'Failed to add profile' });
    }
};

module.exports.removeProfileFromCase = async (req, res) => {
    try {
        const { caseId, profileId } = req.params;

        // Remove profile from case
        await Case.findByIdAndUpdate(caseId, {
            $pull: { profiles: { profile: profileId } }
        });

        // Remove case from profile
        await Profile.findByIdAndUpdate(profileId, {
            $pull: { cases: { case: caseId } }
        });

        res.json({ success: true, message: 'Profile removed successfully' });
    } catch (error) {
        console.error('Error removing profile:', error);
        res.status(500).json({ error: 'Failed to remove profile' });
    }
};
 