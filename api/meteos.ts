import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// --- Constants ---
const AEMET_MAIN_BULLETIN_URL = 'https://www.aemet.es/xml/maritima/FQNT42MM.xml';
const AEMET_WARNINGS_URL = 'https://www.aemet.es/xml/maritima/WONT40MM.xml';
const AEMET_GALICIA_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX40MM.xml';
const AEMET_CANTABRICO_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX41MM.xml';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

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
        Eres un experto asistente meteorológico. Tu tarea es procesar cuatro boletines marítimos en formato XML y formatearlos en texto limpio y legible.

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

        **Instrucciones:**
        1.  **Boletín Principal (Español):** Extrae la información clave (hora de emisión, validez, situación general, predicciones por zona) del boletín principal y los avisos. Formatea el resultado en un texto claro y bien estructurado en español. Asegura que haya una línea en blanco entre la predicción de una zona y el título de la siguiente.
        2.  **Boletín Principal (Inglés):** Traduce el boletín en español formateado a un inglés claro y preciso, manteniendo la misma estructura.
        3.  **Avisos (Español):** Extrae el texto completo de todos los avisos del XML de avisos y formatéalo como un bloque de texto legible en español.
        4.  **Avisos (Inglés):** Traduce los avisos en español al inglés.
        5.  **Boletines Costeros (Español):** Procesa los boletines de Galicia y Cantábrico y formatea su contenido en dos bloques de texto separados, limpios y legibles.
        6.  **Limpieza:** Elimina todos los artefactos XML y el texto innecesario. Usa la información tal como está, sin expandir abreviaturas ni realizar ninguna otra transformación de texto.
        7.  **Devolver JSON:** Proporciona la salida como un objeto JSON con seis claves: "spanish", "english", "spanish_warnings", "english_warnings", "galicia_coastal", "cantabrico_coastal".
    `;
    
    const genAIResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    spanish: { type: Type.STRING, description: "The fully formatted maritime bulletin in Spanish." },
                    english: { type: Type.STRING, description: "The fully formatted maritime bulletin in English." },
                    spanish_warnings: { type: Type.STRING, description: "The fully formatted maritime warnings in Spanish." },
                    english_warnings: { type: Type.STRING, description: "The fully formatted maritime warnings in English." },
                    galicia_coastal: { type: Type.STRING, description: "The fully formatted coastal bulletin for Galicia in Spanish." },
                    cantabrico_coastal: { type: Type.STRING, description: "The fully formatted coastal bulletin for Cantábrico in Spanish." }
                },
                required: ["spanish", "english", "spanish_warnings", "english_warnings", "galicia_coastal", "cantabrico_coastal"],
            },
        },
    });

    const resultText = genAIResponse.text.trim() || '{}';
    return response.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error("Error in /api/meteos:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to process weather data from AI.", details: errorMessage });
  }
}
