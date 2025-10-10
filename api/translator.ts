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
      You are an expert translator specializing in maritime and meteorological texts, working for the Spanish Maritime Safety Agency. Your task is to translate the following Spanish weather bulletin into professional, accurate English.
      **Key Translation Instructions:**
      - Maintain the original structure and formatting (line breaks, capitalization of headers).
      - Use standard international maritime terminology.
      - **Preserve Spoken Numbers:** Translate numbers written as words into their English word equivalents (e.g., "seis cero cero UTC" -> "six zero zero UTC"). This is critical for Text-to-Speech (TTS) systems.
      - Translate all content accurately.
      **Spanish Bulletin to Translate:**
      \`\`\`
      ${textToTranslate}
      \`\`\`
      Provide ONLY the English translation, without any additional comments or explanations.
      `;
    } else { // General nautical translation
      prompt = `Eres un experto traductor náutico y marítimo. Tu única tarea es traducir el siguiente texto entre español e inglés. Detecta el idioma de origen y traduce al otro. Proporciona únicamente la traducción directa sin explicaciones adicionales. Si el texto no es náutico, tradúcelo literalmente. Texto a traducir: "${textToTranslate}"`;
    }

    const genAIResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    });

    const translation = genAIResponse.text?.trim() || '';
    return response.status(200).json({ translation });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to get translation from AI.", details: errorMessage });
  }
}