// This file implements the backend API for the Meteos page.
// It fetches raw weather bulletin text from Spain's meteorological agency (AEMET).
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Cache to avoid hitting AEMET too frequently
const cache = new Map<string, { timestamp: number, data: string }>();
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const AEMET_URLS: { [key: string]: string } = {
    'galicia_coastal': 'https://www.aemet.es/xml/maritima/FQXX40MM.xml',
    'cantabrico_coastal': 'https://www.aemet.es/xml/maritima/FQXX41MM.xml',
    'atlantico_coastal': 'https://www.aemet.es/xml/maritima/FQXX42MM.xml',
    'mediterraneo_sur_coastal': 'https://www.aemet.es/xml/maritima/FQXX43MM.xml',
    'mediterraneo_levante_coastal': 'https://www.aemet.es/xml/maritima/FQXX44MM.xml',
    'mediterraneo_noreste_coastal': 'https://www.aemet.es/xml/maritima/FQXX45MM.xml',
    'canarias_coastal': 'https://www.aemet.es/xml/maritima/FQXX46MM.xml',
    'atlantico_offshore': 'https://www.aemet.es/xml/maritima/FAXX40MM.xml',
    'mediterraneo_offshore': 'https://www.aemet.es/xml/maritima/FAXX41MM.xml',
};

// A helper to extract the raw text content from the AEMET XML
const extractRawTextFromXml = (xml: string): string => {
    // This is a simplified parser. It looks for the <p_boletin> tag and extracts its content.
    const match = xml.match(/<p_boletin>([\s\S]*?)<\/p_boletin>/);
    return match ? match[1].trim() : 'No se pudo extraer el contenido del boletín.';
};


export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { bulletin } = request.query;

    if (!bulletin || typeof bulletin !== 'string' || !AEMET_URLS[bulletin]) {
        return response.status(400).json({ error: 'Boletín no válido o no especificado.' });
    }

    const url = AEMET_URLS[bulletin];
    const now = Date.now();

    // Check cache first
    const cachedEntry = cache.get(url);
    if (cachedEntry && (now - cachedEntry.timestamp < CACHE_DURATION_MS)) {
        console.log(`Serving bulletin ${bulletin} from cache.`);
        return response.status(200).json({ raw: cachedEntry.data });
    }

    try {
        console.log(`Fetching fresh bulletin ${bulletin} from AEMET.`);
        const aemetResponse = await fetch(url, { cache: 'no-store' });

        if (!aemetResponse.ok) {
            throw new Error(`AEMET devolvió el estado: ${aemetResponse.status}`);
        }

        const xmlText = await aemetResponse.text();
        const rawText = extractRawTextFromXml(xmlText);

        // Update cache
        cache.set(url, { timestamp: now, data: rawText });

        return response.status(200).json({ raw: rawText });

    } catch (error) {
        console.error(`Error fetching bulletin ${bulletin}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al obtener el boletín.";
        return response.status(500).json({ error: "No se pudo obtener el boletín de AEMET.", details: errorMessage });
    }
}
