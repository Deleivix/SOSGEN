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
    
    // Schema is not used in the config, but it's a good reference for the prompt
    const schema = {
        type: Type.OBJECT,
        properties: {
            error: {
                type: Type.STRING,
                description: "Mensaje de error si no se encuentra información relevante para el MMSI. Si se encuentra información, este campo debe ser null.",
                nullable: true,
            },
            vesselInfo: {
                type: Type.OBJECT,
                description: "Contiene toda la información encontrada sobre el buque.",
                nullable: true,
                properties: {
                    stationName: { type: Type.STRING, description: "Nombre del buque o estación.", nullable: true },
                    stationType: { type: Type.STRING, description: "Tipo de buque (ej. 'Buque de Carga', 'Petrolero', 'Yate').", nullable: true },
                    mmsi: { type: Type.STRING, description: "El MMSI buscado.", nullable: true },
                    callSign: { type: Type.STRING, description: "Indicativo de llamada.", nullable: true },
                    imo: { type: Type.STRING, description: "Número IMO.", nullable: true },
                    flag: { type: Type.STRING, description: "País de la bandera.", nullable: true },
                    length: { type: Type.STRING, description: "Eslora (longitud) del buque, incluyendo unidades (ej. '180 m').", nullable: true },
                    beam: { type: Type.STRING, description: "Manga (anchura) del buque, incluyendo unidades (ej. '32 m').", nullable: true },
                    grossTonnage: { type: Type.STRING, description: "Arqueo bruto (Gross Tonnage), incluyendo unidades si es posible.", nullable: true },
                    lastPosition: { type: Type.STRING, description: "Última posición reportada (coordenadas o nombre de lugar).", nullable: true },
                    positionTimestamp: { type: Type.STRING, description: "Fecha y hora de la última posición reportada.", nullable: true },
                    currentVoyage: {
                        type: Type.OBJECT,
                        nullable: true,
                        properties: {
                            destination: { type: Type.STRING, description: "Puerto de destino.", nullable: true },
                            eta: { type: Type.STRING, description: "Hora estimada de llegada (ETA).", nullable: true },
                            status: { type: Type.STRING, description: "Estado actual (ej. 'En navegación', 'Atracado').", nullable: true },
                        }
                    },
                    summary: { type: Type.STRING, description: "Resumen conciso en lenguaje natural sobre la identidad y estado actual del buque. Máximo 2-3 frases.", nullable: true },
                }
            }
        },
        required: ['error', 'vesselInfo']
    };

    const prompt = `
    **ROLE:** Actúa como un analista de élite en Inteligencia de Fuentes Abiertas (OSINT) con especialización en el sector marítimo. Eres meticuloso, preciso y experto en agregar datos de múltiples fuentes.

    **MISSION:** Realizar una investigación exhaustiva del MMSI "${mmsi}" utilizando la herramienta de búsqueda de Google. Tu objetivo es recopilar la mayor cantidad de información pública disponible y consolidarla en un informe estructurado en formato JSON.

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
    -   **STRICT JSON OUTPUT:** Tu respuesta DEBE ser un único objeto JSON válido, envuelto en un bloque de código markdown JSON. Ejemplo:
        \`\`\`json
        {
          "error": null,
          "vesselInfo": { "stationName": "Example Vessel" }
        }
        \`\`\`
    -   No incluyas NINGÚN texto, explicación o markdown fuera del bloque de código JSON.
    -   **NO DATA, USE NULL:** Si no puedes encontrar un dato específico para un campo, DEBES usar el valor \`null\`. NO omitas la clave ni inventes información.
    -   **ERROR HANDLING:** Si tu investigación exhaustiva no arroja NINGÚN resultado que permita identificar al buque, y SOLO en ese caso, devuelve el JSON con el campo \`error\` rellenado y \`vesselInfo\` como \`null\`. Ejemplo: \`\`\`json\n{"error": "No se encontró información relevante para el MMSI ${mmsi}.", "vesselInfo": null}\n\`\`\`
    -   **SUCCESSFUL SEARCH:** Si encuentras CUALQUIER información, por mínima que sea, el campo \`error\` DEBE ser \`null\` y \`vesselInfo\` debe contener los datos encontrados (usando \`null\` para los campos faltantes).
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
      resultText = '{"error": "La IA no devolvió resultados.", "vesselInfo": null}';
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