
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { textToTranslate, context } = request.body;

  if (!textToTranslate) {
    return response.status(400).json({ error: 'textToTranslate is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    let prompt;
    if (context === 'bulletin') {
      prompt = `
      Translate this Spanish maritime weather bulletin to English.
      - Keep formatting strictly.
      - Translate numbers to words (e.g., "1000 UTC" -> "one zero zero zero UTC") for TTS.
      - Use standard maritime terminology.
      
      TEXT:
      \`\`\`
      ${textToTranslate}
      \`\`\`
      Output ONLY the translation.
      `;
    } else {
      prompt = `Translate the following nautical text between Spanish/English (detect source). Output only translation: "${textToTranslate}"`;
    }

    // Fixed: Use valid Lite model name
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash-lite-preview-02-05'];
    let genAIResponse;
    let lastError;

    for (const model of modelsToTry) {
        try {
            genAIResponse = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: { temperature: 0.1 }
            });
            if (genAIResponse?.text) break;
        } catch (error: any) {
            lastError = error;
            if (error.status === 429 || error.status === 503 || (error.message && error.message.includes('429'))) {
                console.warn(`Translator: Model ${model} failed. Switching...`);
                continue;
            }
            throw error;
        }
    }

    if (!genAIResponse || !genAIResponse.text) {
        throw lastError || new Error("Translation Service Unavailable");
    }

    const translation = genAIResponse.text.trim();
    return response.status(200).json({ translation });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to get translation.", details: errorMessage });
  }
}
