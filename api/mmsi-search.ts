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
    **ROLE:** You are an automated information extraction system.

    **TASK:** Your only task is to find information for the maritime station with MMSI "${mmsi}" and return it as a JSON object. For example, the MMSI 224013350 belongs to "Salvamar Altair".

    **CRITICAL INSTRUCTIONS:**
    1.  **SEARCH:** Use the provided search tool to find any public information about MMSI "${mmsi}". Search for terms like "MMSI ${mmsi}", "vessel ${mmsi}", etc. Be thorough.
    2.  **EXTRACT:** From the search results, extract the following fields:
        - stationName: The name of the vessel or station (e.g., "Salvamar Altair").
        - stationType: The type of station (e.g., "Search and Rescue Vessel", "Fishing Vessel").
        - callSign: The call sign.
        - imo: The IMO number.
        - flag: The flag country.
        - summary: A single sentence describing the station.
        - length: The vessel's length.
        - beam: The vessel's width.
    3.  **RESPONSE FORMAT:** YOU MUST RESPOND WITH A SINGLE JSON OBJECT AND NOTHING ELSE.
        - **If you find ANY information:** Return a JSON object with the data. For any field you cannot find, YOU MUST use the value \`null\`. Example:
          \`\`\`json
          {
            "mmsi": "${mmsi}",
            "stationName": "Salvamar Altair",
            "stationType": "Search and Rescue Vessel",
            "callSign": "EA2222",
            "imo": null,
            "flag": "Spain",
            "summary": "Salvamar Altair is a search and rescue vessel operating in Spain.",
            "length": "21m",
            "beam": null
          }
          \`\`\`
        - **If, and ONLY IF, you find ABSOLUTELY NO information after searching:** Return this specific JSON object:
          \`\`\`json
          {
            "error": "No se encontró información relevante para el MMSI ${mmsi}."
          }
          \`\`\`

    **FAILURE IS NOT AN OPTION.** Prioritize returning a JSON with partial data over returning an error. The error response is your absolute last resort.
    `;

    const genAIResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
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