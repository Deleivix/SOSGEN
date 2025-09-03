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
    **ROLE:** You are an expert OSINT maritime analyst. Your mission is to find detailed, accurate information about a vessel using its MMSI.

    **MISSION:** Conduct a thorough investigation for MMSI "${mmsi}". You MUST use the provided search tool. The information is public and findable on standard maritime websites. Failure to find basic information like the vessel's name is not an option.

    **STRATEGIC SEARCH PROTOCOL (Follow these steps meticulously):**
    1.  **Formulate & Execute Search Queries:** Start with the most direct query. If needed, use variations.
        *   Primary Query: \`"${mmsi}" vessel name IMO\`
        *   Secondary Query: \`MMSI ${mmsi} MarineTraffic\`
        *   Tertiary Query: \`MMSI ${mmsi} VesselFinder\`
    2.  **Analyze Search Results:** Prioritize results from well-known maritime sources: MarineTraffic, VesselFinder, MyShipTracking, FleetMon, Equasis. These sites almost always contain the primary identification data.
    3.  **Extract Core Data:** Scrutinize the search results to extract the following key information.
        *   \`stationName\`: The vessel's name. This is the most critical piece of information.
        *   \`imo\`: IMO number.
        *   \`callSign\`: Call sign.
        *   \`flag\`: Flag country.
        *   \`stationType\`: Vessel type (e.g., "General Cargo", "Oil Tanker").
    4.  **Extract Detailed Data:** Once core data is identified, search for supplementary details:
        *   \`length\` and \`beam\`: Dimensions (include units, e.g., "132 m").
        *   \`grossTonnage\`: Gross Tonnage (GT).
        *   \`lastPosition\`, \`positionTimestamp\`, and \`currentVoyage\` details (destination, eta, status).
    5.  **Synthesize Summary:** Create a brief, informative summary based on the collected data.
    6.  **Populate JSON:** Fill the JSON structure below with all extracted information. **USE \`null\` FOR ANY FIELD YOU CANNOT FIND.** Do not omit fields or invent data.

    **EXAMPLE OF A SUCCESSFUL ANALYSIS (for a different MMSI):**
    *   **Input MMSI:** \`224097470\`
    *   **AI's Internal Process:**
        1. Search \`"224097470" vessel name IMO\`.
        2. Top results are for "PUNTA SALINAS" on VesselFinder and MarineTraffic.
        3. Open VesselFinder page. Extract IMO \`9286983\`, Call Sign \`EADF\`, Flag \`Spain\`, Type \`Tug\`.
        4. Open MarineTraffic. Confirm details and find dimensions: 30m x 10m.
        5. Synthesize summary.
        6. Populate JSON.
    *   **AI's JSON Output for the example:**
        \`\`\`json
        {
          "vesselInfo": {
            "stationName": "PUNTA SALINAS",
            "stationType": "Tug",
            "mmsi": "224097470",
            "callSign": "EADF",
            "imo": "9286983",
            "flag": "Spain",
            "length": "30 m",
            "beam": "10 m",
            "grossTonnage": "350",
            "lastPosition": "In port at Ferrol",
            "positionTimestamp": "2024-07-29 10:00 UTC",
            "currentVoyage": {
              "destination": "FERROL",
              "eta": null,
              "status": "Moored"
            },
            "summary": "PUNTA SALINAS is a Spanish-flagged tug boat (IMO 9286983) currently moored at the port of Ferrol."
          }
        }
        \`\`\`

    **CRITICAL OUTPUT INSTRUCTIONS:**
    -   Your final output for MMSI "${mmsi}" MUST be ONLY the JSON object, wrapped in a markdown code block (\`\`\`json ... \`\`\`).
    -   Do not include your thought process or any other text outside the JSON block in your final response.
    -   If you find absolutely nothing after an exhaustive search (highly unlikely), return the structure with all values as \`null\` except for the provided \`mmsi\`.
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