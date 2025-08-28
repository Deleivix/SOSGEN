import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }
  
  const { textToTranslate } = request.body;

  if (!textToTranslate) {
    return response.status(400).json({ error: 'textToTranslate is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const prompt = `Eres un experto traductor náutico y marítimo. Tu única tarea es traducir el siguiente texto entre español e inglés. Detecta el idioma de origen y traduce al otro. Proporciona únicamente la traducción directa sin explicaciones adicionales. Si el texto no es náutico, tradúcelo literalmente. Texto a traducir: "${textToTranslate}"`;
    
    const genAIResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    const translation = genAIResponse.text;
    return response.status(200).json({ translation });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to get translation from AI.", details: errorMessage });
  }
}