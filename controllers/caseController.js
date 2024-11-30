const Case = require('../models/caseSchema');
const Profile = require('../models/profileSchema');
const { translateText } = require('../utils/translator');

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

        // Create new case object
        const newCase = new Case({
            caseType,
            priority,
            status: 'active',
            incidentDate: new Date(incidentDate),
            description: {
                english: description,
                hindi: await translateText(description)
            },
            location: {
                address: {
                    english: location,
                    hindi: await translateText(location)
                },
                city: {
                    english: city,
                    hindi: await translateText(city)
                },
                district: {
                    english: district,
                    hindi: await translateText(district)
                },
                state: {
                    english: state,
                    hindi: await translateText(state)
                }
            },
            reporter: {
                name: {
                    english: reporterName,
                    hindi: await translateText(reporterName)
                },
                contact: reporterContact,
                email: reporterEmail,
                address: {
                    location: {
                        english: reporterAddress,
                        hindi: await translateText(reporterAddress)
                    },
                    city: {
                        english: reporterCity,
                        hindi: await translateText(reporterCity)
                    },
                    district: {
                        english: reporterDistrict,
                        hindi: await translateText(reporterDistrict)
                    },
                    state: {
                        english: reporterState,
                        hindi: await translateText(reporterState)
                    }
                },
                idType: reporterIdType,
                idNumber: reporterIdNumber
            }
        });

        // Generate case number before saving
        const count = await Case.countDocuments();
        const year = new Date().getFullYear();
        const districtCode = district?.substring(0, 3).toUpperCase() || 'DEL';
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
        const caseData = await Case.findById(req.params.id)
            .populate('profiles.profile');
        
        if (!caseData) {
            req.flash('error', 'Case not found');
            return res.redirect('/');
        }
        
        res.render('cases/show', { caseData });
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
        const {
            query,
            caseType,
            status,
            dateFrom,
            dateTo,
            district,
            priority
        } = req.query;

        let searchQuery = {};

        // Build search query
        if (query) {
            searchQuery.$or = [
                { caseNumber: new RegExp(query, 'i') },
                { 'description.english': new RegExp(query, 'i') },
                { 'reporter.name.english': new RegExp(query, 'i') },
                { 'location.district.english': new RegExp(query, 'i') }
            ];
        }

        // Apply filters
        if (caseType) searchQuery.caseType = caseType;
        if (status) searchQuery.status = status;
        if (priority) searchQuery.priority = priority;
        if (district) searchQuery['location.district.english'] = new RegExp(district, 'i');

        // Date range filter
        if (dateFrom || dateTo) {
            searchQuery.createdAt = {};
            if (dateFrom) searchQuery.createdAt.$gte = new Date(dateFrom);
            if (dateTo) searchQuery.createdAt.$lte = new Date(dateTo);
        }

        const cases = await Case.find(searchQuery)
            .populate('profiles.profile', 'firstNameEnglish lastNameEnglish')
            .sort('-createdAt')
            .limit(50);

        console.log('Search results:', cases.length); // Debug log
        res.json({ cases });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};

module.exports.renderSearchPage = (req, res) => {
    res.render('cases/search', { 
        title: 'Search Cases',
        currentUser: req.session.user 
    });
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
 