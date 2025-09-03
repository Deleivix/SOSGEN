import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// --- Server-Side Cache ---
interface Cache<T> {
  data: T | null;
  timestamp: number;
}
const forecastCache: Cache<any> = {
  data: null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes


export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- Check Cache ---
  const now = Date.now();
  if (forecastCache.data && (now - forecastCache.timestamp < CACHE_DURATION_MS)) {
    console.log("Serving forecast data from cache.");
    return response.status(200).json(forecastCache.data);
  }
  console.log("Fetching fresh forecast data (cache stale or empty).");

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    // Lista de ubicaciones filtrada para la costa norte de España (Galicia, Asturias, Cantabria, País Vasco)
    // con una distancia mínima de 50km entre ellas.
    const locations = [
        { name: 'Pasajes', lat: 43.34, lon: -1.85 },
        { name: 'Bilbao', lat: 43.37, lon: -2.76 },
        { name: 'Santander', lat: 43.29, lon: -4.14 },
        { name: 'Cabo Peñas', lat: 43.49, lon: -5.94 },
        { name: 'Navia', lat: 43.45, lon: -6.82 },
        { name: 'Cabo Ortegal', lat: 43.71, lon: -7.89 },
        { name: 'Coruña', lat: 43.45, lon: -8.28 },
        { name: 'Finisterre', lat: 43.07, lon: -9.22 },
        { name: 'Vigo', lat: 42.31, lon: -8.70 }
    ];
    
    const locationList = locations.map(l => `- ${l.name} (Lat: ${l.lat}, Lon: ${l.lon})`).join('\n');

    const prompt = `
        Eres un experto meteorólogo marítimo. Proporciona una previsión marítima concisa y detallada para las próximas 24 horas para las siguientes ubicaciones. La salida debe ser EXCLUSIVAMENTE un array de objetos JSON que coincida con el esquema proporcionado.

        Para \`weatherIcon\`, elige uno de los siguientes valores: 'sunny', 'partly-cloudy', 'cloudy', 'rain', 'heavy-rain', 'thunderstorm', 'windy', 'fog'.
        La dirección del viento debe ser una abreviatura cardinal (N, NE, E, SE, S, SO, O, NO).
        La fuerza del viento debe estar en la escala de Beaufort (número entero).
        La altura de las olas debe ser en metros.
        La visibilidad debe ser en kilómetros (número entero).
        Las temperaturas del aire y del mar deben ser en grados Celsius (número entero).
        La presión atmosférica debe ser en hectopascales (hPa, número entero).
        Para \`pressureTrend\`, elige uno de los siguientes valores: 'rising', 'falling', 'steady'.
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
                weatherIcon: { type: Type.STRING },
                visibilityKm: { type: Type.INTEGER },
                seaTemperatureCelsius: { type: Type.INTEGER },
                airTemperatureCelsius: { type: Type.INTEGER },
                pressureHpa: { type: Type.INTEGER },
                pressureTrend: { type: Type.STRING }
            },
            required: ["locationName", "windDirection", "windForceBft", "waveHeightMeters", "weatherIcon", "visibilityKm", "seaTemperatureCelsius", "airTemperatureCelsius", "pressureHpa", "pressureTrend"]
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
    const data = JSON.parse(resultText);

    // --- Update cache on success ---
    forecastCache.data = data;
    forecastCache.timestamp = now;

    return response.status(200).json(data);

  } catch (error) {
    console.error("Error in /api/forecast:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate forecast from AI.", details: errorMessage });
  }
}