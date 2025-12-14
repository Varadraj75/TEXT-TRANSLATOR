/**
 * Sarvam API Wrapper
 */

const API_KEY = import.meta.env.VITE_SARVAM_API_KEY;
const API_ENDPOINT = 'https://api.sarvam.ai/translate';

export async function translateText(text, sourceLang, targetLang) {
    if (!text || !text.trim()) return '';

    // Split text by newlines to preserve formatting and handle list items individually
    const lines = text.split('\n');

    // We will map each line to a promise.
    // If a line is empty or just whitespace, we resolve it immediately to keep the spacing.
    // If it has content, we call the API.
    const translationPromises = lines.map(async (line) => {
        if (!line.trim()) {
            return line; // Return original whitespace/empty line
        }

        const payload = {
            input: line,
            source_language_code: sourceLang === 'auto' ? 'auto' : sourceLang,
            target_language_code: targetLang,
            model: "mayura:v1"
        };

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': API_KEY
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Error translating line: "${line}"`, errorData);
                return line; // Fallback to original text on error for this specific line
            }

            const data = await response.json();
            return data.translated_text || data.output || line;

        } catch (error) {
            console.error("Sarvam API Error for line:", line, error);
            return line; // Fallback to original text on error
        }
    });

    // Wait for all lines to be translated
    const translatedLines = await Promise.all(translationPromises);

    // Join them back with newlines to match input orientation
    return translatedLines.join('\n');
}
