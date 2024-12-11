/**
 * Normalize input strings for comparison.
 * @param {string} str - Input string
 * @returns {string} - Normalized string
 */
function normalizeString(str) {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u1100-\u11FF\u1200-\u137F\u1380-\u139F\u13A0-\u13FF\u1400-\u167F\u1680-\u169F\u16A0-\u16FF\u1700-\u171F\u1720-\u173F\u1740-\u175F\u1760-\u177F\u1780-\u17FF\u1800-\u18AF\u18B0-\u18FF\u1900-\u194F\u1950-\u197F\u1980-\u19DF\u19E0-\u19FF\u1A00-\u1A1F\u1A20-\u1AAF\u1AB0-\u1AFF\u1B00-\u1B7F\u1B80-\u1BBF\u1BC0-\u1BFF\u1C00-\u1C4F\u1C50-\u1C7F\u1C80-\u1C8F\u1C90-\u1CBF\u1CC0-\u1CCF\u1CD0-\u1CFF\u1D00-\u1D7F\u1D80-\u1DBF\u1DC0-\u1DFF\u1E00-\u1EFF\u1F00-\u1FFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF\u20D0-\u20FF\u2100-\u214F\u2150-\u218F\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u2400-\u243F\u2440-\u245F\u2460-\u24FF\u2500-\u257F\u2580-\u259F\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF\u27C0-\u27EF\u27F0-\u27FF\u2800-\u28FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u2C00-\u2C5F\u2C60-\u2C7F\u2C80-\u2CFF\u2D00-\u2D2F\u2D30-\u2D7F\u2D80-\u2DDF\u2DE0-\u2DFF\u2E00-\u2E7F\u2E80-\u2EFF\u2F00-\u2FDF\u2FF0-\u2FFF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u3100-\u312F\u3130-\u318F\u3190-\u319F\u31A0-\u31BF\u31C0-\u31EF\u31F0-\u31FF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4DC0-\u4DFF\u4E00-\u9FFF\uA000-\uA48F\uA490-\uA4CF\uA4D0-\uA4FF\uA500-\uA63F\uA640-\uA69F\uA6A0-\uA6FF\uA700-\uA71F\uA720-\uA7FF\uA800-\uA82F\uA830-\uA83F\uA840-\uA87F\uA880-\uA8DF\uA8E0-\uA8FF\uA900-\uA92F\uA930-\uA95F\uA960-\uA97F\uA980-\uA9DF\uA9E0-\uA9FF\uAA00-\uAA5F\uAA60-\uAA7F\uAA80-\uAADF\uAAE0-\uAAFF\uAB00-\uAB2F\uAB30-\uAB6F\uAB70-\uABBF\uABC0-\uABFF\uAC00-\uD7AF\uD7B0-\uD7FF\uD800-\uDB7F\uDB80-\uDBFF\uDC00-\uDFFF\uE000-\uF8FF\uF900-\uFAFF\uFB00-\uFB4F\uFB50-\uFDFF\uFE00-\uFE0F\uFE10-\uFE1F\uFE20-\uFE2F\uFE30-\uFE4F\uFE50-\uFE6F\uFE70-\uFEFF\uFF00-\uFFEF\uFFF0-\uFFFF\u{10000}-\u{1007F}\u{10080}-\u{100FF}\u{10100}-\u{1013F}\u{10140}-\u{1018F}\u{10190}-\u{101CF}\u{101D0}-\u{101FF}\u{10200}-\u{1027F}\u{10280}-\u{1029F}\u{102A0}-\u{102DF}\u{102E0}-\u{102FF}\u{10300}-\u{1032F}\u{10330}-\u{1034F}\u{10350}-\u{1037F}\u{10380}-\u{1039F}\u{103A0}-\u{103DF}\u{103E0}-\u{103FF}\u{10400}-\u{1044F}\u{10450}-\u{1047F}\u{10480}-\u{104AF}\u{104B0}-\u{104FF}\u{10500}-\u{1052F}\u{10530}-\u{1056F}\u{10570}-\u{105BF}\u{105C0}-\u{105FF}\u{10600}-\u{1077F}\u{10780}-\u{107BF}\u{107C0}-\u{107FF}\u{10800}-\u{1083F}\u{10840}-\u{1085F}\u{10860}-\u{1087F}\u{10880}-\u{108AF}\u{108B0}-\u{108DF}\u{108E0}-\u{108FF}\u{10900}-\u{1091F}\u{10920}-\u{1093F}\u{10940}-\u{1097F}\u{10980}-\u{1099F}\u{109A0}-\u{109FF}\u{10A00}-\u{10A5F}\u{10A60}-\u{10A7F}\u{10A80}-\u{10A9F}\u{10AA0}-\u{10ABF}\u{10AC0}-\u{10AFF}\u{10B00}-\u{10B3F}\u{10B40}-\u{10B5F}\u{10B60}-\u{10B7F}\u{10B80}-\u{10BAF}\u{10BB0}-\u{10BFF}\u{10C00}-\u{10C4F}\u{10C50}-\u{10C7F}\u{10C80}-\u{10CFF}\u{10D00}-\u{10D3F}\u{10D40}-\u{10E5F}\u{10E60}-\u{10E7F}\u{10E80}-\u{10EBF}\u{10EC0}-\u{10EFF}\u{10F00}-\u{10F2F}\u{10F30}-\u{10F6F}\u{10F70}-\u{10FAF}\u{10FB0}-\u{10FDF}\u{10FE0}-\u{10FFF}\u{11000}-\u{1107F}\u{11080}-\u{110CF}\u{110D0}-\u{110FF}\u{11100}-\u{1114F}\u{11150}-\u{1117F}\u{11180}-\u{111DF}\u{111E0}-\u{111FF}\u{11200}-\u{1124F}\u{11250}-\u{1127F}\u{11280}-\u{112AF}\u{112B0}-\u{112FF}\u{11300}-\u{1137F}\u{11380}-\u{113FF}\u{11400}-\u{1147F}\u{11480}-\u{114DF}\u{114E0}-\u{1157F}\u{11580}-\u{115FF}\u{11600}-\u{1165F}\u{11660}-\u{1167F}\u{11680}-\u{116CF}\u{116D0}-\u{116FF}\u{11700}-\u{1173F}\u{11740}-\u{117FF}\u{11800}-\u{1184F}\u{11850}-\u{1189F}\u{118A0}-\u{118FF}\u{11900}-\u{1195F}\u{11960}-\u{119FF}\u{11A00}-\u{11A4F}\u{11A50}-\u{11AAF}\u{11AB0}-\u{11ABF}\u{11AC0}-\u{11AFF}\u{11B00}-\u{11B5F}\u{11B60}-\u{11BFF}\u{11C00}-\u{11C6F}\u{11C70}-\u{11CBF}\u{11CC0}-\u{11CFF}\u{11D00}-\u{11D5F}\u{11D60}-\u{11DAF}\u{11DB0}-\u{11EDF}\u{11EE0}-\u{11EFF}\u{11F00}-\u{11F5F}\u{11F60}-\u{11FAF}\u{11FB0}-\u{11FBF}\u{11FC0}-\u{11FFF}\u{12000}-\u{123FF}\u{12400}-\u{1247F}\u{12480}-\u{1254F}\u{12550}-\u{12FFF}\u{13000}-\u{1342F}\u{13430}-\u{1343F}\u{13440}-\u{143FF}\u{14400}-\u{1467F}\u{16800}-\u{16A3F}\u{16A40}-\u{16A6F}\u{16A70}-\u{16ACF}\u{16AD0}-\u{16AFF}\u{16B00}-\u{16B8F}\u{16E40}-\u{16E9F}\u{16F00}-\u{16F9F}\u{16FE0}-\u{16FFF}\u{17000}-\u{187FF}\u{18800}-\u{18AFF}\u{18B00}-\u{18CFF}\u{18D00}-\u{18D8F}\u{1B000}-\u{1B0FF}\u{1B100}-\u{1B12F}\u{1B130}-\u{1B16F}\u{1B170}-\u{1B2FF}\u{1BC00}-\u{1BC9F}\u{1BCA0}-\u{1BCAF}\u{1D000}-\u{1D0FF}\u{1D100}-\u{1D1FF}\u{1D200}-\u{1D24F}\u{1D250}-\u{1D2FF}\u{1D300}-\u{1D35F}\u{1D360}-\u{1D37F}\u{1D380}-\u{1D3FF}\u{1D400}-\u{1D7FF}\u{1D800}-\u{1DAAF}\u{1DAB0}-\u{1DFFF}\u{1E000}-\u{1E02F}\u{1E030}-\u{1E08F}\u{1E090}-\u{1E0FF}\u{1E100}-\u{1E14F}\u{1E150}-\u{1E2BF}\u{1E2C0}-\u{1E2FF}\u{1E300}-\u{1E7FF}\u{1E800}-\u{1E8DF}\u{1E8E0}-\u{1E8FF}\u{1E900}-\u{1E95F}\u{1E960}-\u{1EC6F}\u{1EC70}-\u{1ECBF}\u{1ECC0}-\u{1ECFF}\u{1ED00}-\u{1ED4F}\u{1ED50}-\u{1EDFF}\u{1EE00}-\u{1EEFF}\u{1EF00}-\u{1EFFF}\u{1F000}-\u{1F02F}\u{1F030}-\u{1F09F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F650}-\u{1F67F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1FB00}-\u{1FBFF}\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}\u{2CEB0}-\u{2EBEF}\u{2F800}-\u{2FA1F}\u{30000}-\u{3134F}\u{31350}-\u{323AF}\u{E0000}-\u{E007F}\u{E0080}-\u{E00FF}\u{E0100}-\u{E01EF}\u{E01F0}-\u{E0FFF}\u{F0000}-\u{FFFFF}\u{100000}-\u{10FFFF}a-zA-Z0-9\s]/gu, '') // Keep Hindi and English characters
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces
}

/**
 * Calculate Levenshtein Distance between two strings with special handling for Hindi characters
 * @param {string} a - The first string
 * @param {string} b - The second string
 * @returns {number} - The Levenshtein distance
 */
function calculateLevenshteinDistance(a, b) {
  if (!a || !b) return Math.max((a || '').length, (b || '').length);

  const m = [...a].length; // Use spread operator to handle Unicode characters correctly
  const n = [...b].length;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  // Initialize the DP table
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Convert strings to arrays of characters to handle Unicode correctly
  const aChars = [...a];
  const bChars = [...b];

  // Compute the distances
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (aChars[i - 1] === bChars[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate the percentage match based on Levenshtein distance
 * @param {string} input - The input string (e.g., search term)
 * @param {string} target - The target string (e.g., profile name)
 * @returns {number} - The percentage match (0 to 100)
 */
function calculateMatchPercentage(input, target) {
  if (!input || !target) return 0;

  const normalizedInput = normalizeString(input);
  const normalizedTarget = normalizeString(target);

  if (!normalizedInput || !normalizedTarget) return 0;

  const maxLength = Math.max([...normalizedInput].length, [...normalizedTarget].length);
  if (maxLength === 0) return 100; // If both strings are empty

  const levenshteinDistance = calculateLevenshteinDistance(normalizedInput, normalizedTarget);
  const matchPercentage = ((maxLength - levenshteinDistance) / maxLength) * 100;

  return parseFloat(matchPercentage.toFixed(2)); // Round to 2 decimal places
}

module.exports = {
  calculateMatchPercentage,
};
