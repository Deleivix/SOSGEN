import type { VercelRequest, VercelResponse } from '@vercel/node';

const AEMET_URLS: { [key: string]: string } = {
    'FQNT42MM': 'https://www.aemet.es/xml/maritima/FQNT42MM.xml', // Atlántico Alta Mar
    'WONT40MM': 'https://www.aemet.es/xml/maritima/WONT40MM.xml', // Avisos Alta Mar
    'FQXX40MM': 'https://www.aemet.es/xml/maritima/FQXX40MM.xml', // Costero Galicia
    'FQXX41MM': 'https://www.aemet.es/xml/maritima/FQXX41MM.xml', // Costero Cantábrico
};

// Cache to avoid hitting AEMET too frequently
const cache = new Map<string, { timestamp: number, data: string }>();
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { id } = request.query;

    if (!id || typeof id !== 'string' || !AEMET_URLS[id]) {
        return response.status(400).json({ error: 'ID de boletín no válido o no especificado.' });
    }

    const url = AEMET_URLS[id];
    const now = Date.now();

    // Check cache
    const cachedEntry = cache.get(url);
    if (cachedEntry && (now - cachedEntry.timestamp < CACHE_DURATION_MS)) {
        return response.status(200).json({ xml: cachedEntry.data });
    }

    try {
        const aemetResponse = await fetch(url, { cache: 'no-store' });

        if (!aemetResponse.ok) {
            throw new Error(`AEMET devolvió el estado: ${aemetResponse.status}`);
        }

        // AEMET XMLs are encoded in ISO-8859-1, not UTF-8.
        // We must fetch the raw buffer and decode it correctly to fix special characters.
        const buffer = await aemetResponse.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        const xmlText = decoder.decode(buffer);

        // Update cache
        cache.set(url, { timestamp: now, data: xmlText });

        return response.status(200).json({ xml: xmlText });

    } catch (error) {
        console.error(`Error fetching bulletin ${id}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al obtener el boletín.";
        return response.status(500).json({ error: "No se pudo obtener el boletín de AEMET.", details: errorMessage });
    }
}
