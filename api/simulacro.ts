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

    if (type === 'dsc') {
        const prompt = `
        Eres un instructor GMDSS. Tu única tarea es generar un caso práctico de ALERTA DSC para un operador de Estación Radio Costera (CCR) española, basándote ESTRICTAMENTE en el siguiente flujograma.

        **Flujograma de Protocolo GMDSS (Alertas DSC):**
        1.  **Inicio:** Se recibe una alerta (VHF, MF, o HF).
        2.  **Decisión 1: ¿VÁLIDA o NO VÁLIDA?** (Válida = MMSI correcto. No Válida = MMSI inválido).
        3.  **RUTA: ALERTA VÁLIDA**
            *   **Decisión 2: ¿Tiene POSICIÓN?**
            *   **3a. CON POSICIÓN:**
                *   **Decisión 3: ¿Dentro o Fuera de ZONA SAR?**
                *   **CASO 1 (Válida, con Pos., EN ZONA SAR):** 1. ACK. 2. Retransmite Alerta. 3. Escucha.
                *   **CASO 2 (Válida, con Pos., FUERA ZONA SAR, VHF):** 1. NO ACK. 2. Escucha.
                *   **CASO 3 (Válida, con Pos., FUERA ZONA SAR, MF/HF):** 1. NO ACK. 2. Escucha.
            *   **3b. SIN POSICIÓN:**
                *   **Decisión 4: ¿Banda?**
                *   **CASO 4 (Válida, sin Pos., VHF):** 1. ACK. 2. Intenta conseguir posición y retransmite.
                *   **CASO 5 (Válida, sin Pos., MF/HF):** 1. NO ACK. 2. Escucha.
        4.  **RUTA: ALERTA NO VÁLIDA**
            *   **CASO 6 (No Válida):** 1. SÓLO ACK SI ESTÁ EN ZONA SAR. 2. Escucha e intenta conseguir más información.

        **Tu Tarea:**
        1.  **Selecciona aleatoriamente UNO de los 6 CASOS.**
        2.  **Crea un escenario simple y realista** que se ajuste al caso. El escenario debe contener únicamente la información que una alerta DSC real podría incluir: Banda (VHF, MF, o HF), MMSI (válido/inválido), Posición (presente/ausente), y opcionalmente una naturaleza de socorro. **Recuerda que solo el MMSI y la banda son obligatorios en una alerta DSC real.**
        3.  **Genera 2-3 preguntas de opción múltiple (3 opciones)** que evalúen los pasos exactos del protocolo para el caso seleccionado (ej: "¿Debe la CCR acusar recibo (ACK)?").

        **Formato de Salida:** Devuelve el resultado exclusivamente en formato JSON, siguiendo el esquema.
        `;
        
        const dscSchema = {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, description: "Siempre será 'dsc'."},
                scenario: { type: Type.STRING, description: "Descripción narrativa del escenario de socorro." },
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
        };

        const genAIResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: dscSchema, temperature: 0.3 }
        });
        
        const resultText = genAIResponse.text.trim() || '{}';
        return response.status(200).json(JSON.parse(resultText));

    } else if (type === 'radiotelephony') {
        const prompt = `
        Eres un instructor GMDSS experto. Tu tarea es generar un simulacro interactivo de una LLAMADA DE SOCORRO POR RADIOTELEFONÍA para un operador de CCR.

        **Casuística de Radiotelefonía:**
        1.  Con posición, DENTRO de zona SAR.
        2.  Con posición, FUERA de zona SAR (VHF).
        3.  Con posición, FUERA de zona SAR (MF/HF).
        4.  Sin posición (VHF).
        5.  Sin posición (MF/HF).

        **Tu Tarea:**
        1.  **Selecciona aleatoriamente UNO de los 5 casos.**
        2.  **Crea un escenario completo pero oculto:** Define todos los detalles: nombre del buque, POB, posición exacta (o descripción si no la tiene), naturaleza del socorro (ej: "incendio"), y si la situación requiere abandonar el buque.
        3.  **Genera una llamada inicial:** Redacta la primera transmisión que la CCR recibiría del buque. Debe ser realista y, si el caso lo requiere, incompleta (ej: sin posición). La llamada puede ser en español o inglés (50% de probabilidad).
        4.  **Crea una secuencia de preguntas INTERACTIVAS (3 a 5):** Cada pregunta debe simular la conversación y poner a prueba la habilidad del operador para priorizar información.
            *   **Regla de Prioridad CRÍTICA:** La primera pregunta que formules SIEMPRE debe ser para obtener la **POSICIÓN**, a menos que la posición ya se haya dado claramente en la llamada inicial. Las siguientes preguntas deben seguir el orden: **POB** y luego **Naturaleza del Peligro**. Las opciones de respuesta deben incluir la pregunta correcta y otras incorrectas.
            *   **Caso de Abandono:** Si el escenario lo requiere, incluye una pregunta sobre qué consejo dar (chalecos, radiobaliza, VHF portátil).
            *   **Protocolo Final:** La última pregunta SIEMPRE debe ser sobre la acción de protocolo final correcta (ej: Acusar recibo y retransmitir), basándose en el caso.
        5.  **Proporciona feedback claro y conciso** para cada pregunta explicando por qué la respuesta es correcta.
        
        **Regla de Idioma:** Si la llamada inicial (scenario) está en inglés, TODAS las opciones de respuesta ('options') deben estar en inglés. El resto del JSON (questionText, feedback) debe estar en español.

        **Formato de Salida:** Devuelve el resultado exclusivamente en formato JSON, siguiendo el esquema.`;

        const radioSchema = {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, description: "Siempre será 'radiotelephony'."},
                scenario: { type: Type.STRING, description: "La llamada de socorro inicial que escucha el operador." },
                fullDetails: { type: Type.STRING, description: "Un resumen completo de la situación (posición, POB, peligro, etc.) para mostrar al final." },
                questions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            questionText: { type: Type.STRING, description: "La pregunta para el operador (ej: '¿Qué es lo primero que debes preguntar?')." },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswerIndex: { type: Type.INTEGER },
                            feedback: { type: Type.STRING, description: "Explicación de la respuesta correcta." }
                        },
                        required: ["questionText", "options", "correctAnswerIndex", "feedback"]
                    }
                }
            },
            required: ["type", "scenario", "fullDetails", "questions"]
        };

        const genAIResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: radioSchema, temperature: 0.2 }
        });
        
        const resultText = genAIResponse.text.trim() || '{}';
        return response.status(200).json(JSON.parse(resultText));
    
    } else {
        return response.status(400).json({ error: 'Invalid or missing drill type specified.' });
    }

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate drill from AI.", details: errorMessage });
  }
}