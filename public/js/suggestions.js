function setupSuggestions(inputId, type) {
    const input = document.getElementById(inputId);
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'suggestions glass-effect absolute z-50 w-full mt-1 rounded-md overflow-hidden hidden';
    input.parentNode.appendChild(suggestionsDiv);

    let debounceTimer;

    input.addEventListener('input', async () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const value = input.value;
            if (value.length < 2) {
                suggestionsDiv.classList.add('hidden');
                return;
            }

            try {
                const response = await fetch(`/api/suggestions/${type}?q=${encodeURIComponent(value)}`);
                const suggestions = await response.json();

                if (suggestions.length > 0) {
                    suggestionsDiv.innerHTML = suggestions.map(suggestion => {
                        if (type === 'names') {
                            return `
                                <div class="suggestion-item p-2 hover:bg-blue-400/20 cursor-pointer text-gray-300">
                                    ${suggestion.firstNameEnglish} ${suggestion.lastNameEnglish}
                                    <span class="text-sm text-gray-500">
                                        (${suggestion.firstNameHindi} ${suggestion.lastNameHindi})
                                    </span>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="suggestion-item p-2 hover:bg-blue-400/20 cursor-pointer text-gray-300">
                                    ${suggestion}
                                </div>
                            `;
                        }
                    }).join('');
                    suggestionsDiv.classList.remove('hidden');
                } else {
                    suggestionsDiv.classList.add('hidden');
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        }, 300); // Debounce delay
    });

    // Handle suggestion selection
    suggestionsDiv.addEventListener('click', (e) => {
        const suggestionItem = e.target.closest('.suggestion-item');
        if (suggestionItem) {
            input.value = suggestionItem.textContent.trim().split('(')[0].trim();
            suggestionsDiv.classList.add('hidden');
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.classList.add('hidden');
        }
    });
} 