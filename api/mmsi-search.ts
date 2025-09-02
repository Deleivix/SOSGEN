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
    Eres un experto en inteligencia de fuentes abiertas (OSINT) especializado en el sector marítimo. Tu única tarea es encontrar toda la información disponible públicamente sobre un buque a partir de su MMSI.

    **Instrucciones Estrictas:**
    1.  **Realiza una búsqueda exhaustiva:** Utiliza la herramienta de búsqueda para consultar bases de datos marítimas públicas. Céntrate en fuentes autorizadas como la lista de estaciones de barco de la UIT (Unión Internacional de Telecomunicaciones) y sitios de seguimiento de buques como MarineTraffic.
    2.  **Extrae Datos Clave:** Identifica y extrae la siguiente información sobre el buque asociado al MMSI:
        *   mmsi: El MMSI del buque.
        *   vesselName: El nombre del buque.
        *   callSign: El indicativo de llamada.
        *   imo: El número IMO.
        *   flag: La bandera (país de registro), incluyendo el código de país entre paréntesis (ej. 'España (ESP)').
        *   vesselType: El tipo de buque.
        *   length: La eslora (longitud) total en metros.
        *   beam: La manga (anchura) en metros.
        *   lastKnownPosition: La última posición conocida.
    3.  **Formato de Salida:** Devuelve la información encontrada EXCLUSIVAMENTE en un único bloque de código JSON. No incluyas texto explicativo antes o después del JSON. La estructura debe ser: { "mmsi": "...", "vesselName": "...", /* etc */ }.
    4.  **No Inventes Información:** Si un dato específico no se encuentra, omite la clave del JSON o déjala como null. El campo 'vesselName' es obligatorio. Si no se encuentra un nombre, devuelve un JSON vacío {}.

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