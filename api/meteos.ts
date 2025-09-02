import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// --- Constants ---
const AEMET_MAIN_BULLETIN_URL = 'https://www.aemet.es/xml/maritima/FQNT42MM.xml';
const AEMET_WARNINGS_URL = 'https://www.aemet.es/xml/maritima/WONT40MM.xml';
const AEMET_GALICIA_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX40MM.xml';
const AEMET_CANTABRICO_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX41MM.xml';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const [mainResponse, warningsResponse, galiciaResponse, cantabricoResponse] = await Promise.all([
        fetch(AEMET_MAIN_BULLETIN_URL),
        fetch(AEMET_WARNINGS_URL),
        fetch(AEMET_GALICIA_COASTAL_URL),
        fetch(AEMET_CANTABRICO_COASTAL_URL)
    ]);

    if (!mainResponse.ok || !warningsResponse.ok || !galiciaResponse.ok || !cantabricoResponse.ok) {
        throw new Error(`Failed to fetch data from AEMET. Statuses: ${mainResponse.status}, ${warningsResponse.status}, ${galiciaResponse.status}, ${cantabricoResponse.status}`);
    }

    const mainXmlText = await mainResponse.text();
    const warningsXmlText = await warningsResponse.text();
    const galiciaXmlText = await galiciaResponse.text();
    const cantabricoXmlText = await cantabricoResponse.text();
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const prompt = `
        Eres un experto asistente meteorológico. Tu tarea es procesar cuatro boletines marítimos en formato XML y formatearlos en texto limpio y legible, optimizado para la síntesis de texto a voz (TTS).

        **Boletín Principal XML (de FQNT42MM.xml):**
        \`\`\`xml
        ${mainXmlText}
        \`\`\`

        **Boletín de Avisos XML (de WONT40MM.xml):**
        \`\`\`xml
        ${warningsXmlText}
        \`\`\`

        **Boletín Costero de Galicia XML (de FQXX40MM.xml):**
        \`\`\`xml
        ${galiciaXmlText}
        \`\`\`

        **Boletín Costero del Cantábrico XML (de FQXX41MM.xml):**
        \`\`\`xml
        ${cantabricoXmlText}
        \`\`\`

        **Instrucciones:**

        1.  **Analiza y Combina Principal/Avisos:**
            *   Del boletín principal, extrae la hora de emisión, el período de validez, la situación general y las predicciones para cada zona marítima.
            *   Del boletín de avisos, identifica todas las zonas marítimas únicas que tienen avisos activos.

        2.  **Formatea el Boletín en Español:** Crea un boletín de texto plano.
            *   Comienza con "AGENCIA ESTATAL DE METEOROLOGIA DE ESPANA".
            *   Añade títulos como "ZONAS DEL ATLANTICO...", "EMITIDO A LAS...", "ALCANZA HASTA LAS...".
            *   Bajo "AVISOS:", lista todas las zonas únicas con avisos del XML de avisos.
            *   Incluye "SITUACION GENERAL..." y "PREDICCION VALIDA HASTA...".
            *   Lista la predicción detallada para cada zona.
            *   **Crucial: Limpia todos los errores tipográficos y artefactos de formato. Asegura que haya una línea en blanco separando la predicción detallada de una zona del título de la siguiente para mejorar la legibilidad.**

        3.  **Traduce el Boletín al Inglés:**
            *   Traduce todo el boletín en español formateado a un inglés claro y preciso, preservando la estructura y el espaciado.

        4.  **Formatea los Avisos en Español:**
            *   Del XML de avisos, extrae el texto completo de todos los avisos activos.
            *   Formatea esto en un bloque de texto limpio y legible en español. Dale un título apropiado como "AVISOS EN VIGOR". Limpia cualquier artefacto XML y asegura una línea en blanco entre cada aviso distinto.

        5.  **Traduce los Avisos al Inglés:**
            *   Traduce el texto de los avisos en español formateado a un inglés claro y preciso. Dale un título apropiado como "CURRENT WARNINGS" y preserva el espaciado entre avisos.

        6.  **Formatea los Boletines Costeros (Solo Español):**
            *   **Galicia:** Procesa el boletín costero de Galicia. Formatea todo el contenido en un bloque de texto limpio y legible.
            *   **Cantábrico:** Procesa el boletín costero del Cantábrico. Formatea todo el contenido en un bloque de texto limpio y legible.

        7.  **Optimización para Texto a Voz (TTS) (CRÍTICO):** Antes de finalizar, aplica las siguientes transformaciones al texto para los seis bloques de salida. Este es el paso más importante.
            *   **Puntuación para Pausas:** Inserta comas y puntos estratégicamente para crear pausas de sonido natural para el motor TTS.
            *   **Aclarar Lecturas de Presión:** Después de cualquier valor de presión atmosférica (ej. 983 o 1028), añade la palabra "milibares" en español, o "millibars" en inglés.
            *   **Expandir Abreviaturas:** Expande todas las abreviaturas de direcciones cardinales (ej. 'NW' se convierte en 'Noroeste' en español y 'Northwest' en inglés).
            *   **Expandir Unidades:** Expande unidades de medida abreviadas (ej. '3 M' se convierte en 'tres metros' en español y 'three meters' en inglés).
            *   **Fechas y Horas Fonéticas:** Escribe las horas fonéticamente (ej. '08:00 UTC' se convierte en 'cero ocho cero cero U T C'). Para las fechas, resuelve términos relativos como "del día siguiente" a la fecha absoluta. El día del mes DEBE escribirse como un dígito (ej. "día 3 de Septiembre"). El nombre del mes debe escribirse completo.
            *   **Aclarar Viento:** Aclara las especificaciones del viento. Por ejemplo, 'W 4 A 6' debe indicarse explícitamente como 'Oeste fuerza cuatro a seis'.
            *   **Números como Palabras:** Con la excepción explícita del día del mes en las fechas, asegúrate de que todos los demás números en el texto se escriban con palabras (ej. '10' se convierte en 'diez', '983' se convierte en 'novecientos ochenta y tres').

        8.  **Devolver JSON:** Proporciona la salida final optimizada para TTS como un objeto JSON con seis claves: "spanish", "english", "spanish_warnings", "english_warnings", "galicia_coastal", "cantabrico_coastal".
    `;
    
    const genAIResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    spanish: { type: Type.STRING, description: "The fully formatted maritime bulletin in Spanish." },
                    english: { type: Type.STRING, description: "The fully formatted maritime bulletin in English." },
                    spanish_warnings: { type: Type.STRING, description: "The fully formatted maritime warnings in Spanish." },
                    english_warnings: { type: Type.STRING, description: "The fully formatted maritime warnings in English." },
                    galicia_coastal: { type: Type.STRING, description: "The fully formatted coastal bulletin for Galicia in Spanish." },
                    cantabrico_coastal: { type: Type.STRING, description: "The fully formatted coastal bulletin for Cantábrico in Spanish." }
                },
                required: ["spanish", "english", "spanish_warnings", "english_warnings", "galicia_coastal", "cantabrico_coastal"],
            },
        },
    });

    const resultText = genAIResponse.text.trim() || '{}';
    return response.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error("Error in /api/meteos:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to process weather data from AI.", details: errorMessage });
  }
}
