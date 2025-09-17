import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// AEMET URLs for coastal warnings
const AEMET_GALICIA_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX40MM.xml';
const AEMET_CANTABRICO_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX41MM.xml';

// --- Server-Side Cache ---
interface Cache<T> {
  data: T | null;
  timestamp: number;
}
const warningsCache: Cache<any> = {
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
  if (warningsCache.data && (now - warningsCache.timestamp < CACHE_DURATION_MS)) {
    console.log("Serving coastal warnings data from cache.");
    return response.status(200).json(warningsCache.data);
  }
  console.log("Fetching fresh coastal warnings data (cache stale or empty).");

  try {
    const [galiciaResponse, cantabricoResponse] = await Promise.all([
        fetch(AEMET_GALICIA_COASTAL_URL),
        fetch(AEMET_CANTABRICO_COASTAL_URL)
    ]);

    if (!galiciaResponse.ok || !cantabricoResponse.ok) {
        throw new Error(`Failed to fetch data from AEMET. Statuses: Galicia ${galiciaResponse.status}, Cantábrico ${cantabricoResponse.status}`);
    }

    const galiciaXmlText = await galiciaResponse.text();
    const cantabricoXmlText = await cantabricoResponse.text();
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const prompt = `
        Eres un experto meteorólogo marítimo. Analiza dos boletines costeros en XML y extrae información específica.

        **Boletín Costero de Galicia (FQXX40MM.xml):**
        \`\`\`xml
        ${galiciaXmlText}
        \`\`\`

        **Boletín Costero del Cantábrico (FQXX41MM.xml):**
        \`\`\`xml
        ${cantabricoXmlText}
        \`\`\`

        **Instrucciones Estrictas:**
        1.  **Resumen de Avisos (summary):**
            *   Identifica y extrae el texto exacto de CADA aviso en vigor de AMBOS boletines.
            *   Combina todos los avisos en un único bloque de texto. Si no hay avisos, devuelve una cadena vacía.
            *   Formatea el resumen de forma clara, indicando la zona de cada aviso (ej. "GALICIA: ...").
        2.  **Texto Completo - Galicia (galicia_coastal):**
            *   Extrae el contenido completo del boletín de Galicia.
            *   Limpia todo el XML y formatea el texto para que sea legible.
            *   **Optimiza este texto para Texto-a-Voz (TTS):** reescribe abreviaturas, números y códigos a su forma de palabra completa en español (ej. 'NW' -> 'Noroeste', 'Fuerza 4' -> 'fuerza cuatro').
        3.  **Texto Completo - Cantábrico (cantabrico_coastal):**
            *   Extrae el contenido completo del boletín del Cantábrico.
            *   Limpia todo el XML y formatea el texto para que sea legible.
            *   **Optimiza este texto para TTS** de la misma manera que el de Galicia.
        4.  **JSON de Salida:** Devuelve tu resultado en un objeto JSON con tres claves: \`summary\`, \`galicia_coastal\`, \`cantabrico_coastal\`.
    `;
    
    const genAIResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { 
                        type: Type.STRING, 
                        description: "A text summary of all active coastal warnings for Galicia and Cantábrico, or an empty string if there are none." 
                    },
                    galicia_coastal: {
                        type: Type.STRING,
                        description: "The full, formatted, and TTS-optimized coastal bulletin for Galicia in Spanish."
                    },
                    cantabrico_coastal: {
                        type: Type.STRING,
                        description: "The full, formatted, and TTS-optimized coastal bulletin for Cantábrico in Spanish."
                    }
                },
                required: ["summary", "galicia_coastal", "cantabrico_coastal"],
            },
        },
    });

    const resultText = genAIResponse.text.trim() || '{}';
    const data = JSON.parse(resultText);

    // --- Update cache on success ---
    warningsCache.data = data;
    warningsCache.timestamp = now;

    return response.status(200).json(data);

  } catch (error) {
    console.error("Error in /api/warnings:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to process weather warnings.", details: errorMessage });
  }
}