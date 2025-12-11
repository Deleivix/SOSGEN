
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
    Find detailed vessel info for MMSI "${mmsi}" using standard maritime OSINT (MarineTraffic, VesselFinder).
    Extract: stationName, imo, callSign, flag, stationType, length, beam, grossTonnage, lastPosition, destination.
    Return JSON format only.
    Use null if not found.
    Format: {"vesselInfo": {...}}
    `;

    // Strategy: Primary -> Lite -> Legacy Flash (1.5) for maximum availability
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash-lite-preview-02-05', 'gemini-1.5-flash'];
    let genAIResponse;
    let lastError;

    for (const model of modelsToTry) {
        try {
            // Only add tools config if model supports it (Assuming Lite supports it or we accept graceful fail)
            const config: any = { temperature: 0.1 };
            // We attempt to use search on all. If a specific model rejects it, it will be caught.
            if (true) { 
                config.tools = [{googleSearch: {}}];
            }

            genAIResponse = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: config
            });
            
            if (genAIResponse?.text) break;

        } catch (error: any) {
            lastError = error;
            if (error.status === 429 || error.status === 503 || (error.message && error.message.includes('429'))) {
                console.warn(`MMSI Search: Model ${model} failed. Switching...`);
                continue;
            }
            // If tool is not supported by Lite, it might throw 400. We could try without tool or just fail. 
            // For now, we propagate other errors.
            throw error;
        }
    }

    if (!genAIResponse || !genAIResponse.text) {
        throw lastError || new Error("Search Service Unavailable");
    }

    let resultText = genAIResponse.text.trim();
    
    // Extract JSON from markdown code block if present
    const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) resultText = jsonMatch[1];
    else {
        const firstBrace = resultText.indexOf('{');
        const lastBrace = resultText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            resultText = resultText.substring(firstBrace, lastBrace + 1);
        }
    }

    if (!resultText) resultText = '{"vesselInfo": null}';

    let resultData = {};
    try {
        resultData = JSON.parse(resultText);
    } catch (e) {
        throw new Error("Invalid JSON response from AI.");
    }

    const sources = genAIResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return response.status(200).json({ ...resultData as object, sources });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to fetch vessel data.", details: errorMessage });
  }
}
