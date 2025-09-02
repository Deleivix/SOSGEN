import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

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
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            mmsi: { type: Type.STRING, description: "El MMSI del buque, que debe ser el mismo que se proporcionó en la entrada." },
            vesselName: { type: Type.STRING, description: "El nombre del buque." },
            callSign: { type: Type.STRING, description: "El indicativo de llamada del buque." },
            imo: { type: Type.STRING, description: "El número de la Organización Marítima Internacional (OMI) del buque." },
            flag: { type: Type.STRING, description: "La bandera o país de registro del buque, incluyendo el código de país entre paréntesis (ej. 'España (ESP)')." },
            vesselType: { type: Type.STRING, description: "El tipo de buque (ej. 'Cargo', 'Fishing', 'Sailing Vessel')." },
            length: { type: Type.STRING, description: "La eslora (longitud) total del buque en metros (ej. '120m')." },
            beam: { type: Type.STRING, description: "La manga (anchura) del buque en metros (ej. '20m')." },
            lastKnownPosition: { type: Type.STRING, description: "La última posición conocida del buque, si está disponible, en formato 'latitud, longitud'." },
        },
        required: ["mmsi", "vesselName"]
    };
    
    const prompt = `
    Eres un experto en inteligencia de fuentes abiertas (OSINT) especializado en el sector marítimo. Tu única tarea es encontrar toda la información disponible públicamente sobre un buque a partir de su MMSI.

    **Instrucciones Estrictas:**
    1.  **Realiza una búsqueda exhaustiva:** Utiliza la herramienta de búsqueda para consultar bases de datos marítimas públicas. Céntrate en fuentes autorizadas como la lista de estaciones de barco de la UIT (Unión Internacional de Telecomunicaciones) y sitios de seguimiento de buques como MarineTraffic.
    2.  **Extrae Datos Clave:** Identifica y extrae la siguiente información sobre el buque asociado al MMSI:
        *   Nombre del buque (vesselName)
        *   Indicativo de llamada (callSign)
        *   Número IMO
        *   Bandera y país de registro (flag)
        *   Tipo de buque (vesselType)
        *   Eslora (length)
        *   Manga (beam)
        *   Última posición conocida (lastKnownPosition)
    3.  **Formato de Salida:** Devuelve la información encontrada EXCLUSIVAMENTE en formato JSON, adhiriéndote estrictamente al esquema proporcionado.
    4.  **No Inventes Información:** Si un dato específico no se encuentra, omite el campo del JSON. No inventes ni supongas ningún dato.

    **MMSI a buscar:** "${mmsi}"
    `;

    const genAIResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
        tools: [{googleSearch: {}}],
      }
    });

    const resultText = genAIResponse.text.trim() || '{}';
    const details = JSON.parse(resultText);

    const sources = genAIResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return response.status(200).json({ details, sources });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to fetch vessel data from AI.", details: errorMessage });
  }
}
