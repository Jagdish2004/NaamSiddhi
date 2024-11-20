const Profile = require('../models/profileSchema'); // Assuming your model file is at this path
const {getSoundex} = require('../soundex');
const {Translate} = require('@google-cloud/translate').v2;
require('dotenv').config();

// Initialize Google Translate client
const translate = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API,
});

module.exports.createRecord = (req, res) => {
  res.render('records/new.ejs');
};


module.exports.saveRecord = async (req, res) => {
    console.log(req.body);
    try {
      const {
        firstName, lastName, occupation, dob, gender, role, mNumber,
        address, description
      } = req.body;

      const firstNameSoundex = getSoundex(firstName, false, false); // Generate Soundex code for first name
      const lastNameSoundex = getSoundex(lastName, false, false);

      // Translate fields to Hindi
      const translateText = async (text) => {
        try {
          const [translatedText] = await translate.translate(text, 'hi'); // 'hi' is the language code for Hindi
          return translatedText;
        } catch (error) {
          console.error('Error translating text:', error);
          return text;
        }
      };
      const transliterateToHindi = async (text) => {
        try {
          // Transliteration using Google Translate API by keeping the source language as `en` and target as `hi`
          const [transliteratedText] = await translate.translate(text, {
            to: 'hi', // Target Hindi script
            from: 'en', // Source English script
            format: 'text', // Ensure it's treated as text, not translated
            model: 'nmt', // Neural Machine Translation
          });
      
          // Return the transliterated text
          return transliteratedText;
        } catch (error) {
          console.error('Error during transliteration:', error.message);
          return text; // Return original text if transliteration fails
        }
      };
      

      // Translate the required fields
      const firstNameHindi = await transliterateToHindi(firstName);
      const lastNameHindi = await transliterateToHindi(lastName);
      const occupationHindi = await translateText(occupation);
      const locationHindi = await transliterateToHindi(address.location);
      const cityHindi = await transliterateToHindi(address.city);
      const districtHindi = await transliterateToHindi(address.district);
      const stateHindi = await translateText(address.state);
      const descriptionHindi = await translateText(description);

      // Create a new profile (id will be automatically generated)
      const profile = new Profile({
        soundexCode: {
          firstName: firstNameSoundex, // Store Soundex code for first name in the nested object
          lastName: lastNameSoundex,   // Store Soundex code for last name in the nested object
        },
        firstNameHindi,  // Translated first name to Hindi
        firstNameEnglish: firstName,
        lastNameHindi,   // Translated last name to Hindi
        lastNameEnglish: lastName,
        occupationHindi, // Translated occupation to Hindi
        occupationEnglish: occupation,
        dob,
        gender,
        role,
        mNumber,
        address: {
          locationHindi, // Translated location to Hindi
          locationEnglish: address.location,
          cityHindi,     // Translated city to Hindi
          cityEnglish: address.city,
          districtHindi, // Translated district to Hindi
          districtEnglish: address.district,
          stateHindi,    // Translated state to Hindi
          stateEnglish: address.state,
        },
        descriptionHindi, // Translated description to Hindi
        descriptionEnglish: description,
      });

      // Save the profile to the database
      console.log(profile);
      await profile.save();
      res.redirect('/success'); // Redirect to a success page after saving the record
  
    } catch (err) {
      console.error(err);
      res.status(500).send('Error saving record');
    }
};