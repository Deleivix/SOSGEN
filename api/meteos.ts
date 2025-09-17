import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// --- Constants ---
const AEMET_MAIN_BULLETIN_URL = 'https://www.aemet.es/xml/maritima/FQNT42MM.xml';

// --- Server-Side Cache ---
interface Cache<T> {
  data: T | null;
  timestamp: number;
}
const meteosCache: Cache<any> = {
  data: null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- Check Cache ---
  const now = Date.now();
  if (meteosCache.data && (now - meteosCache.timestamp < CACHE_DURATION_MS)) {
    console.log("Serving main bulletin data from cache.");
    return response.status(200).json(meteosCache.data);
  }
  console.log("Fetching fresh main bulletin data (cache stale or empty).");

  try {
    const mainResponse = await fetch(AEMET_MAIN_BULLETIN_URL);

    if (!mainResponse.ok) {
        throw new Error(`Failed to fetch main bulletin from AEMET. Status: ${mainResponse.status}`);
    }

    const mainXmlText = await mainResponse.text();
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const prompt = `
        Eres un experto asistente meteorológico. Tu tarea es procesar el siguiente boletín marítimo principal en formato XML y formatearlo en texto limpio, legible y optimizado para sistemas de Texto-a-Voz (TTS).

        **Boletín Principal XML (de FQNT42MM.xml):**
        \`\`\`xml
        ${mainXmlText}
        \`\`\`

        **Instrucciones Estrictas:**
        1.  **Extracción y Formato (Español):**
            *   Extrae la información clave (hora de emisión, validez, situación general, predicciones por zona) del boletín. Formatea el resultado en un texto claro y bien estructurado. Asegura que haya una línea en blanco entre la predicción de una zona y el título de la siguiente.
        2.  **Limpieza Inicial:** Elimina todos los artefactos XML y el texto innecesario.
        3.  **OPTIMIZACIÓN PARA TEXTO-A-VOZ (TTS) - CRÍTICO:**
            *   Revisa TODO el texto en español generado y reescribe CUALQUIER abreviatura, número o código a su forma de palabra completa para garantizar una lectura natural por un sintetizador de voz.
            *   **Ejemplos OBLIGATORIOS de conversión:** 'NW' -> 'Noroeste', 'Fuerza 4' -> 'fuerza cuatro', '1018 hPa' -> 'mil dieciocho hectopascales', '12 UTC' -> 'doce UTC'.
        4.  **Traducción al Inglés:** Traduce el boletín ya formateado en español a un inglés claro y preciso, manteniendo la misma estructura. **No apliques la optimización TTS al texto en inglés**, mantenlo en formato estándar (ej. 'NW force 4').
        5.  **Devolver JSON:** Proporciona la salida como un objeto JSON con dos claves: "spanish" y "english".
    `;
    
    const genAIResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    spanish: { type: Type.STRING, description: "The fully formatted maritime bulletin in Spanish, optimized for TTS." },
                    english: { type: Type.STRING, description: "The fully formatted maritime bulletin in English." }
                },
                required: ["spanish", "english"],
            },
        },
    });

    const resultText = genAIResponse.text.trim() || '{}';
    const data = JSON.parse(resultText);

    // --- Update cache on success ---
    meteosCache.data = data;
    meteosCache.timestamp = now;
    
    return response.status(200).json(data);

  } catch (error) {
    console.error("Error in /api/meteos:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to process weather data from AI.", details: errorMessage });
  }
}