const Profile = require('../models/profileSchema');
const { getSoundex } = require('../utils/soundex');
const { 
    detectHindiScript, 
    transliterateToEnglish 
} = require('../utils/translator');
const { calculateMatchPercentage } = require('../utils/levenshtein');

module.exports.searchRecord = (req, res) => {
    res.render('records/search.ejs', { profiles: null });
};

module.exports.resultRecord = async (req, res) => {
    try {
        const { firstName, lastName, dob, gender, role, address, appearance, mNumber, occupation } = req.body;
        let conditions = [];

        // Define weights for different attributes
        const weights = {
            // Primary identifiers (45% total)
            name: {
                firstName: 0.20,     // 20% for first name (reduced from 30%)
                lastName: 0.15       // 15% for last name (reduced from 20%)
            },
            
            // Secondary identifiers (35% total)
            personal: {
                gender: 0.10,        // 10% for gender
                dob: 0.10,          // 10% for date of birth
                role: 0.10,         // 10% for role
                mNumber: 0.10,      // 10% for mobile number (new)
                occupation: 0.05    // 5% for occupation (new)
            },
            
            // Location details (10% total)
            address: {
                district: 0.04,      // 4% for district
                city: 0.03,         // 3% for city
                state: 0.03         // 3% for state
            },
            
            // Physical attributes (10% total)
            appearance: {
                height: 0.025,       // 2.5% for height
                weight: 0.025,       // 2.5% for weight
                complexion: 0.025,   // 2.5% for complexion
                build: 0.025        // 2.5% for build
            }
        };

        // First stage: Soundex-based filtering
        let soundexQuery = {};
        if (firstName || lastName) {
            let soundexConditions = [];
            
            if (firstName) {
                const isHindiFirst = detectHindiScript(firstName);
                let firstNameForSearch = firstName;
                
                if (isHindiFirst) {
                    firstNameForSearch = await transliterateToEnglish(firstName, 'name');
                }
                
                const firstNameSoundex = getSoundex(firstNameForSearch, false, false);
                soundexConditions.push({ 'soundexCode.firstName': firstNameSoundex });
            }

            if (lastName) {
                const isHindiLast = detectHindiScript(lastName);
                let lastNameForSearch = lastName;
                
                if (isHindiLast) {
                    lastNameForSearch = await transliterateToEnglish(lastName, 'name');
                }
                
                const lastNameSoundex = getSoundex(lastNameForSearch, false, false);
                soundexConditions.push({ 'soundexCode.lastName': lastNameSoundex });
            }

            // Use $or to match either firstName or lastName Soundex
            soundexQuery = { $or: soundexConditions };
        }

        // Execute first stage search with Soundex
        const profiles = await Profile.find(soundexQuery);

        // Calculate weighted match scores for all profiles
        const profilesWithMatches = profiles.map(profile => {
            let totalScore = 0;
            let scores = {
                name: { firstName: 0, lastName: 0 },
                personal: { 
                    gender: 0, 
                    dob: 0, 
                    role: 0,
                    mNumber: 0,      // Added mobile number
                    occupation: 0    // Added occupation
                },
                address: { district: 0, city: 0, state: 0 },
                appearance: { height: 0, weight: 0, complexion: 0, build: 0 }
            };

            // Name matching (50%)
            if (firstName) {
                const isHindiInput = detectHindiScript(firstName);
                const fieldToCompare = isHindiInput ? 'firstNameHindi' : 'firstNameEnglish';
                scores.name.firstName = calculateMatchPercentage(
                    firstName.toLowerCase(),
                    (profile[fieldToCompare] || '').toLowerCase()
                ) * weights.name.firstName;
                totalScore += scores.name.firstName;
            }

            if (lastName) {
                const isHindiInput = detectHindiScript(lastName);
                const fieldToCompare = isHindiInput ? 'lastNameHindi' : 'lastNameEnglish';
                scores.name.lastName = calculateMatchPercentage(
                    lastName.toLowerCase(),
                    (profile[fieldToCompare] || '').toLowerCase()
                ) * weights.name.lastName;
                totalScore += scores.name.lastName;
            }

            // Personal information matching (30%)
            if (gender) {
                scores.personal.gender = (profile.gender === gender ? 100 : 0) * weights.personal.gender;
                totalScore += scores.personal.gender;
            }

            if (dob) {
                scores.personal.dob = (profile.dob && profile.dob.toISOString().split('T')[0] === dob ? 100 : 0) 
                    * weights.personal.dob;
                totalScore += scores.personal.dob;
            }

            if (role) {
                scores.personal.role = (profile.role === role ? 100 : 0) * weights.personal.role;
                totalScore += scores.personal.role;
            }

            if (mNumber) {
                scores.personal.mNumber = (profile.mNumber === mNumber ? 100 : 0) * weights.personal.mNumber;
                totalScore += scores.personal.mNumber;
            }

            if (occupation) {
                const isHindiInput = detectHindiScript(occupation);
                const fieldToCompare = isHindiInput ? 'occupationHindi' : 'occupationEnglish';
                scores.personal.occupation = calculateMatchPercentage(
                    occupation.toLowerCase(),
                    (profile[fieldToCompare] || '').toLowerCase()
                ) * weights.personal.occupation;
                totalScore += scores.personal.occupation;
            }

            // Address matching (10%)
            if (address) {
                ['district', 'city', 'state'].forEach(component => {
                    if (address[component]) {
                        const isHindi = detectHindiScript(address[component]);
                        const field = isHindi ? `${component}Hindi` : `${component}English`;
                        scores.address[component] = calculateMatchPercentage(
                            address[component].toLowerCase(),
                            (profile.address[field] || '').toLowerCase()
                        ) * weights.address[component];
                        totalScore += scores.address[component];
                    }
                });
            }

            // Appearance matching (10%)
            if (appearance) {
                if (appearance.height) {
                    const heightDiff = Math.abs(profile.appearance?.height - appearance.height);
                    scores.appearance.height = (heightDiff <= 5 ? (100 - heightDiff * 20) : 0) 
                        * weights.appearance.height;
                    totalScore += scores.appearance.height;
                }

                if (appearance.weight) {
                    const weightDiff = Math.abs(profile.appearance?.weight - appearance.weight);
                    scores.appearance.weight = (weightDiff <= 5 ? (100 - weightDiff * 20) : 0) 
                        * weights.appearance.weight;
                    totalScore += scores.appearance.weight;
                }

                if (appearance.complexion) {
                    scores.appearance.complexion = (profile.appearance?.complexion === appearance.complexion ? 100 : 0) 
                        * weights.appearance.complexion;
                    totalScore += scores.appearance.complexion;
                }

                if (appearance.build) {
                    scores.appearance.build = (profile.appearance?.build === appearance.build ? 100 : 0) 
                        * weights.appearance.build;
                    totalScore += scores.appearance.build;
                }
            }

            return {
                ...profile.toObject(),
                matchPercentage: parseFloat(totalScore.toFixed(2)),
                scores: {
                    name: {
                        firstName: parseFloat(scores.name.firstName.toFixed(2)),
                        lastName: parseFloat(scores.name.lastName.toFixed(2))
                    },
                    personal: {
                        gender: parseFloat(scores.personal.gender.toFixed(2)),
                        dob: parseFloat(scores.personal.dob.toFixed(2)),
                        role: parseFloat(scores.personal.role.toFixed(2)),
                        mNumber: parseFloat(scores.personal.mNumber.toFixed(2)),      // Added
                        occupation: parseFloat(scores.personal.occupation.toFixed(2)) // Added
                    },
                    address: {
                        district: parseFloat(scores.address.district.toFixed(2)),
                        city: parseFloat(scores.address.city.toFixed(2)),
                        state: parseFloat(scores.address.state.toFixed(2))
                    },
                    appearance: {
                        height: parseFloat(scores.appearance.height.toFixed(2)),
                        weight: parseFloat(scores.appearance.weight.toFixed(2)),
                        complexion: parseFloat(scores.appearance.complexion.toFixed(2)),
                        build: parseFloat(scores.appearance.build.toFixed(2))
                    }
                }
            };
        });

        // Sort all profiles by match percentage
        const sortedProfiles = profilesWithMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

        res.render('records/search.ejs', { 
            profiles: sortedProfiles,
            searchParams: req.body
        });

    } catch (err) {
        console.error('Error searching profiles:', err);
        req.flash('error', 'An error occurred while searching profiles');
        res.redirect('/search');
    }
};

module.exports.getSuggestions = async (req, res) => {
    try {
        const { type, query } = req.query;
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const isHindiQuery = containsHindi(query);
        let searchField = type === 'firstName' ? 
            (isHindiQuery ? 'firstNameHindi' : 'firstNameEnglish') : 
            (isHindiQuery ? 'lastNameHindi' : 'lastNameEnglish');

        let searchQuery = {};
        searchQuery[searchField] = new RegExp('^' + query, 'i');

        const suggestions = await Profile.find(searchQuery)
            .select('firstNameEnglish firstNameHindi lastNameEnglish lastNameHindi')
            .limit(5);

        res.json(suggestions);
    } catch (error) {
        console.error('Error getting suggestions:', error);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
};

module.exports.searchCases = async (req, res) => {
    try {
        const { query } = req.query;
        
        let searchQuery = {};
        if (query) {
            const isHindiQuery = containsHindi(query);
            searchQuery.$or = [
                { caseNumber: new RegExp(query, 'i') },
                isHindiQuery ? 
                    { 'description.hindi': new RegExp(query, 'i') } :
                    { 'description.english': new RegExp(query, 'i') },
                isHindiQuery ?
                    { 'location.district.hindi': new RegExp(query, 'i') } :
                    { 'location.district.english': new RegExp(query, 'i') }
            ];
        }

        const cases = await Case.find(searchQuery)
            .select('_id caseNumber caseType status location description')
            .sort('-createdAt')
            .limit(10);

        res.setHeader('Content-Type', 'application/json');
        return res.json({ cases });
    } catch (error) {
        console.error('Search error:', error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: 'Search failed' });
    }
};