import './style.css'
import { translateText } from './api.js'

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('SW registered: ', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}

// Inject HTML Structure
document.querySelector('#app').innerHTML = `
  <div class="container">
    <header class="app-header">
        <h1>QuickTranslate</h1>
        <button id="theme-toggle" aria-label="Toggle Dark Mode">
            <svg class="icon moon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            <svg class="icon sun" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        </button>
    </header>

    <main class="translation-interface">
        <div class="language-controls">
            <div class="lang-select-group">
                <select id="source-lang" aria-label="Source Language">
                    <option value="auto">Detect Language</option>
                    <option value="en-IN">English</option>
                    <option value="hi-IN">Hindi</option>
                    <option value="mr-IN">Marathi</option>
                    <option value="bn-IN">Bengali</option>
                    <option value="ta-IN">Tamil</option>
                    <option value="te-IN">Telugu</option>
                    <option value="kn-IN">Kannada</option>
                    <option value="ml-IN">Malayalam</option>
                    <option value="gu-IN">Gujarati</option>
                    <option value="pa-IN">Punjabi</option>
                    <option value="od-IN">Odia</option>
                </select>
            </div>
            
            <button id="swap-lang" aria-label="Swap Languages" class="icon-btn">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
            </button>

            <div class="lang-select-group">
                <select id="target-lang" aria-label="Target Language">
                    <option value="hi-IN" selected>Hindi</option>
                    <option value="en-IN">English</option>
                    <option value="mr-IN">Marathi</option>
                    <option value="bn-IN">Bengali</option>
                    <option value="ta-IN">Tamil</option>
                    <option value="te-IN">Telugu</option>
                    <option value="kn-IN">Kannada</option>
                    <option value="ml-IN">Malayalam</option>
                    <option value="gu-IN">Gujarati</option>
                    <option value="pa-IN">Punjabi</option>
                    <option value="od-IN">Odia</option>
                </select>
            </div>
        </div>

        <div class="input-area">
            <textarea id="source-text" placeholder="Enter text to translate..." aria-label="Source Text"></textarea>
            <div class="input-actions">
                 <button id="clear-text" class="icon-btn small" title="Clear Text" style="display: none; visibility: hidden;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                 </button>
            </div>
        </div>

        <div class="output-area">
            <div id="target-text" class="translation-result" tabindex="0" role="textbox" aria-readonly="true">
                <span class="placeholder">Translation will appear here...</span>
            </div>
             <div class="output-actions">
                <button id="copy-btn" class="action-btn" aria-label="Copy Translation">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    Copy
                </button>
            </div>
            <div id="loading-indicator" class="loader hidden">
                <div class="spinner"></div>
            </div>
        </div>
    </main>
    <footer class="app-footer">
        <p>Powered by Sarvam AI</p>
    </footer>
  </div>
`

// State & Elements
const sourceLangSelect = document.getElementById('source-lang');
const targetLangSelect = document.getElementById('target-lang');
const sourceText = document.getElementById('source-text');
const targetText = document.getElementById('target-text');
const swapBtn = document.getElementById('swap-lang');
const copyBtn = document.getElementById('copy-btn');
const themeToggle = document.getElementById('theme-toggle');
const loadingIndicator = document.getElementById('loading-indicator');
const clearTextBtn = document.getElementById('clear-text');

let debounceTimer;

// Utilities
const debounce = (func, delay) => {
    return (...args) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func(...args), delay);
    };
};

const setLoading = (isLoading) => {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
};

const updateTranslation = async () => {
    const text = sourceText.value.trim();
    const source = sourceLangSelect.value;
    const target = targetLangSelect.value;

    // Visibility of clear button
    if (text.length > 0) {
        clearTextBtn.style.display = 'block';
        clearTextBtn.style.visibility = 'visible';
    } else {
        clearTextBtn.style.visibility = 'hidden';
    }

    if (!text) {
        targetText.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
        return;
    }

    setLoading(true);
    try {
        const result = await translateText(text, source, target);
        targetText.textContent = result;
    } catch (err) {
        targetText.textContent = "Error: Could not translate. Please check connection.";
    } finally {
        setLoading(false);
    }
};

// Event Listeners

// Input Debounce
sourceText.addEventListener('input', debounce(updateTranslation, 800));

// Language Change
sourceLangSelect.addEventListener('change', updateTranslation);
targetLangSelect.addEventListener('change', updateTranslation);

// Swap Languages
swapBtn.addEventListener('click', () => {
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;

    if (sourceVal === 'auto') {
        // Can't swap if auto is selected (or we could default to English, but let's just alert or ignore)
        // For better UX, let's just ignore or switch to English if auto
        return;
    }

    sourceLangSelect.value = targetVal;
    targetLangSelect.value = sourceVal;

    // Swap text content as well if there is a result
    const currentSource = sourceText.value;
    const currentTarget = targetText.textContent;

    // Only swap if we have a valid translation to swap back
    if (currentTarget && !targetText.querySelector('.placeholder') && !currentTarget.startsWith('Error:')) {
        sourceText.value = currentTarget;
        targetText.textContent = currentSource; // This might not be accurate translation back, but standard behavior
    }

    updateTranslation();
});

// Clear Text
clearTextBtn.addEventListener('click', () => {
    sourceText.value = '';
    targetText.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
    clearTextBtn.style.visibility = 'hidden';
    sourceText.focus();
});

// Copy Translation
copyBtn.addEventListener('click', () => {
    const textToCopy = targetText.textContent;
    if (textToCopy && !targetText.querySelector('.placeholder')) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Copied!
            `;
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        });
    }
});

// Theme Toggle
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

