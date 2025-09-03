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
    **ROLE:** Actúa como un analista de élite en Inteligencia de Fuentes Abiertas (OSINT) con especialización en el sector marítimo. Eres meticuloso, preciso y experto en agregar datos de múltiples fuentes.

    **MISSION:** Tu misión es realizar una investigación exhaustiva del MMSI "${mmsi}" utilizando la herramienta de búsqueda de Google. Debes recopilar la mayor cantidad de información pública disponible y consolidarla en un informe estructurado en formato JSON. No te rindas fácilmente; la información suele estar disponible si buscas en las fuentes correctas.

    **DATA SOURCES TO PRIORITIZE:**
    -   Registros oficiales de la ITU.
    -   Sitios de seguimiento de buques AIS (MarineTraffic, VesselFinder, MyShipTracking, etc.).
    -   Bases de datos marítimas (Equasis, FleetMon, etc.).
    -   Registros de empresas y noticias del sector.

    **INFORMATION TO EXTRACT (Compila todo lo que encuentres):**
    1.  **Identificación Básica:**
        -   \`stationName\`: Nombre del buque.
        -   \`stationType\`: Tipo de buque (sé específico, ej. "Crude Oil Tanker", "Container Ship", "Fishing Vessel").
        -   \`mmsi\`: El MMSI proporcionado ("${mmsi}").
        -   \`callSign\`: Indicativo de llamada.
        -   \`imo\`: Número IMO.
        -   \`flag\`: País de la bandera.
    2.  **Características Físicas:**
        -   \`length\`: Eslora (longitud total), con unidades.
        -   \`beam\`: Manga (anchura), con unidades.
        -   \`grossTonnage\`: Arqueo Bruto (GT).
    3.  **Datos de Viaje y Posición (si están disponibles):**
        -   \`lastPosition\`: Última posición conocida (texto descriptivo o coordenadas).
        -   \`positionTimestamp\`: Fecha y hora de la última posición.
        -   \`currentVoyage.destination\`: Puerto de destino.
        -   \`currentVoyage.eta\`: Fecha y hora estimada de llegada.
        -   \`currentVoyage.status\`: Estado actual (ej. "Under way using engine", "Moored").
    4.  **Resumen Analítico:**
        -   \`summary\`: Basado en toda la información recopilada, escribe un resumen conciso (2-3 frases) que describa la identidad del buque y su actividad reciente o estado actual.

    **CRITICAL INSTRUCTIONS & OUTPUT FORMAT:**
    -   **ALWAYS RETURN DATA STRUCTURE:** Tu respuesta DEBE ser SIEMPRE un único objeto JSON válido. Este objeto debe contener una clave principal \`vesselInfo\`.
    -   **NO DATA, USE NULL:** Si no puedes encontrar un dato específico para un campo, DEBES usar el valor \`null\`. NO omitas la clave ni inventes información.
    -   **CONSIDER ANY FINDING A SUCCESS:** Si encuentras CUALQUIER dato (incluso solo el nombre del barco o su bandera), considéralo un éxito. Rellena los datos que encuentres y usa \`null\` para el resto.
    -   **FINAL CHECK:** Asegúrate de que tu respuesta final sea un JSON válido envuelto en un bloque de código markdown JSON, sin ningún texto o explicación adicional fuera del bloque.
        \`\`\`json
        {
          "vesselInfo": {
            "stationName": "Example Vessel",
            "stationType": "Cargo Ship",
            "mmsi": "${mmsi}",
            "callSign": null,
            "imo": null,
            "flag": null,
            "length": null,
            "beam": null,
            "grossTonnage": null,
            "lastPosition": null,
            "positionTimestamp": null,
            "currentVoyage": null,
            "summary": null
          }
        }
        \`\`\`
    `;

    const genAIResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
        tools: [{googleSearch: {}}],
      }
    });

    let resultData = {};
    let resultText = genAIResponse.text.trim();
    
    // Extract JSON from markdown code block if present
    const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
        resultText = jsonMatch[1];
    } else {
        // Fallback for cases where the model might not use markdown
        const firstBrace = resultText.indexOf('{');
        const lastBrace = resultText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            resultText = resultText.substring(firstBrace, lastBrace + 1);
        }
    }

    if (!resultText) {
      resultText = '{"vesselInfo": null}';
    }

    try {
        resultData = JSON.parse(resultText);
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", resultText);
        throw new Error("La IA devolvió una respuesta con formato inválido.");
    }

    const sources = genAIResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return response.status(200).json({ ...resultData as object, sources });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to fetch vessel data from AI.", details: errorMessage });
  }
}