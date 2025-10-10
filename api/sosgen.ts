import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { naturalInput } = request.body;

  if (!naturalInput) {
    return response.status(400).json({ error: 'naturalInput is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        stationName: { type: Type.STRING, description: "El nombre completo de la estación de radio costera si se especifica (ej. 'Vigo Radio', 'Finisterre'). Es opcional." },
        mrcc: { type: Type.STRING, description: "El nombre del centro de Salvamento Marítimo o MRCC si se especifica (ej. 'Finisterre', 'Madrid'). Es opcional." },
        spanishDescription: { type: Type.STRING, description: "Una descripción concisa y natural del suceso en español, integrando todos los detalles disponibles (buque, MMSI, POB, posición, peligro, etc.)." },
        englishDescription: { type: Type.STRING, description: "A concise and natural language description of the incident in English, integrating all available details (vessel, MMSI, POB, position, distress, etc.)." }
      },
      required: ["spanishDescription", "englishDescription"]
    };
    
    const prompt = `
    Eres un experto operador de radio costera. Tu única tarea es analizar la siguiente descripción de un suceso de socorro y extraer datos para una plantilla fija. Tu respuesta debe ser factual y basarse estrictamente en la información proporcionada.

    **Reglas Estrictas:**
    1.  **Identifica y Extrae Datos Clave:** Analiza el texto del usuario para encontrar:
        -   El sujeto del socorro (ej. buque, persona, windsurfista).
        -   Nombre del buque.
        -   MMSI.
        -   Indicativo de llamada (Call Sign).
        -   Número de personas a bordo (POB).
        -   Posición (GPS o descriptiva).
        -   Naturaleza del peligro (ej. vía de agua, incendio, en apuros).
    2.  **Crea una Descripción Factual y Natural:** Basándote en la información extraída, redacta una descripción concisa y natural del suceso, tanto en español como en inglés. **No listes los datos**, intégralos fluidamente en una o dos frases. La descripción debe ser una reformulación directa de los hechos.
        -   **Ejemplo de integración (Español):** Si el usuario provee "Buque 'Aurora' MMSI 224123456 con 5 POB tiene una vía de agua en 43 21N 008 25W", una buena descripción sería: "Buque 'Aurora' con MMSI 224123456 y 5 personas a bordo, reporta una vía de agua en la posición 43°21'N 008°25'W."
        -   **Ejemplo de integración (Inglés):** "Vessel 'Aurora', MMSI 224123456 with 5 persons on board, reports taking on water in position 43°21'N 008°25'W."
        -   Si faltan datos, crea la mejor descripción posible con la información disponible (ej. "windsurfista en apuros cerca de la Torre de Hércules.").
    3.  **Extrae el Nombre de la Estación (Opcional):** Si el usuario especifica el nombre de la estación de radio (ej. "Desde Coruña Radio", "Aquí Finisterre Radio"), extrae el nombre completo tal como se proporciona. Si no se menciona, omite este campo.
    4.  **Extrae el Nombre del MRCC (Opcional):** Si el usuario menciona el centro de Salvamento Marítimo o MRCC que lleva el caso (ej. "caso coordinado por MRCC Finisterre", "informar a Salvamento Finisterre"), extrae solo el nombre del centro (ej. "Finisterre"). Si no se menciona, omite este campo.
    5.  **REGLA CRÍTICA: NO INVENTES INFORMACIÓN.** Solo usa los datos explícitamente proporcionados. No añadas detalles, no hagas suposiciones. Tu salida debe ser una representación fiel y directa de la entrada.

    **Texto del usuario:** "${naturalInput}"

    Devuelve tu respuesta exclusivamente en formato JSON, siguiendo el esquema proporcionado.
        `;

    const genAIResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2,
      }
    });

    const resultText = genAIResponse.text?.trim() || '{}';
    return response.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate message from AI.", details: errorMessage });
  }
}