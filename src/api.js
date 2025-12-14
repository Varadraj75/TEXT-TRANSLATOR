/**
 * Deep Translator API Wrapper
 * Docs: https://deep-translator-api.azurewebsites.net/docs
 */

const BASE_URL = '/api-proxy';

// Map internal language codes (xx-IN) to standard codes for Google/MyMemory
// Odia is 'or' in Google Translate, 'od' might be used elsewhere but 'or' is safer for Google.
const LANG_MAP = {
    'auto': 'auto',
    'en-IN': 'en',
    'hi-IN': 'hi',
    'mr-IN': 'mr',
    'bn-IN': 'bn',
    'ta-IN': 'ta',
    'te-IN': 'te',
    'kn-IN': 'kn',
    'ml-IN': 'ml',
    'gu-IN': 'gu',
    'pa-IN': 'pa',
    'od-IN': 'or'
};

function getStandardCode(code) {
    return LANG_MAP[code] || code.split('-')[0] || code;
}

// Provider configuration
const PROVIDERS = [
    {
        name: 'google',
        endpoint: '/google/',
        payload: (text, src, tgt) => ({
            text: text,
            source: src,
            target: tgt
        })
    },
    {
        name: 'mymemory',
        endpoint: '/mymemory/',
        payload: (text, src, tgt) => ({
            text: text,
            source: src,
            target: tgt
        })
    }
];

export async function translateText(text, sourceLang, targetLang) {
    if (!text || !text.trim()) return '';

    const sourceCode = getStandardCode(sourceLang);
    const targetCode = getStandardCode(targetLang);

    // Split text by newlines
    const lines = text.split('\n');

    // Sequential Processing settings
    const DELAY_BETWEEN_LINES = 500; // 0.5s delay
    const MAX_RETRIES = 5;

    const translatedLines = new Array(lines.length);

    // Helper: Delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper: Translate Single Line with Provider Fallback & Retries
    const translateLine = async (line, globalIndex) => {
        if (!line.trim()) return line;

        // Try providers in order
        for (const provider of PROVIDERS) {

            // Retry loop for current provider
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    const response = await fetch(`${BASE_URL}${provider.endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(provider.payload(line, sourceCode, targetCode))
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const data = await response.json();

                    // Specific check for validation errors or empty responses
                    if (!data || (!data.translation && !data.translated_text)) {
                        throw new Error('Empty translation response');
                    }

                    return data.translation || data.translated_text;

                } catch (err) {
                    console.warn(`[${provider.name}] Line ${globalIndex} failed (Attempt ${attempt}):`, err);

                    if (attempt < MAX_RETRIES) {
                        // Exponential backoff
                        await delay(1000 * Math.pow(2, attempt - 1));
                    }
                }
            }
            // If we exhaust retries for this provider, loop continues to next provider
            console.warn(`Provider ${provider.name} failed for line ${globalIndex}. Switching provider...`);
        }

        // If all providers fail
        console.error(`All providers failed for line ${globalIndex}. Returning original.`);
        return line;
    };


    // Sequential Loop
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Translate
        translatedLines[i] = await translateLine(line, i);

        // Delay (except last line)
        if (i < lines.length - 1) {
            await delay(DELAY_BETWEEN_LINES);
        }
    }

    return translatedLines.join('\n');
}
