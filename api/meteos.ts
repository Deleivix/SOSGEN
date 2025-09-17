import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- Constants ---
const AEMET_MAIN_BULLETIN_URL = 'https://www.aemet.es/xml/maritima/FQNT42MM.xml';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // FIX: Removed the 'next' property from the fetch options as it's Next.js specific and not valid in this context.
    const mainResponse = await fetch(AEMET_MAIN_BULLETIN_URL);

    if (!mainResponse.ok) {
        throw new Error(`Failed to fetch main bulletin from AEMET. Status: ${mainResponse.status}`);
    }

    const mainXmlText = await mainResponse.text();
    
    // Return raw XML directly
    response.setHeader('Content-Type', 'application/json');
    return response.status(200).json({ rawXml: mainXmlText });

  } catch (error) {
    console.error("Error in /api/meteos (raw fetch):", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to fetch raw weather data.", details: errorMessage });
  }
}