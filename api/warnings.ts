
// This file implements the backend API for the dashboard's warnings card.
// It now directly fetches and parses AEMET coastal bulletins to extract
// the official warnings, removing the dependency on the AI model which was causing errors.
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Cache<T> {
  data: T | null;
  timestamp: number;
}
const warningsCache: Cache<any> = {
  data: null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const AEMET_URLS = {
    GALICIA: 'https://www.aemet.es/xml/maritima/FQXX40MM.xml',
    CANTABRICO: 'https://www.aemet.es/xml/maritima/FQXX41MM.xml',
};

/**
 * Extracts the warning text from the AEMET coastal bulletin XML.
 * @param xmlText The raw XML content of the bulletin.
 * @returns The warning text, or null if not found or irrelevant.
 */
function parseWarningFromXml(xmlText: string): string | null {
    const avisoMatch = xmlText.match(/<aviso>[\s\S]*?<texto>([\s\S]*?)<\/texto>[\s\S]*?<\/aviso>/i);
    if (avisoMatch && avisoMatch[1]) {
        const text = avisoMatch[1].trim();
        // Check if the warning is just a "no warning" message.
        if (text.toUpperCase().includes("NO HAY AVISO")) {
            return null;
        }
        return text;
    }
    return null;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
    const now = Date.now();
    if (warningsCache.data && (now - warningsCache.timestamp < CACHE_DURATION_MS)) {
        console.log("Serving warnings from cache.");
        return response.status(200).json(warningsCache.data);
    }
    console.log("Fetching fresh warnings from AEMET.");

    try {
        const [galiciaRes, cantabricoRes] = await Promise.all([
            fetch(AEMET_URLS.GALICIA, { cache: 'no-store' }),
            fetch(AEMET_URLS.CANTABRICO, { cache: 'no-store' })
        ]);

        if (!galiciaRes.ok || !cantabricoRes.ok) {
            throw new Error('Failed to fetch one or more AEMET bulletins.');
        }

        const [galiciaBuffer, cantabricoBuffer] = await Promise.all([
            galiciaRes.arrayBuffer(),
            cantabricoRes.arrayBuffer()
        ]);

        const decoder = new TextDecoder('iso-8859-1');
        const galiciaXml = decoder.decode(galiciaBuffer);
        const cantabricoXml = decoder.decode(cantabricoBuffer);

        const galiciaWarning = parseWarningFromXml(galiciaXml);
        const cantabricoWarning = parseWarningFromXml(cantabricoXml);

        const activeWarnings = [];
        if (galiciaWarning) {
            activeWarnings.push(`GALICIA: ${galiciaWarning}`);
        }
        if (cantabricoWarning) {
            activeWarnings.push(`CANTÁBRICO: ${cantabricoWarning}`);
        }
        
        const summary = activeWarnings.join('\n');
        const resultData = { summary };
        
        warningsCache.data = resultData;
        warningsCache.timestamp = now;

        return response.status(200).json(resultData);

    } catch (error) {
        console.error("Error in /api/warnings:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return response.status(500).json({ error: "Failed to fetch warnings.", details: errorMessage });
    }
}
