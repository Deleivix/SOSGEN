// This file implements an AI-powered bulletin processing service.
// It takes raw bulletin text and uses Gemini to generate a structured summary.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { bulletinText } = request.body;

  if (!bulletinText) {
    return response.status(400).json({ error: 'bulletinText is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const prompt = `
    Eres un experto meteorólogo marino y operador de radio costera. Tu tarea es analizar el siguiente boletín meteorológico de AEMET y generar un resumen estructurado y claro en español. El resumen debe ser conciso y centrarse en la información más crítica para la navegación.

    **Formato de Salida:**
    1.  **Título:** Un título claro que identifique el boletín (ej. "Resumen del Boletín Costero para Galicia").
    2.  **Avisos en Vigor:** Extrae y lista cualquier aviso de temporal o vientos fuertes (fuerza 7 o superior). Si no hay, indica "Sin avisos en vigor".
    3.  **Situación General:** Describe brevemente la situación sinóptica (anticiclones, borrascas).
    4.  **Predicción por Zonas:** Para cada zona marítima mencionada, proporciona un resumen de:
        *   **Viento:** Dirección y fuerza (en Beaufort).
        *   **Mar:** Estado de la mar (ej. "Marejada") y altura de la mar de fondo (si se especifica).
        *   **Visibilidad:** (ej. "Buena", "Regular con aguaceros").
        *   **Tiempo:** Fenómenos significativos (ej. "Lluvias", "Chubascos ocasionales").

    **Boletín a analizar:**
    \`\`\`
    ${bulletinText}
    \`\`\`

    Proporciona únicamente el resumen, sin explicaciones adicionales.
    `;

    const genAIResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
      }
    });

    const result = genAIResponse.text.trim();
    return response.status(200).json({ result });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to process bulletin from AI.", details: errorMessage });
  }
}
