const Profile = require('../models/profileSchema');
const { getSoundex } = require('../utils/soundex');
const { calculateMatchPercentage } = require('../utils/levenshtein');

module.exports.searchRecord = (req, res) => {
    res.render('records/search.ejs', { profiles: null });
};

module.exports.resultRecord = async (req, res) => {
    try {
        const searchCriteria = req.body;
        const query = {};

      
        const firstName = searchCriteria.firstName || '';
        const lastName = searchCriteria.lastName || '';

        // Clean search criteria to filter out empty or invalid values
        const cleanSearchCriteria = {
            ...searchCriteria,
            appearance: searchCriteria.appearance ? Object.fromEntries(
                Object.entries(searchCriteria.appearance).filter(([_, value]) => value && value.toString().trim() !== '')
            ) : {},
            address: searchCriteria.address ? Object.fromEntries(
                Object.entries(searchCriteria.address).filter(([_, value]) => value && value.toString().trim() !== '')
            ) : {}
        };

        // Count provided parameters
        let providedParams = 0;
        const parameterGroups = {
            name: {
                fields: ['firstName', 'lastName'],
                provided: 0
            },
            physical: {
                fields: ['appearance.height', 'appearance.weight', 'appearance.complexion', 'appearance.build'],
                provided: 0
            },
            address: {
                fields: ['address.location', 'address.city', 'address.district', 'address.state'],
                provided: 0
            },
            basic: {
                fields: ['gender', 'dob', 'occupation', 'mNumber'],
                provided: 0
            }
        };

        // Count provided parameters in each group
        Object.entries(cleanSearchCriteria).forEach(([key, value]) => {
            if (value && typeof value === 'object') {
                Object.entries(value).forEach(([nestedKey, nestedValue]) => {
                    if (nestedValue && nestedValue.toString().trim() !== '') {
                        const fullKey = `${key}.${nestedKey}`;
                        for (const group of Object.values(parameterGroups)) {
                            if (group.fields.includes(fullKey)) {
                                group.provided++;
                                providedParams++;
                            }
                        }
                    }
                });
            } else if (value && value.toString().trim() !== '') {
                for (const group of Object.values(parameterGroups)) {
                    if (group.fields.includes(key)) {
                        group.provided++;
                        providedParams++;
                    }
                }
            }
        });

        // Find all profiles and calculate match percentages
       // Generate Soundex codes only if names are provided
       let profiles = [];
       if (firstName || lastName) {
           const firstNameSoundex = firstName ? getSoundex(firstName, false, false) : null;
           const lastNameSoundex = lastName ? getSoundex(lastName, false, false) : null;
           
           // Build query based on available Soundex codes
           const soundexQuery = {};
           if (firstNameSoundex) soundexQuery['soundexCode.firstName'] = firstNameSoundex;
           if (lastNameSoundex) soundexQuery['soundexCode.lastName'] = lastNameSoundex;
           
           profiles = await Profile.find(soundexQuery);
       } else {
           // If no names provided, use other search criteria
           profiles = await Profile.find(query);
        }
        const profilesWithMatches = profiles.map(profile => {
            let totalScore = 0;
            let totalFields = 0;

            // Calculate name match if provided
            if (parameterGroups.name.provided > 0) {
                let nameScore = 0;
                let nameFields = 0;

                if (cleanSearchCriteria.firstName) {
                    nameFields++;
                    nameScore += calculateMatchPercentage(
                        cleanSearchCriteria.firstName.toLowerCase(),
                        (profile.firstNameEnglish || '').toLowerCase()
                    );
                }

                if (cleanSearchCriteria.lastName) {
                    nameFields++;
                    nameScore += calculateMatchPercentage(
                        cleanSearchCriteria.lastName.toLowerCase(),
                        (profile.lastNameEnglish || '').toLowerCase()
                    );
                }

                if (nameFields > 0) {
                    nameScore = nameScore / nameFields;
                    totalScore += nameScore;
                    totalFields++;
                }
            }

            // Calculate physical characteristics match if provided
            if (parameterGroups.physical.provided > 0 && cleanSearchCriteria.appearance) {
                let physicalScore = 0;
                let physicalFields = 0;

                if (cleanSearchCriteria.appearance.height && profile.appearance?.height) {
                    physicalFields++;
                    const heightDiff = Math.abs(profile.appearance.height - cleanSearchCriteria.appearance.height);
                    physicalScore += heightDiff <= 5 ? 100 : heightDiff <= 10 ? 50 : 0;
                }

                if (cleanSearchCriteria.appearance.weight && profile.appearance?.weight) {
                    physicalFields++;
                    const weightDiff = Math.abs(profile.appearance.weight - cleanSearchCriteria.appearance.weight);
                    physicalScore += weightDiff <= 3 ? 100 : weightDiff <= 7 ? 50 : 0;
                }

                if (cleanSearchCriteria.appearance.complexion && profile.appearance?.complexion) {
                    physicalFields++;
                    physicalScore += profile.appearance.complexion === cleanSearchCriteria.appearance.complexion ? 100 : 0;
                }

                if (cleanSearchCriteria.appearance.build && profile.appearance?.build) {
                    physicalFields++;
                    physicalScore += profile.appearance.build === cleanSearchCriteria.appearance.build ? 100 : 0;
                }

                if (physicalFields > 0) {
                    physicalScore = physicalScore / physicalFields;
                    totalScore += physicalScore;
                    totalFields++;
                }
            }

            // Calculate final match percentage
            const matchPercentage = totalFields > 0 ? totalScore / totalFields : 0;

            return {
                ...profile.toObject(),
                matchPercentage
            };
        });

        // Sort by match percentage
        profilesWithMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

        res.render('records/results.ejs', { 
            profiles: profilesWithMatches,
            searchCriteria: cleanSearchCriteria,
            parameterGroups
        });
    } catch (error) {
        console.error('Search error:', error);
        req.flash('error', 'Search failed');
        res.redirect('/search');
    }
};
