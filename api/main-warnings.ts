import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- Constants ---
const AEMET_WARNINGS_URL = 'https://www.aemet.es/xml/maritima/WONT40MM.xml';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // FIX: Removed the 'next' property from the fetch options as it's Next.js specific and not valid in this context.
    const warningsResponse = await fetch(AEMET_WARNINGS_URL);

    if (!warningsResponse.ok) {
        throw new Error(`Failed to fetch main warnings from AEMET. Status: ${warningsResponse.status}`);
    }

    const warningsXmlText = await warningsResponse.text();
    
    // Return raw XML directly
    response.setHeader('Content-Type', 'application/json');
    return response.status(200).json({ rawXml: warningsXmlText });

  } catch (error) {
    console.error("Error in /api/main-warnings (raw fetch):", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to fetch raw warnings data.", details: errorMessage });
  }
}