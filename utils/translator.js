require('dotenv').config();
const { Translate } = require('@google-cloud/translate').v2;
const googleTransliterate = require('google-transliterate');

const translate = new Translate({
    key: process.env.GOOGLE_TRANSLATE_API,
});

// 1. Function to detect Hindi script
function detectHindiScript(text) {
    if (!text) return false;
    const hindiRange = /[\u0900-\u097F]/;
    return hindiRange.test(text);
}

// 2. Function to translate text to Hindi
async function translateToHindi(text) {
    if (!text) return '';
    try {
       
        const [translatedText] = await translate.translate(text, {
            to: 'hi',
            from: 'en',
            model: 'nmt'
        });
          
        return translatedText;
    } catch (error) {
        console.error('Hindi translation error:', error);
        return text;
    }
}

// 3. Function to translate text to English
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

// 4. Function to transliterate text to English
async function transliterateToEnglish(text, fieldType = 'text') {
    if (!text) return '';
    try {
         
        
        // For names and special fields, use Google Transliterate
        if (fieldType === 'name') {
            return new Promise((resolve, reject) => {
                googleTransliterate.transliterate(text, 'hi', 'en', (err, results) => {
                    if (err) {
                        console.error('Transliteration error:', err);
                        reject(err);
                    } else {
                           
                        
                        // Extract the first Hindi word suggestion
                        const firstResult = Array.isArray(results) && results.length > 0 && results[0].hws
                            ? results[0].hws[0]  // Take first suggestion from hws array
                            : text;
                        
                        // Capitalize each word
                        const formattedResult = firstResult
                            .split(/\s+/)
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ');
                            
                        resolve(formattedResult);
                    }
                });
            });
        }

        // For other fields, use translation
        const translatedText = await translateToEnglish(text);
        return translatedText;
    } catch (error) {
        console.error('English transliteration error:', error);
        return text;
    }
}

// 5. Function to transliterate text to Hindi
async function transliterateToHindi(text, fieldType = 'text') {
    if (!text) return '';
    try {
        
        // For names and special fields, use Google Transliterate
        if (fieldType === 'name') {
            return new Promise((resolve, reject) => {
                googleTransliterate.transliterate(text, 'en', 'hi', (err, results) => {
                    if (err) {
                        console.error('Transliteration error:', err);
                        reject(err);
                    } else {
                        
                        // Extract the Hindi word suggestions
                        const selectedResult = Array.isArray(results) && results.length > 0 && results[0].hws
                            ? results[0].hws[0]  // Take first Hindi suggestion
                            : text;
                            
                        resolve(selectedResult);
                    }
                });
            });
        }

        // For other fields, use translation
        const translatedText = await translateToHindi(text);
        return translatedText;
    } catch (error) {
        console.error('Hindi transliteration error:', error);
        return text;
    }
}

module.exports = {
    detectHindiScript,
    transliterateToHindi,
    transliterateToEnglish,
    translateToHindi,
    translateToEnglish
}; 