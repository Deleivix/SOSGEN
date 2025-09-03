import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// --- Constants ---
const AEMET_MAIN_BULLETIN_URL = 'https://www.aemet.es/xml/maritima/FQNT42MM.xml';
const AEMET_WARNINGS_URL = 'https://www.aemet.es/xml/maritima/WONT40MM.xml';
const AEMET_GALICIA_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX40MM.xml';
const AEMET_CANTABRICO_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX41MM.xml';

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
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- Check Cache ---
  const now = Date.now();
  if (meteosCache.data && (now - meteosCache.timestamp < CACHE_DURATION_MS)) {
    console.log("Serving meteos data from cache.");
    return response.status(200).json(meteosCache.data);
  }
  console.log("Fetching fresh meteos data (cache stale or empty).");


  try {
    const [mainResponse, warningsResponse, galiciaResponse, cantabricoResponse] = await Promise.all([
        fetch(AEMET_MAIN_BULLETIN_URL),
        fetch(AEMET_WARNINGS_URL),
        fetch(AEMET_GALICIA_COASTAL_URL),
        fetch(AEMET_CANTABRICO_COASTAL_URL)
    ]);

    if (!mainResponse.ok || !warningsResponse.ok || !galiciaResponse.ok || !cantabricoResponse.ok) {
        throw new Error(`Failed to fetch data from AEMET. Statuses: ${mainResponse.status}, ${warningsResponse.status}, ${galiciaResponse.status}, ${cantabricoResponse.status}`);
    }

    const mainXmlText = await mainResponse.text();
    const warningsXmlText = await warningsResponse.text();
    const galiciaXmlText = await galiciaResponse.text();
    const cantabricoXmlText = await cantabricoResponse.text();
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const prompt = `
        Eres un experto asistente meteorológico. Tu tarea es procesar cuatro boletines marítimos en formato XML y formatearlos en texto limpio, legible y optimizado para sistemas de Texto-a-Voz (TTS).

        **Boletín Principal XML (de FQNT42MM.xml):**
        \`\`\`xml
        ${mainXmlText}
        \`\`\`

        **Boletín de Avisos XML (de WONT40MM.xml):**
        \`\`\`xml
        ${warningsXmlText}
        \`\`\`

        **Boletín Costero de Galicia XML (de FQXX40MM.xml):**
        \`\`\`xml
        ${galiciaXmlText}
        \`\`\`

        **Boletín Costero del Cantábrico XML (de FQXX41MM.xml):**
        \`\`\`xml
        ${cantabricoXmlText}
        \`\`\`

        **Instrucciones Estrictas:**
        1.  **Extracción y Formato (Español):**
            *   **Boletín Principal:** Extrae la información clave (hora de emisión, validez, situación general, predicciones por zona) del boletín principal y los avisos. Formatea el resultado en un texto claro y bien estructurado. Asegura que haya una línea en blanco entre la predicción de una zona y el título de la siguiente.
            *   **Avisos:** Extrae el texto completo de todos los avisos y formatéalo como un bloque de texto legible.
            *   **Boletines Costeros:** Procesa los boletines de Galicia y Cantábrico y formatea su contenido en dos bloques de texto separados, limpios y legibles.
        2.  **Limpieza Inicial:** Elimina todos los artefactos XML y el texto innecesario.
        3.  **OPTIMIZACIÓN PARA TEXTO-A-VOZ (TTS) - CRÍTICO:**
            *   Revisa TODO el texto en español generado y reescribe CUALQUIER abreviatura, número o código a su forma de palabra completa para garantizar una lectura natural por un sintetizador de voz.
            *   **Ejemplos OBLIGATORIOS de conversión:**
                *   Direcciones de viento: 'NW' -> 'Noroeste', 'SW' -> 'Suroeste'.
                *   Fuerza del viento: 'Fuerza 4' -> 'fuerza cuatro'.
                *   Números: '1018 hPa' -> 'mil dieciocho hectopascales', '20 nudos' -> 'veinte nudos'.
                *   Horas: '12 UTC' -> 'doce UTC'.
                *   Zonas: 'CABO FINISTERRE A CABO SILLEIRO' -> 'De Cabo Finisterre a Cabo Silleiro'.
            *   Este paso es fundamental para la accesibilidad y debe aplicarse a todos los textos en español.
        4.  **Traducción al Inglés:** Traduce los boletines ya formateados en español a un inglés claro y preciso, manteniendo la misma estructura. **No apliques la optimización TTS al texto en inglés**, mantenlo en formato estándar (ej. 'NW force 4').
        5.  **Devolver JSON:** Proporciona la salida como un objeto JSON con seis claves: "spanish", "english", "spanish_warnings", "english_warnings", "galicia_coastal", "cantabrico_coastal".
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
                    english: { type: Type.STRING, description: "The fully formatted maritime bulletin in English." },
                    spanish_warnings: { type: Type.STRING, description: "The fully formatted maritime warnings in Spanish, optimized for TTS." },
                    english_warnings: { type: Type.STRING, description: "The fully formatted maritime warnings in English." },
                    galicia_coastal: { type: Type.STRING, description: "The fully formatted coastal bulletin for Galicia in Spanish, optimized for TTS." },
                    cantabrico_coastal: { type: Type.STRING, description: "The fully formatted coastal bulletin for Cantábrico in Spanish, optimized for TTS." }
                },
                required: ["spanish", "english", "spanish_warnings", "english_warnings", "galicia_coastal", "cantabrico_coastal"],
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