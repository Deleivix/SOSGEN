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
        3.  **MÁXIMA VARIEDAD Y CREATIVIDAD:** Cada vez que generes un caso, DEBES inventar datos completamente nuevos para evitar la repetición. Sé creativo.
            *   **Nombres de Buques:** Usa nombres únicos y variados (pesqueros, mercantes, veleros, etc.). Ejemplos: "MAR DE ONS", "GLORIA B", "CARINA", "PUNTA SALINAS". Evita nombres comunes como "Barco 1".
            *   **Naturalezas de Socorro:** Varía la causa del peligro. Ejemplos: "incendio en sala de máquinas", "fallo de gobierno", "emergencia médica grave", "colisión con objeto semi-sumergido", "vía de agua incontrolable", "hombre al agua".
            *   **Estación Costera (CCR):** DEBES usar EXCLUSIVAMENTE un nombre de la siguiente lista oficial de España, y ROTA el que usas en cada generación: ${EeccList}.
            *   **MMSI y Posiciones:** Genera siempre números de MMSI y coordenadas geográficas realistas pero diferentes.
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
            config: { responseMimeType: "application/json", responseSchema: dscSchema, temperature: 0.8 }
        });
        
        const resultText = genAIResponse.text.trim() || '{}';
        return response.status(200).json(JSON.parse(resultText));

    } else if (type === 'radiotelephony') {
        const prompt = `
        Eres un instructor GMDSS experto y extremadamente estricto. Tu tarea es generar un simulacro interactivo de una LLAMADA DE SOCORRO POR RADIOTELEFONÍA para un operador de CCR. El simulacro debe seguir el protocolo de forma inflexible.

        **Casuística de Radiotelefonía (selecciona uno aleatoriamente):**
        1. Con posición, DENTRO de zona SAR.
        2. Con posición, FUERA de zona SAR (VHF).
        3. Con posición, FUERA de zona SAR (MF/HF).
        4. Sin posición (VHF).
        5. Sin posición (MF/HF).

        **REGLAS INQUEBRANTABLES DE GENERACIÓN:**

        1.  **Crea un escenario completo pero oculto (CON MÁXIMA VARIEDAD):** Cada vez que generes un caso, DEBES inventar datos completamente nuevos para evitar la repetición. Sé creativo.
            *   **Nombre del Buque:** Usa nombres únicos y variados (pesqueros, mercantes, veleros, yates, etc.). Ejemplos: "NUEVO ANITA", "MONTE GALIÑEIRO", "VEGA", "STELLA MARIS". No repitas nombres entre simulacros.
            *   **POB (Personas a Bordo):** Usa un número realista y variado de personas.
            *   **Posición:** Inventa coordenadas geográficas realistas y diferentes en cada caso.
            *   **Naturaleza del Socorro:** Varía ampliamente la causa del peligro. Ejemplos: "incendio en sala de máquinas", "fallo de gobierno", "emergencia médica grave", "colisión con objeto semi-sumergido", "vía de agua incontrolable", "hombre al agua", "a la deriva sin propulsión".
            *   **Estación Costera (CCR):** DEBES usar EXCLUSIVAMENTE un nombre de la siguiente lista oficial de España, y ROTA el que usas en cada generación: ${EeccList}.
        2.  **Genera una llamada inicial (scenario):** Redacta la primera transmisión que la CCR recibiría. Debe ser realista y, si el caso lo requiere, incompleta. La llamada puede ser en español o inglés (50% de probabilidad).

        3.  **SECUENCIA DE PREGUNTAS (CRÍTICO):** La secuencia de preguntas DEBE seguir este orden estricto:

            *   **PREGUNTA 1: ACUSE DE RECIBO INICIAL.**
                *   La PRIMERA pregunta SIEMPRE debe ser sobre cuál es la respuesta verbal inmediata y correcta.
                *   La opción correcta DEBE incluir la fraseología "MAYDAY [Nombre del buque] this is [Nombre de la CCR] RECEIVED MAYDAY".
                *   El feedback debe explicar que "RECEIVED MAYDAY" es el acuse de recibo oficial y el primer paso crucial para tomar control de las comunicaciones y asegurar al buque que ha sido escuchado.

            *   **PREGUNTAS INTERMEDIAS: OBTENER INFORMACIÓN FALTANTE.**
                *   Analiza la llamada inicial (scenario) para identificar qué datos críticos (POSICIÓN, POB, NATURALEZA DEL PELIGRO) ya han sido proporcionados.
                *   Crea preguntas INTERACTIVAS ÚNICAMENTE para la información que FALTA, siguiendo el estricto orden de prioridad: 1º POSICIÓN, 2º POB, 3º NATURALEZA DEL PELIGRO.
                *   **PROHIBIDO:** No generes preguntas sobre información que ya se ha dado. El objetivo es ser eficiente.

            *   **PREGUNTA OPCIONAL: ABANDONO DE BUQUE.**
                *   **PROHIBIDO:** NUNCA generes una pregunta donde la CCR pregunte si van a abandonar el buque.
                *   **SÓLO SI** el escenario que creaste incluye que el buque informa de su abandono, la siguiente pregunta (después de obtener los datos críticos) debe ser sobre las recomendaciones de seguridad. La opción correcta debe incluir recomendar: **"chalecos salvavidas, radiobaliza (EPIRB) y VHF portátil"**.

            *   **PREGUNTA FINAL: ACCIÓN DE PROTOCOLO.**
                *   La ÚLTIMA pregunta SIEMPRE debe ser sobre la acción de protocolo a realizar DESPUÉS de haber acusado recibo y obtenido toda la información crítica.
                *   La respuesta correcta será casi siempre transmitir un "MAYDAY RELAY" (a menos que el caso específico lo impida, como estar en puerto).
                *   El feedback debe explicar que, una vez recopilada la información esencial, la retransmisión de la alerta es vital para coordinar la respuesta SAR.
        
        4.  **Regla de Idioma:** Si la llamada inicial (scenario) está en inglés, TODAS las opciones de respuesta ('options') deben estar en inglés. El resto del JSON (questionText, feedback) debe estar en español.

        5.  **Formato de Salida:** Devuelve el resultado exclusivamente en formato JSON, siguiendo el esquema.`;

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
            config: { responseMimeType: "application/json", responseSchema: radioSchema, temperature: 0.8 }
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