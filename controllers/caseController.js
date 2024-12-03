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

// Helper function to check if a word is likely a name
function isLikelyName(word) {
    // Check if word starts with capital letter (for English)
    if (/^[A-Z]/.test(word)) return true;
    
    // For Hindi, check if it's followed by common name indicators
    const nameIndicators = ['ने', 'को', 'की', 'का', 'के'];
    return nameIndicators.some(indicator => word.endsWith(indicator));
}

// Helper function to process description
async function processDescription(text) {
    if (!text) return { english: '', hindi: '' };
    
    try {
        const isHindi = detectHindiScript(text);
        let english, hindi;

        if (isHindi) {
            hindi = text;
            // First translate the entire text
            english = await translateToEnglish(text);

            // Then find and replace names with transliterated versions
            const words = text.split(/\s+/);
            const transliteratedNames = await Promise.all(words.map(async (word) => {
                if (isLikelyName(word)) {
                    // Remove common postfixes before transliteration
                    const nameIndicators = ['ने', 'को', 'की', 'का', 'के'];
                    let baseName = word;
                    let postfix = '';
                    
                    for (const indicator of nameIndicators) {
                        if (word.endsWith(indicator)) {
                            baseName = word.slice(0, -indicator.length);
                            postfix = indicator;
                            break;
                        }
                    }

                    const transliteratedName = await transliterateToEnglish(baseName, 'name');
                    // Replace the translated name in the English text with the transliterated version
                    const translatedWord = await translateToEnglish(word);
                    english = english.replace(translatedWord, transliteratedName + (postfix ? ' ' + await translateToEnglish(postfix) : ''));
                }
            }));
        } else {
            english = text;
            // First translate the entire text
            hindi = await translateToHindi(text);

            // Then find and replace names with transliterated versions
            const words = text.split(/\s+/);
            const transliteratedNames = await Promise.all(words.map(async (word) => {
                if (isLikelyName(word)) {
                    const transliteratedName = await transliterateToHindi(word, 'name');
                    // Replace the translated name in the Hindi text with the transliterated version
                    const translatedWord = await translateToHindi(word);
                    hindi = hindi.replace(translatedWord, transliteratedName);
                }
            }));
        }

        console.log('Processed description:', { english, hindi });
        return {
            english: english.trim(),
            hindi: hindi.trim()
        };
    } catch (error) {
        console.error('Error processing description:', error);
        return {
            english: text.trim(),
            hindi: text.trim()
        };
    }
}

// Function to generate unique case number
async function generateUniqueCaseNumber(district) {
    const year = new Date().getFullYear();
    const districtCode = district?.substring(0, 3).toUpperCase() || 'DEL';
    
    // Find the highest case number for this district and year
    const latestCase = await Case.findOne({
        caseNumber: new RegExp(`^${districtCode}/${year}/`)
    }).sort({ caseNumber: -1 });

    let nextNumber = 1;
    if (latestCase) {
        // Extract the number from the latest case number
        const match = latestCase.caseNumber.match(/\/(\d+)$/);
        if (match) {
            nextNumber = parseInt(match[1]) + 1;
        }
    }

    // Format the case number
    return `${districtCode}/${year}/${nextNumber.toString().padStart(6, '0')}`;
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

        // Process description with special handling for names
        const descriptionResult = await processDescription(description);

        // Process other fields
        const locationResult = await processField(location, 'text');
        const cityResult = await processField(city, 'text');
        const districtResult = await processField(district, 'text');
        const stateResult = await processField(state, 'text');
        const reporterNameResult = await processField(reporterName, 'name');
        const reporterAddressResult = await processField(reporterAddress, 'text');
        const reporterCityResult = await processField(reporterCity, 'text');
        const reporterDistrictResult = await processField(reporterDistrict, 'text');
        const reporterStateResult = await processField(reporterState, 'text');

        // Generate unique case number
        const caseNumber = await generateUniqueCaseNumber(districtResult.english);

        // Create new case object
        const newCase = new Case({
            caseNumber,
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
        console.log('Received search request with query params:', req.query);
        
        const { query, district, caseType, status, priority } = req.query;
        let searchQuery = {};

        // Handle district search
        if (district && district.trim()) {
            const districtQuery = district.trim();
            
            // Check if the district name is in Hindi
            const isHindi = detectHindiScript(districtQuery);
            let englishDistrict = districtQuery;
            
            if (isHindi) {
                // Transliterate Hindi district name to English
                englishDistrict = await transliterateToEnglish(districtQuery, 'name');
                console.log('Transliterated district from Hindi:', districtQuery, 'to English:', englishDistrict);
            }

            // Create regex patterns for both original and transliterated versions
            const englishPattern = new RegExp(`^${englishDistrict}$`, 'i');
            const hindiPattern = new RegExp(`^${districtQuery}$`, 'i');

            searchQuery.$or = [
                { 'location.district.english': englishPattern },
                { 'location.district.hindi': hindiPattern }
            ];
            
            console.log('Searching for district:', { 
                original: districtQuery, 
                transliterated: englishDistrict 
            });
        }
        // Handle general search
        else if (query && query.trim()) {
            const searchRegex = new RegExp(query.trim(), 'i');
            searchQuery.$or = [
                // Case number search
                { caseNumber: searchRegex },
                
                // Description search
                { 'description.english': searchRegex },
                { 'description.hindi': searchRegex },
                
                // Location search
                { 'location.address.english': searchRegex },
                { 'location.address.hindi': searchRegex },
                { 'location.city.english': searchRegex },
                { 'location.city.hindi': searchRegex },
                { 'location.district.english': searchRegex },
                { 'location.district.hindi': searchRegex },
                { 'location.state.english': searchRegex },
                { 'location.state.hindi': searchRegex },
                
                // Reporter search
                { 'reporter.name.english': searchRegex },
                { 'reporter.name.hindi': searchRegex }
            ];
        }

        // Add other filters if provided
        if (caseType) searchQuery.caseType = caseType;
        if (status) searchQuery.status = status;
        if (priority) searchQuery.priority = priority;

        console.log('Final search query:', JSON.stringify(searchQuery, null, 2));

        // Execute search
        const cases = await Case.find(searchQuery)
            .select('_id caseNumber caseType status location description profiles createdAt')
            .populate('profiles.profile', 'firstNameEnglish lastNameEnglish firstNameHindi lastNameHindi')
            .sort({ createdAt: -1 });

        console.log(`Found ${cases.length} cases matching the criteria`);
        
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
 