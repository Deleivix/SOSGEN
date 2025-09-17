import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// --- Server-Side Cache ---
interface Cache<T> {
  data: T | null;
  timestamp: number;
}
const forecastCache: Cache<any[]> = {
  data: null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache

// --- Station Data with GPS Coordinates ---
const STATIONS = [
    { name: 'La Guardia', lat: 41.90, lon: -8.87 },
    { name: 'Vigo', lat: 42.24, lon: -8.72 },
    { name: 'Finisterre', lat: 42.91, lon: -9.26 },
    { name: 'Coruña', lat: 43.37, lon: -8.39 },
    { name: 'Ortegal', lat: 43.76, lon: -7.87 },
    { name: 'Navia', lat: 43.54, lon: -6.72 },
    { name: 'Cabo Peñas', lat: 43.66, lon: -5.81 },
    { name: 'Santander', lat: 43.46, lon: -3.80 },
    { name: 'Bilbao', lat: 43.37, lon: -3.02 },
    { name: 'Pasajes', lat: 43.33, lon: -1.92 },
];

const forecastSchema = {
    type: Type.OBJECT,
    properties: {
        locationName: { type: Type.STRING },
        windDirection: { type: Type.STRING, description: "One of N, NE, E, SE, S, SW, W, NW, VAR" },
        windForceBft: { type: Type.INTEGER, description: "Wind force on the Beaufort scale (0-12)" },
        waveHeightMeters: { type: Type.NUMBER, description: "Significant wave height in meters" },
        visibilityKm: { type: Type.INTEGER, description: "Visibility in kilometers" },
        weatherSummary: { type: Type.STRING, description: "A brief weather description in Spanish (e.g., 'Parcialmente nuboso')" },
        weatherIcon: { type: Type.STRING, description: "One of: 'sunny', 'partly-cloudy', 'cloudy', 'rain', 'heavy-rain', 'thunderstorm', 'windy', 'fog'" },
    },
    required: ["locationName", "windDirection", "windForceBft", "waveHeightMeters", "visibilityKm", "weatherSummary", "weatherIcon"]
};

async function getForecastForStation(station: { name: string; lat: number; lon: number }): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const prompt = `
        Provide a concise 24-hour coastal marine forecast for the area around station "${station.name}" at coordinates ${station.lat}, ${station.lon}.
        Focus on the average or most representative conditions over the next 24 hours.
        Return the data in the specified JSON format.
    `;
    
    try {
        const genAIResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: forecastSchema,
                temperature: 0.2,
            }
        });

        const resultText = genAIResponse.text.trim();
        const forecastData = JSON.parse(resultText);
        // Ensure locationName is correct as Gemini might alter it
        forecastData.locationName = station.name; 
        return forecastData;
    } catch (error) {
        console.error(`Failed to get forecast for ${station.name}:`, error);
        // Return a specific error object or null to indicate failure for this station
        return { locationName: station.name, error: "Failed to retrieve forecast" };
    }
}

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
  
  console.log("Fetching fresh forecast data (cache stale or empty).");

  try {
    const forecastPromises = STATIONS.map(getForecastForStation);
    const results = await Promise.allSettled(forecastPromises);
    
    const finalData = results
        .filter(result => result.status === 'fulfilled' && result.value && !result.value.error)
        .map(result => (result as PromiseFulfilledResult<any>).value);
    
    if (finalData.length === 0) {
        // This case handles if ALL API calls fail.
        const firstError = results.find(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
        let errorDetail = "All forecast requests failed.";
        if (firstError) {
             if (firstError.status === 'rejected') {
                 errorDetail = firstError.reason.message;
             } else {
                 errorDetail = (firstError as any).value.error;
             }
        }
        throw new Error(errorDetail);
    }
    
    forecastCache.data = finalData;
    forecastCache.timestamp = now;

    return response.status(200).json(finalData);

  } catch (error) {
    console.error("Error in /api/forecast:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate forecast.", details: errorMessage });
  }
}