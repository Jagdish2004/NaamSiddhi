const Profile = require('../models/profileSchema');
const { getSoundex } = require('../utils/soundex');
const { calculateMatchPercentage } = require('../utils/levenshtein');

// Helper function to detect Hindi text
function isHindi(text) {
    return /[\u0900-\u097F]/.test(text);
}

module.exports.searchRecord = (req, res) => {
    res.render('records/search.ejs', { profiles: null });
};

module.exports.resultRecord = async (req, res) => {
    try {
        const searchCriteria = req.body;
        let query = {};

        // Define parameter groups
        const parameterGroups = {
            name: {
                fields: ['firstName', 'lastName'],
                weight: 30,
                provided: 0
            },
            physical: {
                fields: ['appearance.height', 'appearance.weight', 'appearance.complexion', 'appearance.build'],
                weight: 25,
                provided: 0
            },
            address: {
                fields: ['address.location', 'address.city', 'address.district', 'address.state'],
                weight: 20,
                provided: 0
            },
            basic: {
                fields: ['gender', 'dob', 'occupation', 'mNumber'],
                weight: 25,
                provided: 0
            }
        };

        // Extract firstName, lastName, and role from searchCriteria
        const firstName = searchCriteria.firstName || '';
        const lastName = searchCriteria.lastName || '';
        const role = searchCriteria.role || '';

        // Add role to query if provided
        if (role) {
            query.role = role;
        }

        // Build search query
        let searchQuery = {};
        if (firstName || lastName) {
            const conditions = [];

            if (firstName) {
                const firstNameSoundex = getSoundex(firstName, false, false);
                if (isHindi(firstName)) {
                    // For Hindi input, prioritize Soundex matching
                    conditions.push(
                        { 'soundexCode.firstName': firstNameSoundex },
                        { 'soundexCode.firstNameHindi': firstNameSoundex },
                        { firstNameHindi: new RegExp(firstName, 'i') }
                    );
                } else {
                    conditions.push(
                        { 'soundexCode.firstName': firstNameSoundex },
                        { firstNameEnglish: new RegExp(firstName, 'i') }
                    );
                }
            }

            if (lastName) {
                const lastNameSoundex = getSoundex(lastName, false, false);
                if (isHindi(lastName)) {
                    // For Hindi input, prioritize Soundex matching
                    conditions.push(
                        { 'soundexCode.lastName': lastNameSoundex },
                        { 'soundexCode.lastNameHindi': lastNameSoundex },
                        { lastNameHindi: new RegExp(lastName, 'i') }
                    );
                } else {
                    conditions.push(
                        { 'soundexCode.lastName': lastNameSoundex },
                        { lastNameEnglish: new RegExp(lastName, 'i') }
                    );
                }
            }

            if (conditions.length > 0) {
                // Use $or to match any of the conditions
                searchQuery.$or = conditions;
            }
        }

        // Combine role query with search query
        if (Object.keys(searchQuery).length > 0) {
            if (Object.keys(query).length > 0) {
                // If we have both role and name conditions, use $and to combine them
                query = {
                    $and: [
                        query,
                        searchQuery
                    ]
                };
            } else {
                query = searchQuery;
            }
        }

        // Execute search
        const profiles = await Profile.find(query);

        // Calculate matches
        const profilesWithMatches = profiles.map(profile => {
            let totalScore = 0;
            let totalFields = 0;

            // Calculate name match
            if (firstName || lastName) {
                let nameScore = 0;
                let nameFields = 0;

                if (firstName) {
                    nameFields++;
                    const isHindiInput = isHindi(firstName);
                    const fieldToCompare = isHindiInput ? 'firstNameHindi' : 'firstNameEnglish';
                    nameScore += calculateMatchPercentage(
                        firstName.toLowerCase(),
                        (profile[fieldToCompare] || '').toLowerCase()
                    );
                }

                if (lastName) {
                    nameFields++;
                    const isHindiInput = isHindi(lastName);
                    const fieldToCompare = isHindiInput ? 'lastNameHindi' : 'lastNameEnglish';
                    nameScore += calculateMatchPercentage(
                        lastName.toLowerCase(),
                        (profile[fieldToCompare] || '').toLowerCase()
                    );
                }

                if (nameFields > 0) {
                    nameScore = nameScore / nameFields;
                    totalScore += nameScore;
                    totalFields++;
                }
            }

            const finalMatchPercentage = totalFields > 0 ? (totalScore / totalFields) : 0;

            return {
                ...profile.toObject(),
                matchPercentage: finalMatchPercentage.toFixed(2)
            };
        });

        // Filter and sort results
        const minMatchPercentage = 30;
        const sortedProfiles = profilesWithMatches
            .filter(profile => profile.matchPercentage >= minMatchPercentage)
            .sort((a, b) => b.matchPercentage - a.matchPercentage);

        res.render('records/search.ejs', { 
            profiles: sortedProfiles,
            searchParams: {
                provided: Object.keys(searchCriteria).length,
                total: Object.values(parameterGroups).reduce((acc, group) => acc + group.fields.length, 0)
            }
        });
    } catch (error) {
        console.error('Error searching profiles:', error);
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

        const isHindiQuery = isHindi(query);
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