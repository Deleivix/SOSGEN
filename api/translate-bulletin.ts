// This file implements an AI-powered bulletin translation service.
// It takes raw Spanish bulletin text and uses Gemini to translate it to English.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { bulletinText } = request.body;

  if (!bulletinText) {
    return response.status(400).json({ error: 'bulletinText is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const prompt = `
    You are an expert translator specializing in maritime and meteorological texts, working for the Spanish Maritime Safety Agency. Your task is to translate the following Spanish weather bulletin into professional, accurate English.

    **Key Translation Instructions:**
    -   Maintain the original structure and formatting (line breaks, capitalization of headers).
    -   Use standard international maritime terminology. For example:
        -   "Marejadilla" -> "Slight sea"
        -   "Marejada" -> "Moderate sea"
        -   "Fuerte marejada" -> "Rough sea"
        -   "Mar de fondo del NW de 2 metros" -> "NW swell of 2 meters"
        -   "Viento fuerza 5" -> "Wind force 5"
        -   "Aguaceros" -> "Showers"
        -   "Variable 1 a 3" -> "Variable 1 to 3"
        -   "Arreciando a..." -> "Increasing to..."
        -   "Aminando a..." -> "Decreasing to..."
        -   "Rolando a..." -> "Veering to..."
    -   **Preserve Spoken Numbers:** Translate numbers written as words into their English word equivalents. For example, if the input is "seis cero cero UTC", the output must be "six zero zero UTC", NOT "06:00 UTC". This is critical for Text-to-Speech (TTS) systems.
    -   Translate all content, including headers, general situation, predictions, and trend information.
    -   Ensure the final translation is clear, concise, and ready for official broadcast.

    **Spanish Bulletin to Translate:**
    \`\`\`
    ${bulletinText}
    \`\`\`

    Provide ONLY the English translation, without any additional comments or explanations.
    `;

    const genAIResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    });

    const translation = genAIResponse.text.trim();
    return response.status(200).json({ translation });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to translate bulletin from AI.", details: errorMessage });
  }
}