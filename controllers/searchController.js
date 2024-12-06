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
        const { firstName, middleName, lastName, dob, gender, role, address, appearance, mNumber, occupation, aadharNumber } = req.body;
        let conditions = [];

        // If Aadhar number is provided, it takes precedence as it's a unique identifier
        if (aadharNumber) {
            const profile = await Profile.findOne({ aadharNumber });
            return res.render('records/search.ejs', { 
                profiles: profile ? [{ ...profile.toObject(), matchPercentage: 100 }] : [],
                searchParams: req.body
            });
        }

        // Define weights for different attributes
        const weights = {
            name: {
                firstName: 0.18,
                middleName: 0.07,
                lastName: 0.13
            },
            personal: {
                gender: 0.05,
                dob: 0.15,
                mNumber: 0.15,
                occupation: 0.10
            },
            address: {
                district: 0.02,
                city: 0.03,
                state: 0.02
            },
            appearance: {
                height: 0.025,
                weight: 0.025,
                complexion: 0.025,
                build: 0.025
            }
        };

        // First stage: Soundex-based filtering
        let soundexQuery = {};
        if (firstName || middleName || lastName) {
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

            if (middleName) {
                const isHindiMiddle = detectHindiScript(middleName);
                let middleNameForSearch = middleName;
                
                if (isHindiMiddle) {
                    middleNameForSearch = await transliterateToEnglish(middleName, 'name');
                }
                
                const middleNameSoundex = getSoundex(middleNameForSearch, false, false);
                soundexConditions.push({ 'soundexCode.middleName': middleNameSoundex });
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

            soundexQuery = { $or: soundexConditions };
        }

        // Execute first stage search with Soundex
        const profiles = await Profile.find(soundexQuery);

        // Calculate weighted match scores for all profiles
        const profilesWithMatches = profiles.map(profile => {
            let totalScore = 0;
            let scores = {
                name: { firstName: 0, middleName: 0, lastName: 0 },
                personal: { 
                    gender: 0, 
                    dob: 0,
                    mNumber: 0,
                    occupation: 0
                },
                address: { district: 0, city: 0, state: 0 },
                appearance: { height: 0, weight: 0, complexion: 0, build: 0 }
            };

            // Name matching
            if (firstName) {
                const isHindiInput = detectHindiScript(firstName);
                const fieldToCompare = isHindiInput ? 'firstNameHindi' : 'firstNameEnglish';
                scores.name.firstName = calculateMatchPercentage(
                    firstName.toLowerCase(),
                    (profile[fieldToCompare] || '').toLowerCase()
                ) * weights.name.firstName;
                totalScore += scores.name.firstName || 0;
            }

            if (middleName) {
                const isHindiInput = detectHindiScript(middleName);
                const fieldToCompare = isHindiInput ? 'middleNameHindi' : 'middleNameEnglish';
                scores.name.middleName = calculateMatchPercentage(
                    middleName.toLowerCase(),
                    (profile[fieldToCompare] || '').toLowerCase()
                ) * weights.name.middleName;
                totalScore += scores.name.middleName || 0;
            }

            if (lastName) {
                const isHindiInput = detectHindiScript(lastName);
                const fieldToCompare = isHindiInput ? 'lastNameHindi' : 'lastNameEnglish';
                scores.name.lastName = calculateMatchPercentage(
                    lastName.toLowerCase(),
                    (profile[fieldToCompare] || '').toLowerCase()
                ) * weights.name.lastName;
                totalScore += scores.name.lastName || 0;
            }

            // Personal information matching
            if (gender) {
                scores.personal.gender = (profile.gender === gender ? 100 : 0) * weights.personal.gender;
                totalScore += scores.personal.gender || 0;
            }

            if (dob) {
                scores.personal.dob = (profile.dob && profile.dob.toISOString().split('T')[0] === dob ? 100 : 0) 
                    * weights.personal.dob;
                totalScore += scores.personal.dob || 0;
            }

            if (mNumber) {
                scores.personal.mNumber = (profile.mNumber === mNumber ? 100 : 0) * weights.personal.mNumber;
                totalScore += scores.personal.mNumber || 0;
            }

            if (occupation) {
                const isHindiInput = detectHindiScript(occupation);
                const fieldToCompare = isHindiInput ? 'occupationHindi' : 'occupationEnglish';
                scores.personal.occupation = calculateMatchPercentage(
                    occupation.toLowerCase(),
                    (profile[fieldToCompare] || '').toLowerCase()
                ) * weights.personal.occupation;
                totalScore += scores.personal.occupation || 0;
            }

            // Address matching
            if (address) {
                if (address.district) {
                    const isHindiInput = detectHindiScript(address.district);
                    const fieldToCompare = isHindiInput ? 'districtHindi' : 'districtEnglish';
                    scores.address.district = calculateMatchPercentage(
                        address.district.toLowerCase(),
                        ((profile.address && profile.address[fieldToCompare]) || '').toLowerCase()
                    ) * weights.address.district;
                    totalScore += scores.address.district || 0;
                }

                if (address.city) {
                    const isHindiInput = detectHindiScript(address.city);
                    const fieldToCompare = isHindiInput ? 'cityHindi' : 'cityEnglish';
                    scores.address.city = calculateMatchPercentage(
                        address.city.toLowerCase(),
                        ((profile.address && profile.address[fieldToCompare]) || '').toLowerCase()
                    ) * weights.address.city;
                    totalScore += scores.address.city || 0;
                }

                if (address.state) {
                    const isHindiInput = detectHindiScript(address.state);
                    const fieldToCompare = isHindiInput ? 'stateHindi' : 'stateEnglish';
                    scores.address.state = calculateMatchPercentage(
                        address.state.toLowerCase(),
                        ((profile.address && profile.address[fieldToCompare]) || '').toLowerCase()
                    ) * weights.address.state;
                    totalScore += scores.address.state || 0;
                }
            }

            // Appearance matching
            if (appearance) {
                if (appearance.height) {
                    const heightDiff = Math.abs(profile.appearance?.height - appearance.height);
                    scores.appearance.height = Math.max(0, 100 - (heightDiff * 2)) * weights.appearance.height;
                    totalScore += scores.appearance.height || 0;
                }

                if (appearance.weight) {
                    const weightDiff = Math.abs(profile.appearance?.weight - appearance.weight);
                    scores.appearance.weight = Math.max(0, 100 - (weightDiff * 2)) * weights.appearance.weight;
                    totalScore += scores.appearance.weight || 0;
                }

                if (appearance.complexion) {
                    scores.appearance.complexion = (profile.appearance?.complexion === appearance.complexion ? 100 : 0) 
                        * weights.appearance.complexion;
                    totalScore += scores.appearance.complexion || 0;
                }

                if (appearance.build) {
                    scores.appearance.build = (profile.appearance?.build === appearance.build ? 100 : 0) 
                        * weights.appearance.build;
                    totalScore += scores.appearance.build || 0;
                }
            }

            // Convert scores to percentages and round to 2 decimal places
            const roundedScores = {
                name: {
                    firstName: parseFloat((scores.name.firstName || 0).toFixed(2)),
                    middleName: parseFloat((scores.name.middleName || 0).toFixed(2)),
                    lastName: parseFloat((scores.name.lastName || 0).toFixed(2))
                },
                personal: {
                    gender: parseFloat((scores.personal.gender || 0).toFixed(2)),
                    dob: parseFloat((scores.personal.dob || 0).toFixed(2)),
                    mNumber: parseFloat((scores.personal.mNumber || 0).toFixed(2)),
                    occupation: parseFloat((scores.personal.occupation || 0).toFixed(2))
                },
                address: {
                    district: parseFloat((scores.address.district || 0).toFixed(2)),
                    city: parseFloat((scores.address.city || 0).toFixed(2)),
                    state: parseFloat((scores.address.state || 0).toFixed(2))
                },
                appearance: {
                    height: parseFloat((scores.appearance.height || 0).toFixed(2)),
                    weight: parseFloat((scores.appearance.weight || 0).toFixed(2)),
                    complexion: parseFloat((scores.appearance.complexion || 0).toFixed(2)),
                    build: parseFloat((scores.appearance.build || 0).toFixed(2))
                }
            };

            return {
                ...profile.toObject(),
                matchPercentage: parseFloat(totalScore.toFixed(2)),
                scores: roundedScores
            };
        });

        // Sort by match percentage and filter out low matches
        const matchedProfiles = profilesWithMatches
            .filter(p => p.matchPercentage > 0)
            .sort((a, b) => b.matchPercentage - a.matchPercentage);

        res.render('records/search.ejs', { 
            profiles: matchedProfiles,
            searchParams: req.body
        });

    } catch (error) {
        console.error('Search error:', error);
        res.render('records/search.ejs', { 
            profiles: [],
            searchParams: req.body,
            error: 'An error occurred while searching'
        });
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