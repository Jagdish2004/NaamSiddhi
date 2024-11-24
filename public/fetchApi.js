async function fetchSuggestions(field, query) {
    if (!query) return [];

    try {
        const response = await fetch(`/api/suggestions?field=${field}&query=${query}`);
        if (response.ok) {
            const suggestions = await response.json();
            return suggestions;
        } else {
            console.error('Error fetching suggestions:', response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return [];
    }
}
