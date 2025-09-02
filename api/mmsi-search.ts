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
    Actúa como un experto en OSINT marítimo. Tu objetivo es buscar y compilar un informe detallado sobre la estación marítima con el MMSI proporcionado.

    **MMSI a buscar:** "${mmsi}"

    **Proceso:**
    1.  **Buscar:** Usa la herramienta de búsqueda para encontrar cualquier dato en fuentes públicas sobre este MMSI. Prioriza sitios como la UIT (Unión Internacional de Telecomunicaciones), MarineTraffic, VesselFinder y bases de datos gubernamentales.
    2.  **Analizar:** Examina los resultados de la búsqueda para identificar los siguientes datos clave:
        *   Nombre de la estación (el nombre del buque o de la estación costera).
        *   Tipo de estación (p. ej., Buque de Pesca, Buque de Carga, Estación Costera, Yate).
        *   Indicativo de llamada (Call Sign).
        *   Número IMO.
        *   Bandera / País.
        *   Cualquier otra información relevante como eslora, manga, última posición conocida, etc.
    3.  **Resumir:** Escribe un breve resumen en lenguaje natural sobre la estación, destacando su identidad y función principal.
    4.  **Formatear Salida:** Presenta TODA la información recopilada en un único bloque de código JSON. La estructura del JSON debe ser la siguiente:
        {
          "mmsi": "${mmsi}",
          "stationName": "...",
          "stationType": "...",
          "callSign": "...",
          "imo": "...",
          "flag": "...",
          "summary": "...",
          "details": {
            "length": "...",
            "beam": "...",
            "lastKnownPosition": "..."
          }
        }
    *   **IMPORTANTE:** Si no encuentras un dato específico, establece su valor como \`null\` en el JSON.
    *   **REGLA DE ORO (CRÍTICO):** Tu misión es encontrar *algo*. Es extremadamente raro que un MMSI válido no tenga NINGÚN dato público. Antes de devolver un error, realiza múltiples búsquedas con variaciones si es necesario. Considera CUALQUIER pieza de información (nombre, tipo, bandera, etc.) como un ÉXITO. Solo devuelve el JSON de error como último recurso absoluto si estás 100% seguro de que no existe registro alguno en las fuentes consultadas. El JSON de error debe ser: \`{"error": "No se encontró información relevante para el MMSI ${mmsi}."}\`.
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