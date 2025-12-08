
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
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page, status: ${response.status}`);
    }

    const html = await response.text();
    const avisos: SalvamentoAviso[] = [];

    // Regex to find all table rows with the specific classes for data.
    // Adjusted to be more lenient with attributes
    const rowRegex = /<tr[^>]*class="rg(?:Alt)?Row"[^>]*>([\s\S]*?)<\/tr>/gi;
    const allRowMatches = html.matchAll(rowRegex);

    for (const rowMatch of allRowMatches) {
        const rowHtml = rowMatch[1];
        
        // Regex to extract all cell (<td>) content from the row.
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const cellsHtml = [...rowHtml.matchAll(cellRegex)].map(m => m[1].trim());

        // Extract eventTarget for PDF. It's usually a LinkButton with a __doPostBack call.
        // We look for the pattern __doPostBack('TARGET', '')
        // We handle both single and double quotes and possible spacing.
        const postBackMatch = rowHtml.match(/__doPostBack\s*\(\s*['"]([^'"]+)['"]/);
        const eventTarget = postBackMatch ? postBackMatch[1] : '';

        // Clean up the other cells by removing any HTML tags and decoding common entities.
        const cleanCells = cellsHtml.slice(0, -1).map(cell =>
            cell.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
        );
        
        // Ensure the row has the expected number of columns for data.
        // Usually there are 9 visible columns + hidden ones potentially.
        // Index 1 is usually the Number.
        if (cleanCells.length >= 8) {
            avisos.push({
                num: cleanCells[1] || '',
                emision: cleanCells[2] || '',
                asunto: cleanCells[3] || '',
                zona: cleanCells[4] || '',
                tipo: cleanCells[5] || '',
                subtipo: cleanCells[6] || '',
                prioridad: cleanCells[7] || '',
                caducidad: cleanCells[8] || '', // Sometimes index might vary slightly if table changes
                eventTarget: eventTarget,
            });
        }
    }

    if (avisos.length === 0) {
      console.warn("Could not parse any notices from the HTML table. The page structure might have changed or there are no notices currently listed.");
    }

    cache.data = avisos;
    cache.timestamp = now;
    return res.status(200).json(avisos);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error({
        message: "Error in /api/salvamento-avisos (scraping)",
        details: errorMessage,
        targetUrl: targetUrl
    });
    // Clear cache on error to force a refetch next time.
    cache.data = null;
    cache.timestamp = 0;
    return res.status(500).json({ 
        error: 'Failed to scrape or process data from Salvamento Marítimo page', 
        details: errorMessage
    });
  }
}
