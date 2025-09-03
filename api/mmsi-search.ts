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
    **ROLE:** Eres un analista experto en inteligencia de fuentes abiertas (OSINT) especializado en el sector marítimo.

    **MISSION:** Tu misión es investigar el MMSI "${mmsi}" utilizando la herramienta de búsqueda de Google y compilar un informe estructurado en JSON.

    **INSTRUCTIONS:**
    1.  **SEARCH:** Utiliza la búsqueda de Google para encontrar información sobre el buque o estación asociado al MMSI "${mmsi}". Prioriza fuentes fiables como bases de datos de la ITU, sitios de seguimiento de buques (ej. MarineTraffic, VesselFinder) y registros oficiales.
    2.  **SYNTHESIZE:** Sintetiza la información encontrada en los resultados de búsqueda para rellenar los siguientes campos en un objeto JSON.
        - stationName: El nombre del buque o estación.
        - stationType: El tipo de estación (ej. "Buque de Carga", "Buque de Pesca", "Yate").
        - callSign: El indicativo de llamada.
        - imo: El número IMO.
        - flag: El país de la bandera.
        - length: La eslora del buque.
        - beam: La manga del buque.
        - summary: Un resumen conciso en una frase sobre la identidad y función principal del buque/estación, basado en los datos encontrados.
    3.  **HANDLE MISSING DATA:** Si un campo específico no se encuentra en los resultados de búsqueda, utiliza explícitamente el valor \`null\` en el JSON. No inventes información.
    4.  **ERROR HANDLING:** Si la búsqueda no arroja NINGÚN resultado relevante que permita identificar al menos el nombre o tipo del buque, y solo en ese caso, devuelve el siguiente JSON de error. En todos los demás casos, proporciona la información que hayas encontrado, aunque sea parcial.
        \`\`\`json
        {
          "error": "No se encontró información relevante para el MMSI ${mmsi}."
        }
        \`\`\`
    5.  **OUTPUT:** Tu respuesta DEBE ser únicamente el objeto JSON. No incluyas ninguna otra explicación o texto.
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