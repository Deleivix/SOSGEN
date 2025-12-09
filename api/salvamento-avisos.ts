
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
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

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
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page, status: ${response.status}`);
    }

    const html = await response.text();
    const avisos: SalvamentoAviso[] = [];

    // STRATEGY: Find all TR blocks, then check if they have enough TDs.
    // This avoids relying on specific class names like 'rgRow' which might change.
    const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    
    let rowMatch;
    while ((rowMatch = trRegex.exec(html)) !== null) {
        const rowContent = rowMatch[1];

        // Extract Cells <td>...</td>
        const tdRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
        const cells: string[] = [];
        let cellMatch;
        while ((cellMatch = tdRegex.exec(rowContent)) !== null) {
            cells.push(cellMatch[1]);
        }

        // We expect at least 8 data columns for a valid notice row.
        // If less, it's likely a header, footer, or layout row.
        if (cells.length < 8) continue;

        // Extract eventTarget for PDF.
        // Pattern: __doPostBack('TARGET', ...)
        // Captures content inside first set of quotes (single, double, or html entity)
        const postBackMatch = rowContent.match(/__doPostBack\s*\(\s*(?:'|"|&#39;)([^'",]+)(?:'|"|&#39;)/i);
        const eventTarget = postBackMatch ? postBackMatch[1] : '';

        // Helper to clean HTML tags and entities
        const clean = (raw: string) => {
            return raw
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, '') // Strip tags
                .replace(/&nbsp;/gi, ' ')
                .replace(/&amp;/gi, '&')
                .replace(/&quot;/gi, '"')
                .replace(/\s+/g, ' ') // Collapse whitespace
                .trim();
        };

        const num = clean(cells[1] || '');
        const asunto = clean(cells[3] || '');

        // Validation: Ensure it looks like a real radioaviso (e.g., contains "NR-")
        if (num && asunto && num.toUpperCase().includes('NR-')) {
            avisos.push({
                num,
                emision: clean(cells[2] || ''),
                asunto,
                zona: clean(cells[4] || ''),
                tipo: clean(cells[5] || ''),
                subtipo: clean(cells[6] || ''),
                prioridad: clean(cells[7] || ''),
                caducidad: clean(cells[8] || ''),
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
    cache.data = null;
    cache.timestamp = 0;
    return res.status(500).json({ 
        error: 'Failed to process data from Salvamento Marítimo page', 
        details: errorMessage
    });
  }
}
