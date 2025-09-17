import type { VercelRequest, VercelResponse } from '@vercel/node';

// AEMET URLs for coastal warnings
const AEMET_GALICIA_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX40MM.xml';
const AEMET_CANTABRICO_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX41MM.xml';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const [galiciaResponse, cantabricoResponse] = await Promise.all([
        // FIX: Removed the 'next' property from the fetch options as it's Next.js specific and not valid in this context.
        fetch(AEMET_GALICIA_COASTAL_URL),
        // FIX: Removed the 'next' property from the fetch options as it's Next.js specific and not valid in this context.
        fetch(AEMET_CANTABRICO_COASTAL_URL)
    ]);

    if (!galiciaResponse.ok || !cantabricoResponse.ok) {
        throw new Error(`Failed to fetch data from AEMET. Statuses: Galicia ${galiciaResponse.status}, Cantábrico ${cantabricoResponse.status}`);
    }

    const galiciaXmlText = await galiciaResponse.text();
    const cantabricoXmlText = await cantabricoResponse.text();
    
    // Return both raw XMLs
    response.setHeader('Content-Type', 'application/json');
    return response.status(200).json({ 
        rawGalicia: galiciaXmlText,
        rawCantabrico: cantabricoXmlText
    });

  } catch (error) {
    console.error("Error in /api/warnings (raw fetch):", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to process raw coastal warnings.", details: errorMessage });
  }
}