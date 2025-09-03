import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const locations = [
        { name: 'Bilbao', lat: 43.37, lon: -2.76 },
        { name: 'A Coruña', lat: 43.45, lon: -8.28 },
        { name: 'Tarifa', lat: 36.12, lon: -5.76 },
        { name: 'Valencia', lat: 39.47, lon: -0.37 },
        { name: 'Palma', lat: 39.73, lon: 2.71 },
        { name: 'Las Palmas', lat: 28.10, lon: -15.40 }
    ];
    
    const locationList = locations.map(l => `- ${l.name} (Lat: ${l.lat}, Lon: ${l.lon})`).join('\n');

    const prompt = `
        Eres un experto meteorólogo marítimo. Proporciona una previsión marítima concisa para las próximas 24 horas para las siguientes ubicaciones. La salida debe ser EXCLUSIVAMENTE un objeto JSON que coincida con el esquema proporcionado.

        Para \`weatherIcon\`, elige uno de los siguientes valores: 'sunny', 'partly-cloudy', 'cloudy', 'rain', 'heavy-rain', 'thunderstorm', 'windy', 'fog'.
        La dirección del viento debe ser una abreviatura cardinal (N, NE, E, SE, S, SO, O, NO).
        La fuerza del viento debe estar en la escala de Beaufort (número entero).
        La altura de las olas debe ser en metros.
        El resumen del tiempo debe ser una descripción muy breve.

        Ubicaciones:
        ${locationList}
    `;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                locationName: { type: Type.STRING },
                windDirection: { type: Type.STRING },
                windForceBft: { type: Type.INTEGER },
                waveHeightMeters: { type: Type.NUMBER },
                weatherIcon: { type: Type.STRING }
            },
            required: ["locationName", "windDirection", "windForceBft", "waveHeightMeters", "weatherIcon"]
        }
    };

    const genAIResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
      }
    });

    const resultText = genAIResponse.text.trim() || '[]';
    return response.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error("Error in /api/forecast:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate forecast from AI.", details: errorMessage });
  }
}