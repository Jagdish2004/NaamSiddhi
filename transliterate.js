// Expanded Transliteration Map from English to Hindi (Devanagari)
const transliterationMap = {
    'a': 'अ', 'aa': 'आ', 'b': 'ब', 'c': 'क', 'ch': 'च', 'd': 'द', 'e': 'ए', 'ee': 'ई',
    'f': 'फ', 'g': 'ग', 'h': 'ह', 'i': 'इ', 'ii': 'ई', 'j': 'ज', 'k': 'क', 'kh': 'ख',
    'l': 'ल', 'm': 'म', 'n': 'न', 'ng': 'ङ', 'o': 'ओ', 'oo': 'ऊ', 'p': 'प', 'ph': 'फ',
    'q': 'क', 'r': 'र', 's': 'स', 'sh': 'श', 't': 'त', 'th': 'थ', 'u': 'उ', 'uu': 'ऊ',
    'v': 'व', 'w': 'व', 'x': 'क्ष', 'y': 'य', 'z': 'ज', 'aa': 'आ', 'ai': 'ऐ', 'au': 'औ',
    'b': 'ब', 'bh': 'भ', 'c': 'क', 'chh': 'छ', 'd': 'द', 'dh': 'ध', 'e': 'ए', 'ei': 'ई',
    'f': 'फ', 'g': 'ग', 'gh': 'घ', 'h': 'ह', 'i': 'इ', 'j': 'ज', 'jh': 'झ', 'k': 'क',
    'kh': 'ख', 'l': 'ल', 'm': 'म', 'n': 'न', 'o': 'ओ', 'p': 'प', 'ph': 'फ', 'r': 'र',
    'rh': 'ऱ', 's': 'स', 'sh': 'श', 't': 'त', 'th': 'थ', 'u': 'उ', 'v': 'व', 'w': 'व',
    'x': 'क्ष', 'y': 'य', 'z': 'ज', 'aa': 'आ', 'ai': 'ऐ', 'au': 'औ', 'ka': 'का', 'ki': 'की',
    'ku': 'कू', 'ke': 'के', 'ko': 'को', 'kao': 'काओ', 'kaai': 'काई', 'kya': 'क्या',
    'ra': 'रा', 'ri': 'री', 'ru': 'रू', 're': 'रे', 'ro': 'रो', 'la': 'ला', 'li': 'ली',
    'lu': 'लू', 'le': 'ले', 'lo': 'लो', 'ma': 'मा', 'mi': 'मी', 'mu': 'मू', 'me': 'मे',
    'mo': 'मो', 'na': 'ना', 'ni': 'नी', 'nu': 'नू', 'ne': 'ने', 'no': 'नो', 'sa': 'सा',
    'si': 'सी', 'su': 'सू', 'se': 'से', 'so': 'सो', 'ta': 'ता', 'ti': 'ती', 'tu': 'तू',
    'te': 'ते', 'to': 'तो', 'pa': 'पा', 'pi': 'पी', 'pu': 'पू', 'pe': 'पे', 'po': 'पो',
    'ra': 'रा', 'ri': 'री', 'ru': 'रू', 're': 'रे', 'ro': 'रो', 'ta': 'ता', 'ti': 'ती',
    'tu': 'तू', 'te': 'ते', 'to': 'तो', 'sa': 'सा', 'si': 'सी', 'su': 'सू', 'se': 'से',
    'so': 'सो', 'la': 'ला', 'li': 'ली', 'lu': 'लू', 'le': 'ले', 'lo': 'लो', 'na': 'ना',
    'ni': 'नी', 'nu': 'नू', 'ne': 'ने', 'no': 'नो', 'ma': 'मा', 'mi': 'मी', 'mu': 'मू',
    'me': 'मे', 'mo': 'मो', 'ya': 'या', 'yi': 'यी', 'yu': 'यू', 'ye': 'ये', 'yo': 'यो',
    'ra': 'रा', 'ri': 'री', 'ru': 'रू', 're': 'रे', 'ro': 'रो', 'ta': 'ता', 'ti': 'ती',
    'tu': 'तू', 'te': 'ते', 'to': 'तो', 'pa': 'पा', 'pi': 'पी', 'pu': 'पू', 'pe': 'पे',
    'po': 'पो', 'ba': 'बा', 'bi': 'बी', 'bu': 'बू', 'be': 'बे', 'bo': 'बो', 'dha': 'धा',
    'dhi': 'धी', 'dhu': 'धू', 'dhe': 'धे', 'dho': 'धो', 'bha': 'भा', 'bhi': 'भी', 'bhu': 'भू',
    'bhe': 'भे', 'bho': 'भो', 'cha': 'चा', 'chi': 'ची', 'chu': 'चू', 'che': 'चे', 'cho': 'चो',
    'ja': 'जा', 'ji': 'जी', 'ju': 'जू', 'je': 'जे', 'jo': 'जो', 'nya': 'न्या', 'nye': 'न्ये',
    'tna': 'टना', 'tni': 'टनी', 'tsu': 'टसू', 'tri': 'त्री', 'tso': 'टसो', 'tse': 'टसे'
};

// Function to convert English text to Hindi
function transliterateToHindi(englishText) {
    let hindiText = '';
    let i = 0;

    while (i < englishText.length) {
        // Check for two-character combinations first (like 'sh', 'ch', etc.)
        if (i + 1 < englishText.length && transliterationMap[englishText.substring(i, i + 2)]) {
            hindiText += transliterationMap[englishText.substring(i, i + 2)];
            i += 2;
        }
        // If no two-character combination, check for single character
        else if (transliterationMap[englishText[i]]) {
            hindiText += transliterationMap[englishText[i]];
            i++;
        }
        // If not found in map, just append the character as is (for unsupported characters)
        else {
            hindiText += englishText[i];
            i++;
        }
    }

    return hindiText;
}

module.exports = {transliterateToHindi};
