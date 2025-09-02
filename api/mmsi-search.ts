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
    You are a highly-skilled maritime OSINT (Open-Source Intelligence) analyst. Your task is to find public information for the maritime station with MMSI: "${mmsi}".

    **Instructions:**
    1.  Use the search tool to query public databases like ITU, MarineTraffic, VesselFinder, and official maritime authorities for the MMSI "${mmsi}".
    2.  From the search results, extract the following information:
        - stationName: The vessel name or coast station name.
        - stationType: e.g., "Fishing Vessel", "Cargo Ship", "Coast Station".
        - callSign: The official call sign.
        - imo: The IMO number.
        - flag: The flag state or country.
        - summary: A brief, one or two-sentence summary of the station's identity and purpose.
        - length: The vessel's length (if applicable).
        - beam: The vessel's beam/width (if applicable).
    3.  **Output Format:** You MUST return your findings in a single JSON object. Do not include any other text, explanations, or markdown formatting.
        - **On Success:** If you find ANY information, return a JSON object like this. For any field you cannot find, use the value \`null\`.
          \`\`\`json
          {
            "mmsi": "${mmsi}",
            "stationName": "NUEVO ANITA",
            "stationType": "Fishing Vessel",
            "callSign": "EA6209",
            "imo": null,
            "flag": "Spain",
            "summary": "El Nuevo Anita es un buque pesquero con bandera de España.",
            "length": "23m",
            "beam": null
          }
          \`\`\`
        - **On Absolute Failure:** Only if extensive searching yields absolutely NO relevant results for the MMSI "${mmsi}", you must return this specific JSON object:
          \`\`\`json
          {
            "error": "No se encontró información relevante para el MMSI ${mmsi}."
          }
          \`\`\`

    Your primary goal is to successfully return the data JSON, even if it's partially filled. The failure case is the absolute last resort.
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