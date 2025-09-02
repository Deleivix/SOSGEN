import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// AEMET URLs for coastal warnings
const AEMET_GALICIA_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX40MM.xml';
const AEMET_CANTABRICO_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX41MM.xml';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

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
        Eres un experto meteorólogo marítimo. Tu única tarea es analizar dos boletines costeros en formato XML y extraer un resumen de los avisos en vigor.

        **Boletín Costero de Galicia (FQXX40MM.xml):**
        \`\`\`xml
        ${galiciaXmlText}
        \`\`\`

        **Boletín Costero del Cantábrico (FQXX41MM.xml):**
        \`\`\`xml
        ${cantabricoXmlText}
        \`\`\`

        **Instrucciones Estrictas:**
        1.  **Identifica Avisos:** Revisa ambos boletines para encontrar secciones explícitas de "AVISOS" o predicciones que indiquen condiciones peligrosas (viento de fuerza 7 o superior, mar muy gruesa, etc.).
        2.  **Extrae y Resume:** Extrae el texto exacto de CADA aviso encontrado.
        3.  **Formatea la Salida:**
            *   Si encuentras uno o más avisos, combínalos en un único bloque de texto en español.
            *   Cada aviso debe estar claramente separado. Usa un título claro para la zona (ej. "GALICIA:") y luego el texto del aviso.
            *   Separa los avisos de diferentes zonas con dos saltos de línea.
            *   Limpia cualquier artefacto XML o texto innecesario, presentando solo la información del aviso.
        4.  **Manejo de Ausencia de Avisos:** Si después de analizar AMBOS boletines no encuentras NINGÚN aviso en vigor, devuelve una cadena vacía.
        5.  **JSON de Salida:** Devuelve tu resultado en un objeto JSON con una única clave: \`summary\`.
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
                        description: "Un resumen de texto de todos los avisos costeros activos para Galicia y Cantábrico, o una cadena vacía si no hay ninguno." 
                    }
                },
                required: ["summary"],
            },
        },
    });

    const resultText = genAIResponse.text.trim() || '{}';
    return response.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error("Error in /api/warnings:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to process weather warnings.", details: errorMessage });
  }
}
