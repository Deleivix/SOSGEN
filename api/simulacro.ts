
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type } = request.body;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const EeccList = `'La Guardia Radio', 'Vigo Radio', 'Finisterre Radio', 'Coruña Radio', 'Ortegal Radio', 'Navia Radio', 'Cabo Peñas Radio', 'Santander Radio', 'Bilbao Radio', 'Pasajes Radio', 'Melilla Radio', 'Cabo de Gata Radio', 'Cartagena Radio', 'Cabo de la Nao Radio', 'Castellón Radio', 'Ibiza Radio', 'Menorca Radio', 'Palma Radio', 'Tarragona Radio', 'Barcelona Radio', 'Begur Radio', 'Cadaqués Radio', 'Huelva Radio', 'Cádiz Radio', 'Tarifa Radio', 'Málaga Radio', 'Motril Radio', 'La Palma Radio', 'Hierro Radio', 'Gomera Radio', 'Tenerife Radio', 'Las Palmas Radio', 'Fuerteventura Radio', 'Yaiza Radio', 'Arrecife Radio', 'La Restinga Radio', 'Garafía Radio'`;

    // Strategy: Primary -> Lite -> Legacy Flash (1.5) for maximum availability
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash-lite-preview-02-05', 'gemini-1.5-flash'];
    let genAIResponse;
    let lastError;

    // Define prompts logic (abstracted to allow reuse in loop)
    const getPromptAndSchema = (modelType: string) => {
        if (modelType === 'dsc') {
            return {
                prompt: `
                Eres un instructor GMDSS experto. Genera un caso práctico de ALERTA DSC para operador de CCR española.
                
                **Reglas:**
                1. Selecciona aleatoriamente uno de los 6 casos del protocolo (Válida/No Válida, Con/Sin Posición, En/Fuera Zona SAR).
                2. Crea un escenario realista pero breve.
                3. Usa un nombre de buque ÚNICO (ej. "MAR DE ONS", "GLORIA B").
                4. Usa una estación de esta lista: ${EeccList}.
                5. Genera 2 preguntas de opción múltiple (3 opciones) sobre el protocolo exacto a seguir (ACK/NO ACK, Retransmisión, etc.).
                
                Formato JSON estricto.`,
                schema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING },
                        scenario: { type: Type.STRING },
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    questionText: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctAnswerIndex: { type: Type.INTEGER }
                                },
                                required: ["questionText", "options", "correctAnswerIndex"]
                            }
                        }
                    },
                    required: ["type", "scenario", "questions"]
                }
            };
        } else {
            return {
                prompt: `
                Eres un instructor GMDSS. Genera un simulacro de SOCORRO POR VOZ (Radiotelefonía).
                
                **Reglas:**
                1. Escenario aleatorio (Incendio, Vía de agua, Hombre al agua).
                2. Nombre de buque ÚNICO y estación de: ${EeccList}.
                3. Genera el mensaje inicial de socorro (MAYDAY) que recibe el operador.
                4. Genera preguntas secuenciales: 
                   - 1º: Acuse de recibo correcto ("RECEIVED MAYDAY").
                   - 2º: Obtener datos faltantes (Posición, POB, Peligro).
                   - 3º: Acción final (MAYDAY RELAY).
                
                Formato JSON estricto.`,
                schema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING },
                        scenario: { type: Type.STRING },
                        fullDetails: { type: Type.STRING },
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    questionText: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctAnswerIndex: { type: Type.INTEGER },
                                    feedback: { type: Type.STRING }
                                },
                                required: ["questionText", "options", "correctAnswerIndex", "feedback"]
                            }
                        }
                    },
                    required: ["type", "scenario", "fullDetails", "questions"]
                }
            };
        }
    };

    const { prompt, schema } = getPromptAndSchema(type);

    for (const model of modelsToTry) {
        try {
            console.log(`Attempting generation with model: ${model}`);
            genAIResponse = await ai.models.generateContent({
                model: model, 
                contents: prompt,
                config: { 
                    responseMimeType: "application/json", 
                    responseSchema: schema, 
                    temperature: 0.8 
                }
            });
            
            // If successful, break the loop
            if (genAIResponse && genAIResponse.text) break;
            
        } catch (error: any) {
            lastError = error;
            // Only retry on Quota (429) or Service Unavailable (503)
            if (error.status === 429 || error.status === 503 || (error.message && error.message.includes('429'))) {
                console.warn(`Model ${model} failed with ${error.status}. Retrying with next model...`);
                continue; 
            }
            // If it's another error (e.g., Bad Request), throw immediately
            throw error;
        }
    }

    if (!genAIResponse || !genAIResponse.text) {
        throw lastError || new Error("Failed to generate content with all available models.");
    }
    
    const resultText = genAIResponse.text.trim();
    return response.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate drill from AI.", details: errorMessage });
  }
}
