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
        Eres un instructor GMDSS experto y estricto. Tu única tarea es generar un caso práctico de ALERTA DSC para un operador de Estación Radio Costera (CCR) española, basándote INFLEXIBLEMENTE en el siguiente flujograma y reglas.

        **Flujograma de Protocolo GMDSS (Alertas DSC) - Reglas Inquebrantables:**
        1.  **Inicio:** Se recibe una alerta (VHF, MF, o HF).
        2.  **Decisión 1: ¿VÁLIDA o NO VÁLIDA?** (Válida = MMSI correcto. No Válida = MMSI inválido).
        3.  **RUTA: ALERTA VÁLIDA**
            *   **Decisión 2: ¿Tiene POSICIÓN?**
            *   **3a. CON POSICIÓN:**
                *   **Decisión 3: ¿Dentro o Fuera de ZONA SAR?**
                *   **CASO 1 (Válida, con Pos., EN ZONA SAR):** Procedimiento: 1. ACK. 2. Retransmite Alerta. 3. Escucha.
                *   **CASO 2 (Válida, con Pos., FUERA ZONA SAR, VHF):** Procedimiento: 1. NO ACK. 2. Escucha.
                *   **CASO 3 (Válida, con Pos., FUERA ZONA SAR, MF/HF):** Procedimiento: 1. NO ACK. 2. Escucha.
            *   **3b. SIN POSICIÓN:**
                *   **Decisión 4: ¿Banda?**
                *   **CASO 4 (Válida, sin Pos., VHF):** Procedimiento: 1. ACK. 2. Intenta conseguir posición y retransmite. La acción inmediata tras el ACK es intentar establecer comunicación para obtener la posición.
                *   **CASO 5 (Válida, sin Pos., MF/HF):** Procedimiento: 1. NO ACK. 2. Escucha.
        4.  **RUTA: ALERTA NO VÁLIDA**
            *   **CASO 6 (No Válida):** Procedimiento: 1. SÓLO ACK SI ESTÁ EN ZONA SAR. 2. Escucha e intenta conseguir más información.

        **Tu Tarea:**
        1.  **Selecciona aleatoriamente UNO de los 6 CASOS.**
        2.  **Crea un escenario simple y realista** que se ajuste perfectamente al caso. El escenario debe contener únicamente la información que una alerta DSC real podría incluir.
        3.  **AUMENTA LA VARIEDAD:** Utiliza diferentes nombres de Estaciones Costeras españolas (ej: Coruña Radio, Valencia Radio, Las Palmas Radio, etc.), diferentes nombres de buques y diferentes naturalezas de socorro (ej: vía de agua, colisión, hombre al agua, etc.). NO uses siempre 'Tarifa Radio' o 'incendio'.
        4.  **Genera 2 preguntas de opción múltiple (3 opciones)** que evalúen los pasos exactos del protocolo para el caso seleccionado. Las preguntas y respuestas deben ser directas y sin ambigüedades.

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
            config: { responseMimeType: "application/json", responseSchema: dscSchema, temperature: 0.1 }
        });
        
        const resultText = genAIResponse.text.trim() || '{}';
        return response.status(200).json(JSON.parse(resultText));

    } else if (type === 'radiotelephony') {
        const prompt = `
        Eres un instructor GMDSS experto y extremadamente estricto. Tu tarea es generar un simulacro interactivo de una LLAMADA DE SOCORRO POR RADIOTELEFONÍA para un operador de CCR. El simulacro debe seguir el protocolo de forma inflexible, sin creatividad.

        **Casuística de Radiotelefonía:**
        1.  Con posición, DENTRO de zona SAR.
        2.  Con posición, FUERA de zona SAR (VHF).
        3.  Con posición, FUERA de zona SAR (MF/HF).
        4.  Sin posición (VHF).
        5.  Sin posición (MF/HF).

        **REGLAS INQUEBRANTABLES:**
        1.  **Selecciona aleatoriamente UNO de los 5 casos.**
        2.  **Crea un escenario completo pero oculto:** Define: nombre del buque, POB, posición (o falta de ella), naturaleza del socorro. Opcionalmente, el escenario puede incluir que el buque está informando que abandona la nave.
        3.  **Genera una llamada inicial:** Redacta la primera transmisión que la CCR recibiría. Debe ser realista y, si el caso lo requiere, incompleta. La llamada puede ser en español o inglés (50% de probabilidad).
        4.  **Crea una secuencia de 3 a 4 preguntas INTERACTIVAS que sigan este orden ESTRICTO:**
            *   **Pregunta 1 (PRIORIDAD MÁXIMA):** Obtener la **POSICIÓN**, a menos que ya se haya dado. Las opciones deben ser sobre cómo preguntar la posición.
            *   **Pregunta 2:** Obtener el **POB (Personas a Bordo)**, a menos que ya se haya dado.
            *   **Pregunta 3:** Obtener la **NATURALEZA DEL PELIGRO**, a menos que ya se haya dado.
            *   **PROHIBIDO:** No hagas preguntas sobre otra información. El objetivo es obtener los datos críticos para retransmitir la alerta lo antes posible.
        5.  **Regla de Abandono de Buque:**
            *   **PROHIBIDO:** NUNCA generes una pregunta donde el operador de la CCR pregunte si van a abandonar el buque.
            *   **SÓLO SI** el escenario que creaste incluye que el buque informa de su abandono, la siguiente pregunta (después de obtener los datos críticos) debe ser sobre las recomendaciones de seguridad. Las opciones de respuesta deben incluir la fraseología correcta para recomendar: **"chalecos salvavidas, radiobaliza (EPIRB) y VHF portátil"**.
        6.  **Protocolo Final:** La última pregunta SIEMPRE debe ser sobre la acción de protocolo final correcta (ej: Acusar recibo y retransmitir MAYDAY RELAY), basándose en el caso.
        7.  **Proporciona feedback claro y conciso** para cada pregunta explicando por qué la respuesta es correcta según el protocolo.
        
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