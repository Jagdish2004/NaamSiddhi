const { Translate } = require('@google-cloud/translate').v2;
const translate = new Translate({ key: process.env.GOOGLE_TRANSLATE_API });

// Function to translate text to Hindi
async function translateText(text, targetLanguage = 'hi') {
    if (!text) return '';
    try {
        const [translation] = await translate.translate(text, targetLanguage);
        return translation;
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

// Function to transliterate text (English to Hindi script)
async function transliterate(text) {
    if (!text) return '';
    try {
        const [transliteration] = await translate.translate(text, {
            to: 'hi',
            from: 'en',
            format: 'text',
            model: 'nmt'
        });
        return transliteration;
    } catch (error) {
        console.error('Transliteration error:', error);
        return text;
    }
}

module.exports = {
    translateText,
    transliterate
}; 