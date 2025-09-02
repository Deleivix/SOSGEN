import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { mmsi } = request.body;

  if (!mmsi || !/^\d{9}$/.test(mmsi)) {
    return response.status(400).json({ error: 'A valid 9-digit MMSI is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const prompt = `
    Eres un experto en inteligencia de fuentes abiertas (OSINT) especializado en el sector marítimo. Tu única tarea es encontrar toda la información disponible públicamente sobre CUALQUIER estación marítima (buque, estación costera, aeronave SAR, etc.) a partir de su MMSI.

    **Instrucciones Estrictas:**
    1.  **Realiza una búsqueda exhaustiva:** Utiliza la herramienta de búsqueda para consultar bases de datos marítimas públicas. Céntrate en fuentes autorizadas como la lista de estaciones de barco de la UIT (Unión Internacional de Telecomunicaciones) y sitios de seguimiento de buques como MarineTraffic.
    2.  **Extrae Datos Clave:** Identifica y extrae la siguiente información sobre la estación asociada al MMSI:
        *   mmsi: El MMSI proporcionado.
        *   stationName: El nombre oficial de la estación (ej. "Coruña Radio", "Buque Aurora").
        *   stationType: El tipo de estación (ej. "Estación Costera", "Buque de Carga", "Velero").
        *   callSign: El indicativo de llamada, si está disponible.
        *   imo: El número IMO, si aplica.
        *   flag: La bandera o país de administración (ej. 'España (ESP)').
        *   summary: Un breve resumen en texto sobre la estación, incluyendo su función o características principales.
        *   details: Un objeto con detalles adicionales como "length", "beam", "lastKnownPosition" si son aplicables.
    3.  **Formato de Salida:** Devuelve la información encontrada EXCLUSIVAMENTE en un único bloque de código JSON. No incluyas texto explicativo antes o después del JSON.
    4.  **REGLA CRÍTICA: NO INVENTES INFORMACIÓN.** Si un dato específico no se encuentra, omite la clave del JSON o déjala como null. Los campos 'stationName' y 'stationType' son obligatorios. Si no se encuentra información relevante, devuelve un JSON con un campo "error": "No se encontró información para el MMSI.".

    **MMSI a buscar:** "${mmsi}"
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
    
    // The model might return the JSON inside a markdown code block.
    const jsonMatch = resultText.match(/```(json)?([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[2]) {
        resultText = jsonMatch[2].trim();
    }

    let details = {};
    try {
        // If the response is empty, default to an empty object.
        details = JSON.parse(resultText || '{}');
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", resultText);
        throw new Error("La IA devolvió una respuesta con formato inválido.");
    }

    const sources = genAIResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return response.status(200).json({ details, sources });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to fetch vessel data from AI.", details: errorMessage });
  }
}