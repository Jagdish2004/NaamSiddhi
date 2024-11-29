// Add event listener for form submission
document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const searchParams = new URLSearchParams();
    
    for (let [key, value] of formData.entries()) {
        if (value) searchParams.append(key, value);
    }

    try {
        const response = await fetch(`/cases/api/search?${searchParams.toString()}`);
        if (!response.ok) throw new Error('Search failed');
        
        const results = await response.json();
        displayResults(results);
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Failed to perform search', 'error');
    }
});

// Function to display search results
function displayResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (!results.cases || results.cases.length === 0) {
        resultsContainer.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                No cases found matching your criteria
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = results.cases.map(case_ => `
        <div class="glass-effect p-6 rounded-lg hover:bg-blue-400/5 transition-all">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-xl font-nasa text-blue-400">
                        Case #${case_.caseNumber}
                    </h3>
                    <p class="text-gray-400 mt-1">
                        ${case_.caseType.charAt(0).toUpperCase() + case_.caseType.slice(1)} Case
                    </p>
                </div>
                <span class="px-3 py-1 rounded-full text-sm font-nasa
                    ${getStatusClass(case_.status)}">
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

            <div class="mt-4 flex justify-end">
                <a href="/cases/${case_._id}" 
                   class="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-nasa px-4 py-2 rounded-md transition-all">
                    View Details
                </a>
            </div>
        </div>
    `).join('');
}

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