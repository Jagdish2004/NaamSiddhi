const Profile = require('../models/profileSchema');
const { getSoundex } = require('../utils/soundex');
const { 
    detectHindiScript, 
    transliterateToEnglish, 
    transliterateToHindi 
} = require('../utils/translator');
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
                const isHindiFirst = detectHindiScript(firstName);
                let firstNameForSearch = firstName;
                
                try {
                    // If input is Hindi, transliterate to English for search
                    if (isHindiFirst) {
                        firstNameForSearch = await transliterateToEnglish(firstName, 'name');
                        console.log('Transliterated first name:', firstNameForSearch);
                    }
                    
                    // Generate Soundex from English version
                    const firstNameSoundex = getSoundex(firstNameForSearch, false, false);
                    console.log('First name Soundex:', firstNameSoundex);
                    
                    conditions.push(
                        { 'soundexCode.firstName': firstNameSoundex },
                        isHindiFirst 
                            ? { firstNameHindi: new RegExp(firstName, 'i') }
                            : { firstNameEnglish: new RegExp(firstNameForSearch, 'i') }
                    );
                } catch (error) {
                    console.error('Error processing first name:', error);
                }
            }

            if (lastName) {
                // Check if input is Hindi
                const isHindiLast = detectHindiScript(lastName);
                let lastNameForSearch = lastName;
                
                try {
                    // If input is Hindi, transliterate to English for search
                    if (isHindiLast) {
                        lastNameForSearch = await transliterateToEnglish(lastName, 'name');
                        console.log('Transliterated last name:', lastNameForSearch);
                    }
                    
                    // Generate Soundex from English version
                    const lastNameSoundex = getSoundex(lastNameForSearch, false, false);
                    console.log('Last name Soundex:', lastNameSoundex);
                    
                    conditions.push(
                        { 'soundexCode.lastName': lastNameSoundex },
                        isHindiLast 
                            ? { lastNameHindi: new RegExp(lastName, 'i') }
                            : { lastNameEnglish: new RegExp(lastNameForSearch, 'i') }
                    );
                } catch (error) {
                    console.error('Error processing last name:', error);
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
                const isHindi = detectHindiScript(location);
                conditions.push(
                    isHindi 
                        ? { 'address.locationHindi': new RegExp(location, 'i') }
                        : { 'address.locationEnglish': new RegExp(location, 'i') }
                );
            }
            if (city) {
                const isHindi = detectHindiScript(city);
                conditions.push(
                    isHindi 
                        ? { 'address.cityHindi': new RegExp(city, 'i') }
                        : { 'address.cityEnglish': new RegExp(city, 'i') }
                );
            }
            if (district) {
                const isHindi = detectHindiScript(district);
                conditions.push(
                    isHindi 
                        ? { 'address.districtHindi': new RegExp(district, 'i') }
                        : { 'address.districtEnglish': new RegExp(district, 'i') }
                );
            }
            if (state) {
                const isHindi = detectHindiScript(state);
                conditions.push(
                    isHindi 
                        ? { 'address.stateHindi': new RegExp(state, 'i') }
                        : { 'address.stateEnglish': new RegExp(state, 'i') }
                );
            }
        }

        // Process appearance search
        if (appearance) {
            if (appearance.height) query['appearance.height'] = appearance.height;
            if (appearance.weight) query['appearance.weight'] = appearance.weight;
            if (appearance.complexion) query['appearance.complexion'] = appearance.complexion;
            if (appearance.build) query['appearance.build'] = appearance.build;
        }

        // Combine all conditions
        if (conditions.length > 0) {
            query.$or = conditions;
        }

        console.log('Final search query:', JSON.stringify(query, null, 2));

        // Execute search
        const profiles = await Profile.find(query);
        console.log('Found profiles:', profiles.length);

        // Calculate match percentages
        const profilesWithMatches = profiles.map(profile => {
            let totalScore = 0;
            let totalFields = 0;

            // Calculate name match
            if (firstName || lastName) {
                let nameScore = 0;
                let nameFields = 0;

                if (firstName) {
                    nameFields++;
                    const isHindiInput = detectHindiScript(firstName);
                    const fieldToCompare = isHindiInput ? 'firstNameHindi' : 'firstNameEnglish';
                    nameScore += calculateMatchPercentage(
                        firstName.toLowerCase(),
                        (profile[fieldToCompare] || '').toLowerCase()
                    );
                }

                if (lastName) {
                    nameFields++;
                    const isHindiInput = detectHindiScript(lastName);
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