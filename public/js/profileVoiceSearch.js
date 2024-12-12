let currentInputTarget = null;
let recognition = null;
let currentLanguage = 'hi-IN'; // Default to Hindi

function showListeningIndicator(show) {
    const indicator = document.getElementById('listeningIndicator');
    if (show) {
        indicator.classList.remove('hidden');
        indicator.classList.add('flex');
    } else {
        indicator.classList.add('hidden');
        indicator.classList.remove('flex');
    }
}

function updateListeningStatus(message) {
    document.getElementById('listeningStatus').textContent = message;
}

function toggleGlobalLanguage() {
    if (currentLanguage === 'hi-IN') {
        currentLanguage = 'en-IN';
        document.getElementById('globalCurrentLang').textContent = 'Input Language: English';
    } else {
        currentLanguage = 'hi-IN';
        document.getElementById('globalCurrentLang').textContent = 'Input Language: हिंदी';
    }

    // Restart recognition if it's active
    if (recognition) {
        recognition.stop();
        startSpeechRecognition();
    }
}

function toggleSpeechRecognition(inputId) {
    const modal = document.getElementById('speechModal');
    modal.style.display = 'flex';
    currentInputTarget = inputId;
    startSpeechRecognition();
}

function closeSpeechModal() {
    const modal = document.getElementById('speechModal');
    modal.style.display = 'none';
    currentInputTarget = null;
    showListeningIndicator(false);
    
    // Stop recognition if it's active
    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
        recognition = null;
    }
}

function startSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Speech recognition is not supported in your browser. Please use Chrome.');
        closeSpeechModal();
        return;
    }

    // Stop any existing recognition
    if (recognition) {
        recognition.stop();
        recognition = null;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    // Set language based on current selection
    recognition.lang = currentLanguage;

    recognition.onstart = function() {
        showListeningIndicator(true);
        updateListeningStatus(`Listening in ${currentLanguage === 'hi-IN' ? 'हिंदी' : 'English'}...`);
        document.getElementById('speechStatus').textContent = 'Speak now';
    };

    recognition.onresult = function(event) {
        const result = event.results[0][0].transcript;
        const input = document.getElementById(currentInputTarget);
        if (input) {
            input.value = result;
        }
        updateListeningStatus('Done!');
        setTimeout(() => {
            closeSpeechModal();
            showListeningIndicator(false);
        }, 1000);
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        updateListeningStatus('Error occurred');
        document.getElementById('speechStatus').textContent = 'Error occurred. Please try again.';
        setTimeout(() => {
            closeSpeechModal();
            showListeningIndicator(false);
        }, 1500);
    };

    recognition.onend = function() {
        if (document.getElementById('speechModal').style.display === 'flex') {
            document.getElementById('speechStatus').textContent = 'Finished listening.';
            setTimeout(() => {
                closeSpeechModal();
                showListeningIndicator(false);
            }, 1000);
        }
        recognition = null;
    };

    try {
        recognition.start();
    } catch (error) {
        console.error('Speech recognition error:', error);
        closeSpeechModal();
        showListeningIndicator(false);
    }
}

// Add event listeners when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add click listeners to voice search buttons
    const voiceButtons = document.querySelectorAll('.voice-search-btn');
    voiceButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetInput = this.getAttribute('data-target');
            toggleSpeechRecognition(targetInput);
        });
    });

    // Add click listener to global language toggle button
    const globalLangToggleBtn = document.getElementById('globalLangToggleBtn');
    if (globalLangToggleBtn) {
        globalLangToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleGlobalLanguage();
        });
    }

    // Add click listener to modal close button
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeSpeechModal();
        });
    }

    // Add click listener to modal background for closing
    const modal = document.getElementById('speechModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeSpeechModal();
            }
        });
    }
});
