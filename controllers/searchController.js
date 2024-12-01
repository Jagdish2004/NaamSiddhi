const Profile = require('../models/profileSchema');
const { getSoundex } = require('../utils/soundex');
const { transliterateToEnglish, containsHindi } = require('../utils/translator');
const { calculateMatchPercentage } = require('../utils/levenshtein');

module.exports.searchRecord = (req, res) => {
    res.render('records/search.ejs', { profiles: null });
};

module.exports.resultRecord = async (req, res) => {
    try {
        const { firstName, lastName, dob, gender, role, address, appearance } = req.body;
        let query = {};
        let searchQuery = {};
        let conditions = [];

        // Process name search
        if (firstName || lastName) {
            if (firstName) {
                // Check if input is Hindi
                const isHindiFirst = containsHindi(firstName);
                let firstNameForSoundex = firstName;
            
                
                // If input is Hindi, transliterate to English for Soundex
                if (isHindiFirst) {
                    firstNameForSoundex = await transliterateToEnglish(firstName);
                    console.log(firstNameForSoundex);
                }
                
                // Generate Soundex from English version
                const firstNameSoundex = getSoundex(firstNameForSoundex, false, false);
                  console.log(firstNameSoundex);
                
                if (isHindiFirst) {
                    conditions.push(
                        { 'soundexCode.firstName': firstNameSoundex },
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
                // Check if input is Hindi
                const isHindiLast = containsHindi(lastName);
                let lastNameForSoundex = lastName;
                console.log(lastNameForSoundex);
                
                // If input is Hindi, transliterate to English for Soundex
                if (isHindiLast) {
                    lastNameForSoundex = await transliterateToEnglish(lastName);
                }
                
                // Generate Soundex from English version
                const lastNameSoundex = getSoundex(lastNameForSoundex, false, false);
                
                if (isHindiLast) {
                    conditions.push(
                        { 'soundexCode.lastName': lastNameSoundex },
                        { lastNameHindi: new RegExp(lastName, 'i') }
                    );
                } else {
                    conditions.push(
                        { 'soundexCode.lastName': lastNameSoundex },
                        { lastNameEnglish: new RegExp(lastName, 'i') }
                    );
                }
            }
        }

        // Add other search conditions
        if (gender) query.gender = gender;
        if (role) query.role = role;
        if (dob) query.dob = new Date(dob);

        // Process address search
        if (address) {
            const { location, city, district, state } = address;
            if (location) {
                const isHindi = containsHindi(location);
                conditions.push(
                    isHindi 
                        ? { 'address.locationHindi': new RegExp(location, 'i') }
                        : { 'address.locationEnglish': new RegExp(location, 'i') }
                );
            }
            if (city) {
                const isHindi = containsHindi(city);
                conditions.push(
                    isHindi 
                        ? { 'address.cityHindi': new RegExp(city, 'i') }
                        : { 'address.cityEnglish': new RegExp(city, 'i') }
                );
            }
            if (district) {
                const isHindi = containsHindi(district);
                conditions.push(
                    isHindi 
                        ? { 'address.districtHindi': new RegExp(district, 'i') }
                        : { 'address.districtEnglish': new RegExp(district, 'i') }
                );
            }
            if (state) {
                const isHindi = containsHindi(state);
                conditions.push(
                    isHindi 
                        ? { 'address.stateHindi': new RegExp(state, 'i') }
                        : { 'address.stateEnglish': new RegExp(state, 'i') }
                );
            }
        }

        // Process appearance search
        if (appearance) {
            const { height, weight, complexion, build } = appearance;
            if (height) query['appearance.height'] = height;
            if (weight) query['appearance.weight'] = weight;
            if (complexion) query['appearance.complexion'] = complexion;
            if (build) query['appearance.build'] = build;
        }

        if (conditions.length > 0) {
            searchQuery.$or = conditions;
        }

        // Combine queries
        if (Object.keys(searchQuery).length > 0) {
            if (Object.keys(query).length > 0) {
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
                    const isHindiInput = containsHindi(firstName);
                    const fieldToCompare = isHindiInput ? 'firstNameHindi' : 'firstNameEnglish';
                    nameScore += calculateMatchPercentage(
                        firstName.toLowerCase(),
                        (profile[fieldToCompare] || '').toLowerCase()
                    );
                }

                if (lastName) {
                    nameFields++;
                    const isHindiInput = containsHindi(lastName);
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