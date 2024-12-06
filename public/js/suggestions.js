document.addEventListener('DOMContentLoaded', function() {
    console.log('Suggestions script loaded');

    const searchInput = document.querySelector('#search-input');
    if (!searchInput) {
        console.error('Search input not found!');
        return;
    }

    // Create suggestions container
    const suggestionsList = document.createElement('ul');
    suggestionsList.className = 'suggestions-list absolute w-full bg-white border border-gray-300 rounded-b shadow-lg z-50 max-h-60 overflow-y-auto';
    searchInput.parentElement.appendChild(suggestionsList);

    let debounceTimer;

    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        
        if (!this.value.trim()) {
            suggestionsList.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`/analytics/api/suggestions?query=${encodeURIComponent(this.value)}`);
                if (!response.ok) throw new Error('Network response was not ok');
                
                const suggestions = await response.json();
                
                // Clear previous suggestions
                suggestionsList.innerHTML = '';
                
                if (suggestions.length === 0) {
                    suggestionsList.innerHTML = `
                        <li class="px-4 py-2 text-gray-500">No matches found</li>
                    `;
                    return;
                }

                // Add new suggestions
                suggestions.forEach(suggestion => {
                    const li = document.createElement('li');
                    li.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
                    
                    // Highlight matching text
                    const searchValue = searchInput.value.toLowerCase();
                    const suggestionText = suggestion.name;
                    const matchIndex = suggestionText.toLowerCase().indexOf(searchValue);
                    
                    if (matchIndex >= 0) {
                        const before = suggestionText.slice(0, matchIndex);
                        const match = suggestionText.slice(matchIndex, matchIndex + searchValue.length);
                        const after = suggestionText.slice(matchIndex + searchValue.length);
                        li.innerHTML = `${before}<strong class="font-bold">${match}</strong>${after}`;
                    } else {
                        li.textContent = suggestionText;
                    }

                    li.addEventListener('click', () => {
                        searchInput.value = suggestion.name;
                        suggestionsList.innerHTML = '';
                        // Submit the form
                        searchInput.closest('form').submit();
                    });
                    suggestionsList.appendChild(li);
                });
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        }, 300);
    });

    // Handle keyboard navigation
    searchInput.addEventListener('keydown', function(e) {
        const items = suggestionsList.getElementsByTagName('li');
        const activeItem = suggestionsList.querySelector('.bg-gray-100');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!activeItem) {
                    items[0]?.classList.add('bg-gray-100');
                } else {
                    const nextItem = activeItem.nextElementSibling;
                    if (nextItem) {
                        activeItem.classList.remove('bg-gray-100');
                        nextItem.classList.add('bg-gray-100');
                    }
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (activeItem) {
                    const prevItem = activeItem.previousElementSibling;
                    activeItem.classList.remove('bg-gray-100');
                    if (prevItem) {
                        prevItem.classList.add('bg-gray-100');
                    }
                }
                break;
                
            case 'Enter':
                if (activeItem) {
                    e.preventDefault();
                    activeItem.click();
                }
                break;
                
            case 'Escape':
                suggestionsList.innerHTML = '';
                break;
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.innerHTML = '';
        }
    });

    // Add input event listeners for all name fields
    const firstNameInput = document.getElementById('firstNameInput');
    const middleNameInput = document.getElementById('middleNameInput');
    const lastNameInput = document.getElementById('lastNameInput');

    firstNameInput.addEventListener('input', () => {
        console.log('First name input changed:', firstNameInput.value);
        fetchSuggestions('firstName');
    });

    middleNameInput.addEventListener('input', () => {
        console.log('Middle name input changed:', middleNameInput.value);
        fetchSuggestions('middleName');
    });

    lastNameInput.addEventListener('input', () => {
        console.log('Last name input changed:', lastNameInput.value);
        fetchSuggestions('lastName');
    });

    // Update fetchSuggestions function with debugging
    async function fetchSuggestions(type) {
        const input = document.getElementById(`${type}Input`).value;
        console.log(`Fetching suggestions for ${type}:`, input);
        
        const suggestionsList = document.getElementById(`${type}SuggestionsList`);
        const otherTypes = ['firstName', 'middleName', 'lastName'].filter(t => t !== type);
        
        // Hide other suggestion lists
        otherTypes.forEach(otherType => {
            const otherList = document.getElementById(`${otherType}SuggestionsList`);
            if (otherList) otherList.style.display = 'none';
        });

        if (input.trim().length < 2) {
            console.log('Input too short, hiding suggestions');
            suggestionsList.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/api/suggestions?type=${type}&query=${encodeURIComponent(input)}`);
            if (!response.ok) throw new Error('Failed to fetch suggestions');
            
            const suggestions = await response.json();
            console.log(`Received suggestions for ${type}:`, suggestions);

            if (suggestions.length === 0) {
                suggestionsList.style.display = 'none';
                return;
            }

            suggestionsList.innerHTML = suggestions.map(suggestion => {
                const nameField = type === 'firstName' ? 'firstNameEnglish' :
                                type === 'middleName' ? 'middleNameEnglish' : 'lastNameEnglish';
                const hindiField = type === 'firstName' ? 'firstNameHindi' :
                                 type === 'middleName' ? 'middleNameHindi' : 'lastNameHindi';
                
                return `
                    <li class="px-4 py-2 hover:bg-blue-400/20 cursor-pointer transition-all"
                        onclick="selectSuggestion('${type}', '${suggestion[nameField]}')">
                        ${suggestion[nameField]}
                        <span class="text-sm text-gray-400">(${suggestion[hindiField] || ''})</span>
                    </li>
                `;
            }).join('');

            suggestionsList.style.display = 'block';
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            suggestionsList.style.display = 'none';
        }
    }

    // Update click handler to hide all suggestion lists
    document.addEventListener('click', function(e) {
        const suggestionLists = ['firstName', 'middleName', 'lastName'].map(type => 
            document.getElementById(`${type}SuggestionsList`)
        );
        const inputs = ['firstName', 'middleName', 'lastName'].map(type => 
            document.getElementById(`${type}Input`)
        );

        if (!inputs.includes(e.target)) {
            suggestionLists.forEach(list => {
                if (list) list.style.display = 'none';
            });
        }
    });
});
  