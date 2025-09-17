import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Cache to avoid excessive API calls
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

  const now = Date.now();
  if (forecastCache.data && (now - forecastCache.timestamp < CACHE_DURATION_MS)) {
      console.log("Serving forecast from cache.");
      return response.status(200).json(forecastCache.data);
  }
  console.log("Fetching fresh forecast from AI.");

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    // Schema definition for documentation and prompt clarity
    const schemaForPrompt = `
    [
      {
        "locationName": "string", // Nombre de la ubicación costera.
        "windDirection": "string", // Dirección del viento (ej. 'NW', 'S', 'VAR').
        "windForceBft": "integer", // Fuerza del viento en la escala Beaufort.
        "waveHeightMeters": "number", // Altura significativa de las olas en metros.
        "visibilityKm": "integer", // Visibilidad en kilómetros. 10 para buena visibilidad.
        "weatherSummary": "string", // Resumen conciso del tiempo (ej. 'Intervalos nubosos').
        "weatherIcon": "string" // Uno de: 'sunny', 'partly-cloudy', 'cloudy', 'rain', 'heavy-rain', 'thunderstorm', 'windy', 'fog'
      }
    ]
    `;

    const prompt = `
    Eres un experto meteorólogo marítimo. Tu tarea es proporcionar una previsión marítima para las próximas 24 horas para los siguientes 10 puntos costeros clave del norte de España. Debes utilizar la herramienta de búsqueda para obtener datos meteorológicos actualizados y fiables de servicios como AEMET, Windy, Windguru, etc.

    **Ubicaciones (con coordenadas de referencia):**
    1.  La Guardia (Lat: 41.90, Lon: -8.87)
    2.  Vigo (Lat: 42.24, Lon: -8.72)
    3.  Finisterre (Lat: 42.91, Lon: -9.26)
    4.  A Coruña (Lat: 43.37, Lon: -8.39)
    5.  Cabo Ortegal (Lat: 43.77, Lon: -7.87)
    6.  Navia (Lat: 43.54, Lon: -6.72)
    7.  Cabo Peñas (Lat: 43.66, Lon: -5.85)
    8.  Santander (Lat: 43.46, Lon: -3.80)
    9.  Bilbao (Lat: 43.35, Lon: -3.03)
    10. Pasajes (Lat: 43.32, Lon: -1.91)

    **Instrucciones:**
    -   Para CADA UNA de las 10 ubicaciones, proporciona la previsión más representativa para las próximas 24 horas.
    -   **Viento:** Dirección predominante (ej. NW, S) y fuerza media en la escala Beaufort.
    -   **Olas:** Altura media de las olas en metros.
    -   **Visibilidad:** Visibilidad general en kilómetros (ej: 10 para buena, 5 para regular, 1 para mala).
    -   **Tiempo:** Un resumen corto y un icono correspondiente.
    -   **CRÍTICO:** Tu respuesta DEBE ser exclusivamente un bloque de código JSON markdown que contenga un array de 10 objetos, uno por cada ubicación en el orden solicitado, siguiendo esta estructura exacta:
    \`\`\`json
    ${schemaForPrompt}
    \`\`\`
    - No incluyas explicaciones ni ningún otro texto fuera del bloque de código JSON.
    `;

    const genAIResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
        tools: [{googleSearch: {}}],
      }
    });

    let resultText = genAIResponse.text.trim();
    
    const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
        resultText = jsonMatch[1];
    } else {
        const firstBracket = resultText.indexOf('[');
        const lastBracket = resultText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket > firstBracket) {
            resultText = resultText.substring(firstBracket, lastBracket + 1);
        } else {
            throw new Error("La IA no devolvió un JSON válido.");
        }
    }
    
    if (!resultText) {
        throw new Error("La IA no devolvió contenido.");
    }
    
    const forecastData = JSON.parse(resultText);

    if (!Array.isArray(forecastData) || forecastData.length === 0) {
      throw new Error("La respuesta de la IA no es un array válido o está vacío.");
    }

    forecastCache.data = forecastData;
    forecastCache.timestamp = now;

    return response.status(200).json(forecastData);

  } catch (error) {
    console.error("Error in /api/forecast:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate forecast from AI.", details: errorMessage });
  }
}