import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const prompt = `
    Eres un instructor GMDSS. Tu única tarea es generar un caso práctico para un operador de Estación Radio Costera (CCR) española, basándote ESTRICTAMENTE en el siguiente flujograma. NO seas creativo.

    **Flujograma de Protocolo GMDSS:**

    1.  **Inicio:** Se recibe una alerta (VHF, MF, o HF).
    2.  **Decisión 1: ¿VÁLIDA o NO VÁLIDA?** (Válida = MMSI correcto. No Válida = MMSI inválido, ej: 123456789, 000000000).

    3.  **RUTA: ALERTA VÁLIDA**
        *   **Decisión 2: ¿Tiene POSICIÓN?**
        *   **3a. CON POSICIÓN:**
            *   **Decisión 3: ¿Dentro o Fuera de ZONA SAR?**
            *   **CASO 1 (Válida, con Pos., EN ZONA SAR, VHF/MF/HF):** 1. ACK. 2. Retransmite Alerta. 3. Escucha y espera instrucciones.
            *   **CASO 2 (Válida, con Pos., FUERA ZONA SAR, VHF):** 1. NO ACK. 2. Escucha y espera instrucciones.
            *   **CASO 3 (Válida, con Pos., FUERA ZONA SAR, MF/HF):** 1. NO ACK. 2. Escucha y espera instrucciones.
        *   **3b. SIN POSICIÓN:**
            *   **Decisión 4: ¿Banda de recepción?**
            *   **CASO 4 (Válida, sin Pos., VHF):** 1. ACK. 2. Intenta conseguir posición y retransmite. 3. Escucha y espera instrucciones.
            *   **CASO 5 (Válida, sin Pos., MF/HF):** 1. NO ACK. 2. Escucha y espera instrucciones.

    4.  **RUTA: ALERTA NO VÁLIDA**
        *   **CASO 6 (No Válida):** 1. SÓLO ACK SI ESTÁ EN ZONA SAR. 2. Escucha e intenta conseguir más información. 3. Si se confirma, tratar como VÁLIDA.

    **Tu Tarea:**

    1.  **Selecciona aleatoriamente UNO de los 6 CASOS** descritos arriba.
    2.  **Crea un escenario extremadamente simple** que se ajuste perfectamente al caso seleccionado. El escenario debe contener únicamente la información necesaria: Banda (VHF, MF, o HF), MMSI (válido/inválido), Posición (presente/ausente, y si está dentro/fuera de SAR), y una naturaleza de socorro corta (ej: "vía de agua").
    3.  **REGLA CRÍTICA:** Si el MMSI es inválido, NO incluyas nombre de buque.
    4.  **Genera 2-3 preguntas de opción múltiple (3 opciones)** que evalúen los pasos exactos del protocolo para el caso seleccionado. Las preguntas deben ser directas y sin ambigüedad sobre la acción a tomar (ej: "¿Debe la CCR acusar recibo (ACK)?", "¿Cuál es el siguiente paso correcto?").

    **Formato de Salida:**
    Devuelve el resultado exclusivamente en formato JSON, siguiendo el esquema proporcionado. Asegúrate de que los campos 'isSar', 'band', 'hasPosition' y 'isMmsiValid' en 'details' reflejen con precisión el escenario que has creado.
    `;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            scenario: { type: Type.STRING, description: "Descripción narrativa del escenario de socorro." },
            details: {
                type: Type.OBJECT,
                properties: {
                    isSar: { type: Type.BOOLEAN, description: "True si la posición está dentro de la zona SAR española, false si está fuera." },
                    band: { type: Type.STRING, description: "Banda de comunicación (VHF, MF, HF)." },
                    hasPosition: { type: Type.BOOLEAN, description: "True si se proporciona una posición clara." },
                    isMmsiValid: { type: Type.BOOLEAN, description: "True si el MMSI es válido." }
                },
                required: ["isSar", "band", "hasPosition", "isMmsiValid"]
            },
            questions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        questionText: { type: Type.STRING, description: "El texto de la pregunta." },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswerIndex: { type: Type.INTEGER, description: "El índice (0, 1, o 2) de la respuesta correcta en el array de opciones." }
                    },
                    required: ["questionText", "options", "correctAnswerIndex"]
                }
            }
        },
        required: ["scenario", "details", "questions"]
    };

    const genAIResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 1.0,
        }
    });
    
    const resultText = genAIResponse.text.trim() || '{}';
    return response.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate drill from AI.", details: errorMessage });
  }
}
