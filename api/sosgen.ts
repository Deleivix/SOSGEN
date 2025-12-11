
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { naturalInput } = request.body;

  if (!naturalInput) {
    return response.status(400).json({ error: 'naturalInput is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        stationName: { type: Type.STRING, description: "El nombre completo de la estación de radio costera si se especifica." },
        mrcc: { type: Type.STRING, description: "El nombre del centro de Salvamento Marítimo." },
        spanishDescription: { type: Type.STRING, description: "Descripción factual del suceso en español." },
        englishDescription: { type: Type.STRING, description: "Factual description of the incident in English." }
      },
      required: ["spanishDescription", "englishDescription"]
    };
    
    const prompt = `
    Analiza el siguiente texto de socorro marítimo y extrae datos para un formato MAYDAY RELAY.
    
    **Texto:** "${naturalInput}"
    
    1. Redacta una descripción natural y concisa en ESPAÑOL e INGLÉS integrando: Buque, MMSI, POB, Posición y Peligro.
    2. NO INVENTES DATOS. Usa solo lo proporcionado.
    3. Extrae nombre de estación y MRCC si existen.
    
    Devuelve JSON.`;

    // Strategy: Primary -> Lite -> Legacy Flash (1.5) for maximum availability
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash-lite-preview-02-05', 'gemini-1.5-flash'];
    let genAIResponse;
    let lastError;

    for (const model of modelsToTry) {
        try {
            genAIResponse = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.1, // Low temp for factual extraction
                }
            });
            if (genAIResponse?.text) break;
        } catch (error: any) {
            lastError = error;
            if (error.status === 429 || error.status === 503 || (error.message && error.message.includes('429'))) {
                console.warn(`SOSGEN: Model ${model} quota exceeded. Switching...`);
                continue;
            }
            throw error;
        }
    }

    if (!genAIResponse || !genAIResponse.text) {
        throw lastError || new Error("AI Service Unavailable");
    }

    const resultText = genAIResponse.text.trim();
    return response.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate message.", details: errorMessage });
  }
}
