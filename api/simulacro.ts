
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

    // Corrected Strategy: Use valid model names defined in SDK guidelines
    const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-lite-latest'];
    let genAIResponse;
    let lastError;

    // Define prompts logic (abstracted to allow reuse in loop)
    const getPromptAndSchema = (modelType: string) => {
        if (modelType === 'dsc') {
            return {
                prompt: `
                Eres un instructor GMDSS experto. Genera un caso práctico completo de ALERTA DSC para un operador de un Centro de Coordinación de Salvamento (CCR) en España.
                
                **IMPORTANTE - Campo 'scenario':**
                - NO pongas un título breve.
                - Genera una NARRATIVA DETALLADA (2-3 frases) que describa la situación exacta.
                - Ejemplo: "El CCR Finisterre recibe una alerta DSC en VHF Canal 70 del pesquero 'MAR DE FONDO' (MMSI 224098765). La alerta indica 'Fire/Explosion' e incluye coordenadas 43-20N 009-15W. El buque se encuentra a 20 millas de la costa."
                - La narrativa debe proporcionar el contexto necesario (tipo de llamada, posición, zona) para responder las preguntas.

                **Reglas del ejercicio:**
                1. Selecciona aleatoriamente una situación técnica (Válida/No Válida, Con/Sin Posición, En/Fuera Zona SAR).
                2. Usa un nombre de buque ficticio pero realista.
                3. Usa una estación costera de esta lista: ${EeccList}.
                4. Genera 2 o 3 preguntas técnicas sobre el procedimiento exacto que el operador debe realizar ante esta alerta específica (ACK, Relay, Silencio, etc.).
                
                Formato JSON estricto.`,
                schema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING },
                        scenario: { type: Type.STRING, description: "Detailed narrative of the distress situation context." },
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
                Eres un instructor GMDSS. Genera un simulacro detallado de SOCORRO POR VOZ (Radiotelefonía).
                
                **IMPORTANTE - Campo 'scenario':**
                - NO pongas un título breve como "Incendio".
                - Genera una NARRATIVA DETALLADA que describa la llamada entrante tal como la percibe el operador.
                - Ejemplo: "A las 10:00 UTC, escuchas en Canal 16: 'MAYDAY, MAYDAY, MAYDAY. Aquí pesquero NUEVO HORIZONTE. Tenemos una vía de agua incontenible. Posición 5 millas al Norte de Cabo Prior. 4 personas a bordo.'."
                - El escenario debe contener los datos (o la falta explícita de ellos) necesarios para evaluar la respuesta del alumno.

                **Reglas:**
                1. Situación de emergencia aleatoria (Incendio, Vía de agua, Abandono, Hombre al agua).
                2. Usa una estación costera de: ${EeccList}.
                3. Genera preguntas secuenciales lógicas basadas en el escenario descrito:
                   - Pregunta 1: Sobre la forma correcta de acusar recibo (fraseología).
                   - Pregunta 2: Sobre la información crítica que falta (si falta algo) o la siguiente acción a tomar.
                   - Pregunta 3: Sobre gestión posterior (Relay, Silencio, etc.).
                
                Formato JSON estricto.`,
                schema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING },
                        scenario: { type: Type.STRING, description: "Detailed narrative of the incoming distress call." },
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
