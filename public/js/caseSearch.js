// Event listener for search form submission
document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    await performSearch();
});

// Function to perform search
async function performSearch() {
    const formData = new FormData(document.getElementById('searchForm'));
    const searchParams = new URLSearchParams();
    
    // Add all form fields to search params
    for (let [key, value] of formData.entries()) {
        if (value) searchParams.append(key, value);
    }

    try {
        // Show loading state
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <svg class="animate-spin h-8 w-8 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
            </div>
        `;

        const response = await fetch(`/cases/api/search?${searchParams.toString()}`);
        if (!response.ok) throw new Error('Search failed');
        
        const results = await response.json();
        displayResults(results);
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Failed to perform search', 'error');
    }
}

// Function to display search results
function displayResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (!results.cases || results.cases.length === 0) {
        resultsContainer.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>No cases found matching your search criteria</p>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = results.cases.map(case_ => `
        <div class="glass-effect p-6 rounded-lg hover:bg-blue-400/5 transition-all mb-4">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-xl font-nasa text-blue-400">
                        Case #${case_.caseNumber}
                    </h3>
                    <p class="text-gray-400 mt-1">
                        ${case_.caseType.charAt(0).toUpperCase() + case_.caseType.slice(1)} Case
                    </p>
                    <p class="text-gray-300 mt-2">
                        ${case_.description.english.substring(0, 150)}...
                    </p>
                </div>
                <span class="px-3 py-1 rounded-full text-sm font-nasa ${getStatusClass(case_.status)}">
                    ${case_.status.charAt(0).toUpperCase() + case_.status.slice(1)}
                </span>
            </div>
            
            <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p class="text-gray-400">Location</p>
                    <p class="text-white">${case_.location.city.english}, ${case_.location.district.english}</p>
                </div>
                <div>
                    <p class="text-gray-400">Date Filed</p>
                    <p class="text-white">${new Date(case_.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            <div class="mt-4 flex justify-between items-center">
                <div class="text-sm text-gray-400">
                    ${case_.profiles.length} Connected Profile${case_.profiles.length !== 1 ? 's' : ''}
                </div>
                <a href="/cases/${case_._id}" 
                   class="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-nasa px-4 py-2 rounded-md transition-all">
                    View Details
                </a>
            </div>
        </div>
    `).join('');
}

// Function to get status class for styling
function getStatusClass(status) {
    switch (status) {
        case 'active':
            return 'bg-green-500/20 text-green-400';
        case 'pending':
            return 'bg-yellow-500/20 text-yellow-400';
        case 'closed':
            return 'bg-red-500/20 text-red-400';
        default:
            return 'bg-gray-500/20 text-gray-400';
    }
}

// Function to show notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
} 