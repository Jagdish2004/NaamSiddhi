const Profile = require('../models/profileSchema');

// Get name suggestions based on partial input
async function getNameSuggestions(partialName) {
    try {
        // Search in both English and Hindi names
        const suggestions = await Profile.find({
            $or: [
                { firstNameEnglish: new RegExp(partialName, 'i') },
                { lastNameEnglish: new RegExp(partialName, 'i') },
                { firstNameHindi: new RegExp(partialName, 'i') },
                { lastNameHindi: new RegExp(partialName, 'i') }
            ]
        })
        .limit(5)
        .select('firstNameEnglish lastNameEnglish firstNameHindi lastNameHindi');

        return suggestions;
    } catch (error) {
        console.error('Error getting name suggestions:', error);
        return [];
    }
}

// Get location suggestions
async function getLocationSuggestions(partialLocation) {
    try {
        const suggestions = await Profile.find({
            $or: [
                { 'address.cityEnglish': new RegExp(partialLocation, 'i') },
                { 'address.districtEnglish': new RegExp(partialLocation, 'i') },
                { 'address.stateEnglish': new RegExp(partialLocation, 'i') }
            ]
        })
        .limit(5)
        .select('address');

        // Remove duplicates
        const uniqueLocations = new Set();
        suggestions.forEach(s => {
            uniqueLocations.add(s.address.cityEnglish);
            uniqueLocations.add(s.address.districtEnglish);
            uniqueLocations.add(s.address.stateEnglish);
        });

        return Array.from(uniqueLocations);
    } catch (error) {
        console.error('Error getting location suggestions:', error);
        return [];
    }
}

module.exports = {
    getNameSuggestions,
    getLocationSuggestions
}; 