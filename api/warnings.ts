// This file implements the backend API for the dashboard's warnings card.
// It uses Gemini with Google Search grounding to find and summarize
// the latest coastal weather warnings from AEMET.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

interface Cache<T> {
  data: T | null;
  timestamp: number;
}
const warningsCache: Cache<any> = {
  data: null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
    const now = Date.now();
    if (warningsCache.data && (now - warningsCache.timestamp < CACHE_DURATION_MS)) {
        console.log("Serving warnings from cache.");
        return response.status(200).json(warningsCache.data);
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        const prompt = `
        **ROLE:** You are a meteorological data analyst for Salvamento Marítimo (Spanish Maritime Safety Agency).
        
        **MISSION:** Use the search tool to find the latest coastal weather warnings (avisos costeros) issued by AEMET for all Spanish coastal regions for today.
        
        **EXECUTION:**
        1.  Formulate a precise search query like "AEMET avisos costeros hoy" or "AEMET avisos navegación marítima".
        2.  Analyze the search results, prioritizing the official AEMET website.
        3.  Extract all currently active warnings related to **wind (viento)** and **sea state (olas/mar)**. Ignore other types of warnings (rain, temperature, etc.).
        4.  Synthesize the findings into a single, concise summary text.
        5.  The summary should be formatted as a single block of text, using line breaks for readability.
        6.  For each warning, specify the region, the type of warning (e.g., "Aviso por viento F7," "Aviso por olas de 4m"), and the validity period.
        7.  If no coastal warnings are found, the summary MUST be an empty string.

        **CRITICAL OUTPUT INSTRUCTIONS:**
        - Your final response must be ONLY a JSON object with a single key "summary", which contains the text you generated.
        - Example of a good summary:
        "GALICIA: Aviso por viento del NE F7-8 en Finisterre y Costa da Morte. Válido hasta las 18:00 UTC.\\nCANTÁBRICO: Aviso por mar combinada de 4m. Válido hasta las 22:00 UTC."
        - Do not add any conversational text or explanations.
        `;

        const genAIResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            temperature: 0.1,
            tools: [{googleSearch: {}}],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A concise summary of active coastal warnings. Empty string if none." }
                },
                required: ["summary"]
            }
          }
        });

        const resultText = genAIResponse.text.trim() || '{"summary": ""}';
        let resultData;
        try {
            resultData = JSON.parse(resultText);
        } catch (e) {
            console.error("Failed to parse JSON from AI warnings response:", resultText);
            resultData = { summary: "Error al procesar la respuesta de la IA." };
        }
        
        warningsCache.data = resultData;
        warningsCache.timestamp = now;

        return response.status(200).json(resultData);

    } catch (error) {
        console.error("Error in /api/warnings:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return response.status(500).json({ error: "Failed to fetch warnings.", details: errorMessage });
    }
}
