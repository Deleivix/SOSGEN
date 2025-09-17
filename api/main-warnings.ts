import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// --- Constants ---
const AEMET_WARNINGS_URL = 'https://www.aemet.es/xml/maritima/WONT40MM.xml';

// --- Server-Side Cache ---
interface Cache<T> {
  data: T | null;
  timestamp: number;
}
const mainWarningsCache: Cache<any> = {
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
  if (mainWarningsCache.data && (now - mainWarningsCache.timestamp < CACHE_DURATION_MS)) {
    console.log("Serving main warnings data from cache.");
    return response.status(200).json(mainWarningsCache.data);
  }
  console.log("Fetching fresh main warnings data (cache stale or empty).");


  try {
    const warningsResponse = await fetch(AEMET_WARNINGS_URL);

    if (!warningsResponse.ok) {
        throw new Error(`Failed to fetch main warnings from AEMET. Status: ${warningsResponse.status}`);
    }

    const warningsXmlText = await warningsResponse.text();
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const prompt = `
        Eres un experto asistente meteorológico. Tu tarea es procesar un boletín de avisos marítimos en formato XML y formatearlo en texto limpio, legible y optimizado para Texto-a-Voz (TTS).

        **Boletín de Avisos XML (de WONT40MM.xml):**
        \`\`\`xml
        ${warningsXmlText}
        \`\`\`

        **Instrucciones Estrictas:**
        1.  **Extracción y Formato (Español):**
            *   Extrae el texto completo de todos los avisos y formatéalo como un bloque de texto legible y bien estructurado.
        2.  **Limpieza Inicial:** Elimina todos los artefactos XML y el texto innecesario.
        3.  **OPTIMIZACIÓN PARA TEXTO-A-VOZ (TTS) - CRÍTICO:**
            *   Revisa TODO el texto en español generado y reescribe CUALQUIER abreviatura, número o código a su forma de palabra completa para garantizar una lectura natural por un sintetizador de voz.
            *   **Ejemplos OBLIGATORIOS de conversión:** 'NW' -> 'Noroeste', 'Fuerza 7' -> 'fuerza siete', '12 UTC' -> 'doce UTC'.
        4.  **Traducción al Inglés:** Traduce los avisos ya formateados en español a un inglés claro y preciso, manteniendo la misma estructura. **No apliques la optimización TTS al texto en inglés**, mantenlo en formato estándar (ej. 'NW force 7').
        5.  **Devolver JSON:** Proporciona la salida como un objeto JSON con dos claves: "spanish_warnings" y "english_warnings".
    `;
    
    const genAIResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    spanish_warnings: { type: Type.STRING, description: "The fully formatted maritime warnings in Spanish, optimized for TTS." },
                    english_warnings: { type: Type.STRING, description: "The fully formatted maritime warnings in English." }
                },
                required: ["spanish_warnings", "english_warnings"],
            },
        },
    });

    const resultText = genAIResponse.text.trim() || '{}';
    const data = JSON.parse(resultText);

    // --- Update cache on success ---
    mainWarningsCache.data = data;
    mainWarningsCache.timestamp = now;
    
    return response.status(200).json(data);

  } catch (error) {
    console.error("Error in /api/main-warnings:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to process weather data from AI.", details: errorMessage });
  }
}