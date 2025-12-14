/**
 * Sarvam API Wrapper
 */

const API_KEY = import.meta.env.VITE_SARVAM_API_KEY;
const API_ENDPOINT = 'https://api.sarvam.ai/translate';

export async function translateText(text, sourceLang, targetLang) {
    if (!text || !text.trim()) return '';

    // Split text by newlines to preserve formatting and handle list items individually
    const lines = text.split('\n');

    // Batch processing to avoid rate limiting
    // Switching to BATCH_SIZE = 1 (Sequential) to ensure 100% reliability as per user request.
    const BATCH_SIZE = 1;
    const DELAY_BETWEEN_BATCHES = 500; // 0.5 second delay between lines
    const MAX_RETRIES = 5; // Increased retries for stubborn lines

    const translatedLines = new Array(lines.length);

    // Helper for delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper for translation with retry
    const translateLineWithRetry = async (line, globalIndex, attempt = 1) => {
        if (!line.trim()) {
            return line;
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
                if (attempt < MAX_RETRIES) {
                    // Exponential backoff: 1s, 2s, 4s
                    const backoff = 1000 * Math.pow(2, attempt - 1);
                    console.warn(`Line ${globalIndex} failed (Attempt ${attempt}). Retrying in ${backoff}ms...`);
                    await delay(backoff);
                    return translateLineWithRetry(line, globalIndex, attempt + 1);
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.translated_text || data.output || line;

        } catch (error) {
            console.error(`Sarvam API Error for line ${globalIndex} (Attempt ${attempt}):`, error);
            if (attempt < MAX_RETRIES) {
                const backoff = 1000 * Math.pow(2, attempt - 1);
                await delay(backoff);
                return translateLineWithRetry(line, globalIndex, attempt + 1);
            }
            return line; // Fallback to original
        }
    };

    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
        const batch = lines.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map((line, index) => {
            const globalIndex = i + index;
            // Execute translation and assign to correct index
            return translateLineWithRetry(line, globalIndex).then(result => {
                translatedLines[globalIndex] = result;
            });
        });

        // Wait for the current batch to complete
        await Promise.all(batchPromises);

        // Add delay between batches if it's not the last batch
        if (i + BATCH_SIZE < lines.length) {
            await delay(DELAY_BETWEEN_BATCHES);
        }
    }

    // Join them back with newlines to match input orientation
    return translatedLines.join('\n');
}
