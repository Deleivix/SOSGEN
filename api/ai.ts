
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { sql } from '@vercel/postgres';
import { AiManager } from './_ai_manager';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

  const { action, ...params } = request.body;

  // 1. GLOBAL ECO MODE CHECK
  const isEco = await AiManager.isEcoMode();

  try {
    switch (action) {
        case 'generate_drill':
            return await handleDrill(params, isEco, response);
        case 'sosgen':
            return await handleSosgen(params, isEco, response);
        case 'translate':
            return await handleTranslate(params, isEco, response);
        case 'mmsi_search':
            return await handleMmsiSearch(params, isEco, response);
        default:
            return response.status(400).json({ error: 'Invalid AI action specified' });
    }
  } catch (error) {
      console.error(`AI API Error (${action}):`, error);
      return response.status(500).json({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) });
  }
}

// --- HANDLERS ---

async function handleDrill(params: any, isEco: boolean, response: VercelResponse) {
    const { type } = params;
    
    // DB Init for Library
    try {
        await sql`CREATE TABLE IF NOT EXISTS drills_library (id SERIAL PRIMARY KEY, drill_type VARCHAR(50) NOT NULL, drill_data JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());`;
    } catch (e) {}

    if (isEco) return await serveCachedOrStaticDrill(type, response);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const EeccList = `'La Guardia Radio', 'Vigo Radio', 'Finisterre Radio', 'Coruña Radio', 'Ortegal Radio', 'Navia Radio', 'Cabo Peñas Radio', 'Santander Radio', 'Bilbao Radio', 'Pasajes Radio'`;
        
        const getPromptAndSchema = (modelType: string) => {
            if (modelType === 'dsc') {
                return {
                    prompt: `Genera un caso práctico GMDSS ALERTA DSC para operador CCR España.
                    **JSON:**
                    1. 'title': Título corto.
                    2. 'scenario': NARRATIVA DETALLADA (3-4 frases). Incluir: CCR, Canal (VHF 70/MF), MMSI, Peligro, Coordenadas.
                    **Reglas:** Aleatorio (Válida/No Válida, Con/Sin Posición, En/Fuera Zona). Costera: ${EeccList}. 3 Preguntas técnicas.`,
                    schema: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            title: { type: Type.STRING },
                            scenario: { type: Type.STRING },
                            questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { questionText: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswerIndex: { type: Type.INTEGER } } } }
                        },
                        required: ["type", "title", "scenario", "questions"]
                    }
                };
            } else {
                return {
                    prompt: `Genera simulacro GMDSS VOZ (Radiotelefonía).
                    **JSON:**
                    1. 'title': Título corto.
                    2. 'scenario': TRANSCRIPCIÓN DETALLADA de la llamada (Mayday...).
                    **Reglas:** Emergencia aleatoria. Costera: ${EeccList}. 3 Preguntas.`,
                    schema: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            title: { type: Type.STRING },
                            scenario: { type: Type.STRING },
                            fullDetails: { type: Type.STRING },
                            questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { questionText: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswerIndex: { type: Type.INTEGER }, feedback: { type: Type.STRING } } } }
                        },
                        required: ["type", "title", "scenario", "fullDetails", "questions"]
                    }
                };
            }
        };

        const { prompt, schema } = getPromptAndSchema(type);
        const genAIResponse = await tryGenerate(ai, prompt, schema, 0.9);
        const jsonResult = JSON.parse(genAIResponse.text.trim());

        try { await sql`INSERT INTO drills_library (drill_type, drill_data) VALUES (${type}, ${jsonResult})`; } catch (e) {}
        return response.status(200).json(jsonResult);

    } catch (error) {
        return await serveCachedOrStaticDrill(type, response);
    }
}

async function handleSosgen(params: any, isEco: boolean, response: VercelResponse) {
    const { naturalInput } = params;
    if (isEco) return response.status(200).json(AiManager.getFallbackSosgen(naturalInput));

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const schema = {
            type: Type.OBJECT,
            properties: { stationName: { type: Type.STRING }, mrcc: { type: Type.STRING }, spanishDescription: { type: Type.STRING }, englishDescription: { type: Type.STRING } },
            required: ["spanishDescription", "englishDescription"]
        };
        const prompt = `Analiza texto socorro: "${naturalInput}". Redacta ESPAÑOL e INGLÉS (MAYDAY RELAY). Extrae Buque, MMSI, POB, Posición, Peligro. JSON.`;
        
        const genAIResponse = await tryGenerate(ai, prompt, schema, 0.1);
        return response.status(200).json(JSON.parse(genAIResponse.text.trim()));
    } catch (error) {
        return response.status(200).json(AiManager.getFallbackSosgen(naturalInput));
    }
}

async function handleTranslate(params: any, isEco: boolean, response: VercelResponse) {
    const { textToTranslate, context } = params;
    if (isEco) return response.status(200).json({ translation: AiManager.getFallbackTranslation(textToTranslate) });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        let prompt = context === 'bulletin' 
            ? `Translate Spanish maritime weather bulletin to English. Keep format. Text: \`\`\`${textToTranslate}\`\`\`` 
            : `Translate nautical text Spanish/English. Output only translation: "${textToTranslate}"`;
        
        const genAIResponse = await tryGenerate(ai, prompt, undefined, 0.1);
        return response.status(200).json({ translation: genAIResponse.text.trim() });
    } catch (error) {
        return response.status(200).json({ translation: AiManager.getFallbackTranslation(textToTranslate) });
    }
}

async function handleMmsiSearch(params: any, isEco: boolean, response: VercelResponse) {
    const { mmsi } = params;
    if (isEco) return response.status(200).json(AiManager.getFallbackMmsiSearch(mmsi));

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const prompt = `Find vessel info for MMSI "${mmsi}" (MarineTraffic/VesselFinder). Extract: stationName, imo, callSign, flag, stationType, length, beam, grossTonnage, lastPosition, destination. JSON only.`;
        
        const genAIResponse = await tryGenerate(ai, prompt, undefined, 0.1, true); // True for tools
        
        let resultText = genAIResponse.text.trim();
        const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) resultText = jsonMatch[1];
        
        let resultData = JSON.parse(resultText);
        const sources = genAIResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return response.status(200).json({ ...resultData, sources });
    } catch (error) {
        return response.status(200).json(AiManager.getFallbackMmsiSearch(mmsi));
    }
}

// --- UTILS ---

async function tryGenerate(ai: GoogleGenAI, prompt: string, schema?: any, temp: number = 0.5, useSearch: boolean = false) {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-lite-latest'];
    let lastError;

    for (const model of modelsToTry) {
        try {
            const config: any = { temperature: temp };
            if (schema) {
                config.responseMimeType = "application/json";
                config.responseSchema = schema;
            }
            if (useSearch) {
                config.tools = [{googleSearch: {}}];
            }

            const result = await ai.models.generateContent({ model, contents: prompt, config });
            if (result && result.text) return result;
        } catch (error: any) {
            lastError = error;
            await AiManager.reportError(error);
            if (error.status === 429 || error.status === 503) continue;
            throw error;
        }
    }
    throw lastError || new Error("AI Generation failed");
}

async function serveCachedOrStaticDrill(type: string, response: VercelResponse) {
    try {
        const { rows } = await sql`SELECT drill_data FROM drills_library WHERE drill_type = ${type} ORDER BY RANDOM() LIMIT 1;`;
        if (rows.length > 0) return response.status(200).json(rows[0].drill_data);
    } catch (e) {}
    return response.status(200).json(AiManager.getFallbackDrill(type));
}
