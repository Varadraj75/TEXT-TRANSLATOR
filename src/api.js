/**
 * Sarvam API Wrapper
 */

const API_KEY = import.meta.env.VITE_SARVAM_API_KEY;
const API_ENDPOINT = 'https://api.sarvam.ai/translate';

export async function translateText(text, sourceLang, targetLang) {
    if (!text || !text.trim()) return '';

    // Handle 'auto' source language if needed
    // Sarvam mayura:v1 supports 'auto' for source_language_code according to docs found
    const sourceCode = sourceLang === 'auto' ? null : sourceLang; // sending null or omitting might trigger auto-detect? 
    // Wait, documentation said "mayura:v1 model supports 'auto'".

    const payload = {
        input: text,
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
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }

        const data = await response.json();

        // Check response structure - usually { translated_text: "..." }
        return data.translated_text || data.output || "Translation error";

    } catch (error) {
        console.error("Sarvam API Error:", error);
        throw error;
    }
}
