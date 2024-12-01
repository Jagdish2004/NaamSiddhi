require('dotenv').config();
const { Translate } = require('@google-cloud/translate').v2;
const Sanscript = require('@indic-transliteration/sanscript');

const translate = new Translate({
    key: process.env.GOOGLE_TRANSLATE_API,
});

// Function to detect language
async function detectLanguage(text) {
    if (!text) return 'en';
    try {
        const [detection] = await translate.detect(text);
        return detection.language;
    } catch (error) {
        console.error('Language detection error:', error);
        return 'en';
    }
}

// Function to transliterate names from English to Hindi
function transliterateName(text, toHindi = true) {
    if (!text) return '';
    try {
        if (toHindi) {
            // English to Hindi
            return Sanscript.t(text, 'itrans', 'devanagari');
        } else {
            // Hindi to English
            const hk = Sanscript.t(text, 'devanagari', 'hk');
            // Convert HK to readable English
            return hk.split(' ')
                .map(word => {
                    word = word.replace(/aa/g, 'a')
                           .replace(/ii/g, 'i')
                           .replace(/uu/g, 'u')
                           .replace(/[~\.]/g, '')
                           .replace(/nn/g, 'n')
                           .replace(/ch/g, 'ch');
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                })
                .join(' ');
        }
    } catch (error) {
        console.error('Name transliteration error:', error);
        return text;
    }
}

// Function to transliterate text from English to Hindi script
async function transliterateToHindi(text, fieldType = 'text') {
    if (!text) return '';
    try {
        // For names, use Sanscript transliteration
        if (fieldType === 'name') {
            return transliterateName(text, true);
        }

        // For other fields, use Google Translate
        const [transliteratedText] = await translate.translate(text, {
            to: 'hi',
            from: 'en',
            format: 'text',
            model: 'nmt'
        });
        return transliteratedText;
    } catch (error) {
        console.error('Hindi transliteration error:', error);
        return text;
    }
}

// Function to translate text from Hindi to English
async function translateToEnglish(text) {
    if (!text) return '';
    try {
        const [translatedText] = await translate.translate(text, {
            to: 'en',
            from: 'hi',
            model: 'nmt'
        });
        return translatedText;
    } catch (error) {
        console.error('English translation error:', error);
        return text;
    }
}

// Function to transliterate text from Hindi to English script
async function transliterateToEnglish(text, fieldType = 'text') {
    if (!text) return '';
    try {
        // For names, use Sanscript transliteration
        if (fieldType === 'name') {
            return transliterateName(text, false);
        }

        // For occupation, use translation
        if (fieldType === 'occupation') {
            return await translateToEnglish(text);
        }

        // For other fields, use Google Translate
        const [transliteratedText] = await translate.translate(text, {
            to: 'en',
            from: 'hi',
            format: 'text',
            model: 'nmt'
        });

        // Capitalize first letter of each word
        return transliteratedText.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    } catch (error) {
        console.error('English transliteration error:', error);
        return text;
    }
}

// Helper function to check if text contains Hindi characters
function containsHindi(text) {
    if (!text) return false;
    const hindiRange = /[\u0900-\u097F]/;
    return hindiRange.test(text);
}

module.exports = {
    detectLanguage,
    transliterateToHindi,
    transliterateToEnglish,
    translateToEnglish,
    containsHindi
}; 