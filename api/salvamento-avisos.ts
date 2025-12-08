
import type { VercelRequest, VercelResponse } from '@vercel/node';

// The data type that reflects the columns of the table
type SalvamentoAviso = {
  num: string;
  emision: string;
  asunto: string;
  zona: string;
  tipo: string;
  subtipo: string;
  prioridad: string;
  caducidad: string;
  eventTarget: string; // The ID required for the PDF postback
};

// Simple in-memory cache
let cache = {
  data: null as SalvamentoAviso[] | null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 5 * 60 * 1000; // Reduced cache to 5 mins to help debugging updates

/**
 * Main handler function that performs web scraping on the official Salvamento Marítimo page.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const now = Date.now();
  if (cache.data && (now - cache.timestamp < CACHE_DURATION_MS)) {
    return res.status(200).json(cache.data);
  }

  const targetUrl = 'https://radioavisos.salvamentomaritimo.es/';
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page, status: ${response.status}`);
    }

    const html = await response.text();
    const avisos: SalvamentoAviso[] = [];

    // ROBUST PARSING STRATEGY: SPLIT instead of complex Regex
    // 1. Split by table rows
    const rowFragments = html.split(/<tr/i);

    for (const frag of rowFragments) {
        // Only process rows that look like data rows (ASP.NET GridView styles)
        // Check loosely for class attributes containing "Row"
        if (!frag.includes('rgRow') && !frag.includes('rgAltRow')) {
            continue;
        }

        // 2. Reconstruct row tag for context (optional, but helps mental model)
        const rowContent = '<tr' + frag;

        // 3. Extract eventTarget for PDF
        // Pattern is usually: href="javascript:__doPostBack('TARGET','')"
        // We look for __doPostBack, followed by parenthesis and quotes.
        let eventTarget = '';
        // Match __doPostBack(' OR __doPostBack(" OR __doPostBack(&#39;
        const postBackRegex = /__doPostBack\s*\(\s*(?:'|"|&#39;)([^'",)]+)(?:'|"|&#39;)/i;
        const postBackMatch = rowContent.match(postBackRegex);
        
        if (postBackMatch && postBackMatch[1]) {
            eventTarget = postBackMatch[1];
        }

        // 4. Split by cells (<td>)
        const cellFragments = rowContent.split(/<td/i);
        // The first fragment is before the first <td>, so ignore index 0
        if (cellFragments.length < 9) continue; // Ensure we have enough columns (index 1 to 8+)

        // Helper to clean HTML tags and entities
        const cleanText = (raw: string) => {
            // Cut off at the closing </td>
            const content = raw.split(/<\/td>/i)[0];
            // Remove scripts, styles, and tags
            return content
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, '') // Strip tags
                .replace(/&nbsp;/gi, ' ')
                .replace(/&amp;/gi, '&')
                .replace(/&quot;/gi, '"')
                .replace(/\s+/g, ' ') // Collapse whitespace
                .trim();
        };

        const num = cleanText(cellFragments[1]);
        const emision = cleanText(cellFragments[2]);
        const asunto = cleanText(cellFragments[3]);
        const zona = cleanText(cellFragments[4]);
        const tipo = cleanText(cellFragments[5]);
        const subtipo = cleanText(cellFragments[6]);
        const prioridad = cleanText(cellFragments[7]);
        const caducidad = cleanText(cellFragments[8]);

        // Filter out empty rows or header artifacts
        if (num && asunto) {
            avisos.push({
                num,
                emision,
                asunto,
                zona,
                tipo,
                subtipo,
                prioridad,
                caducidad,
                eventTarget,
            });
        }
    }

    if (avisos.length === 0) {
      console.warn("Parser found 0 notices. HTML structure might have changed significantly.");
    }

    cache.data = avisos;
    cache.timestamp = now;
    return res.status(200).json(avisos);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in scraping handler:", errorMessage);
    // Clear cache on error
    cache.data = null;
    cache.timestamp = 0;
    return res.status(500).json({ 
        error: 'Failed to process data from Salvamento Marítimo page', 
        details: errorMessage
    });
  }
}
