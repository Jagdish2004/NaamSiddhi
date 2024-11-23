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

        // Extract firstName and lastName from searchCriteria
        const firstName = searchCriteria.firstName || '';
        const lastName = searchCriteria.lastName || '';

        // Validate and clean search criteria
        const cleanSearchCriteria = {
            ...searchCriteria,
            appearance: searchCriteria.appearance ? Object.fromEntries(
                Object.entries(searchCriteria.appearance).filter(([_, value]) => value && value.toString().trim() !== '')
            ) : {},
            address: searchCriteria.address ? Object.fromEntries(
                Object.entries(searchCriteria.address).filter(([_, value]) => value && value.toString().trim() !== '')
            ) : {}
        };

        // Count provided parameters and calculate weights
        let providedParams = 0;
        let totalWeight = 0;

        // Define parameter groups and their weights
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

        // Calculate adjusted weights
        for (const group of Object.values(parameterGroups)) {
            if (group.provided > 0) {
                const groupWeight = (group.weight * group.provided) / group.fields.length;
                totalWeight += groupWeight;
            }
        }

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

            // Calculate name match if provided
            if (parameterGroups.name.provided > 0) {
                let nameScore = 0;
                if (cleanSearchCriteria.firstName) {
                    nameScore += calculateMatchPercentage(
                        cleanSearchCriteria.firstName.toLowerCase(),
                        (profile.firstNameEnglish || '').toLowerCase()
                    );
                }
                if (cleanSearchCriteria.lastName) {
                    nameScore += calculateMatchPercentage(
                        cleanSearchCriteria.lastName.toLowerCase(),
                        (profile.lastNameEnglish || '').toLowerCase()
                    );
                }
                nameScore = nameScore / parameterGroups.name.provided;
                totalScore += (nameScore * parameterGroups.name.weight) / totalWeight;
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
                    totalScore += (physicalScore * parameterGroups.physical.weight) / totalWeight;
                }
            }

            // Calculate address match if provided
            if (parameterGroups.address.provided > 0 && cleanSearchCriteria.address) {
                let addressScore = 0;
                let addressFields = 0;

                const addressFieldsList = ['location', 'city', 'district', 'state'];
                addressFieldsList.forEach(field => {
                    if (cleanSearchCriteria.address[field] && profile.address?.[`${field}English`]) {
                        addressFields++;
                        addressScore += calculateMatchPercentage(
                            cleanSearchCriteria.address[field].toLowerCase(),
                            profile.address[`${field}English`].toLowerCase()
                        );
                    }
                });

                if (addressFields > 0) {
                    addressScore = addressScore / addressFields;
                    totalScore += (addressScore * parameterGroups.address.weight) / totalWeight;
                }
            }

            // Calculate basic info match if provided
            if (parameterGroups.basic.provided > 0) {
                let basicScore = 0;
                let basicFields = 0;

                if (cleanSearchCriteria.gender && profile.gender) {
                    basicFields++;
                    basicScore += profile.gender === cleanSearchCriteria.gender ? 100 : 0;
                }

                if (cleanSearchCriteria.dob && profile.dob) {
                    basicFields++;
                    basicScore += profile.dob.toISOString().split('T')[0] === cleanSearchCriteria.dob ? 100 : 0;
                }

                if (cleanSearchCriteria.occupation && profile.occupationEnglish) {
                    basicFields++;
                    basicScore += calculateMatchPercentage(
                        cleanSearchCriteria.occupation.toLowerCase(),
                        profile.occupationEnglish.toLowerCase()
                    );
                }

                if (cleanSearchCriteria.mNumber && profile.mNumber) {
                    basicFields++;
                    basicScore += profile.mNumber === cleanSearchCriteria.mNumber ? 100 : 0;
                }

                if (basicFields > 0) {
                    basicScore = basicScore / basicFields;
                    totalScore += (basicScore * parameterGroups.basic.weight) / totalWeight;
                }
            }

            return {
                ...profile.toObject(),
                matchPercentage: totalScore.toFixed(2),
                providedParams,
                totalParams: Object.values(parameterGroups).reduce((acc, group) => acc + group.fields.length, 0)
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
                provided: providedParams,
                total: Object.values(parameterGroups).reduce((acc, group) => acc + group.fields.length, 0)
            }
        });
    } catch (error) {
        console.error('Error searching profiles:', error);
        req.flash('error', 'An error occurred while searching profiles');
        res.redirect('/search');
    }
};
