/**
 * Normalize input strings for comparison.
 * @param {string} str - Input string
 * @returns {string} - Normalized string
 */
function normalizeString(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^a-z0-9\s]/gi, ''); // Remove special characters
}

/**
 * Calculate Levenshtein Distance between two strings
 * @param {string} a - The first string
 * @param {string} b - The second string
 * @returns {number} - The Levenshtein distance
 */
function calculateLevenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  // Initialize the DP table
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Compute the distances
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
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
  const normalizedInput = normalizeString(input);
  const normalizedTarget = normalizeString(target);

  const maxLength = Math.max(normalizedInput.length, normalizedTarget.length);
  if (maxLength === 0) return 100; // If both strings are empty

  const levenshteinDistance = calculateLevenshteinDistance(normalizedInput, normalizedTarget);
  const matchPercentage = ((maxLength - levenshteinDistance) / maxLength) * 100;

  return parseFloat(matchPercentage.toFixed(2)); // Round to 2 decimal places
}

module.exports = {
  calculateMatchPercentage,
};
