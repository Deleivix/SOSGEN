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
    You are an expert marine weather forecaster and coastal radio operator, fluent in both Spanish and English maritime terminology. Your task is to translate the following Spanish AEMET weather bulletin into English.

    **Translation Rules:**
    1.  Maintain the original structure and formatting as much as possible.
    2.  Use standard international maritime meteorological terminology in English.
        *   "Marejadilla" -> "Slight sea"
        *   "Marejada" -> "Moderate sea"
        *   "Fuerte marejada" -> "Rough sea"
        *   "Viento fuerza 5" -> "Wind force 5"
        *   "Aguaceros" -> "Showers"
        *   "Mar de fondo del NW de 2 metros" -> "NW swell of 2 meters"
    3.  Translate all parts of the bulletin, including headers, general situation, and predictions for each zone.

    **Bulletin to Translate:**
    \`\`\`
    ${bulletinText}
    \`\`\`

    Provide ONLY the English translation.
    `;

    const genAIResponse = await ai.models.generateContent({
      model: 'gem-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    });

    const result = genAIResponse.text.trim();
    return response.status(200).json({ result });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to translate bulletin from AI.", details: errorMessage });
  }
}
