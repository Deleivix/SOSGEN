import type { VercelRequest, VercelResponse } from '@vercel/node';

// El nuevo tipo de dato que refleja las columnas de la tabla
type SalvamentoAviso = {
  num: string;
  emision: string;
  asunto: string;
  zona: string;
  tipo: string;
  subtipo: string;
  prioridad: string;
  caducidad: string;
  pdfLink: string;
};

// Simple in-memory cache
const cache = {
  data: null as SalvamentoAviso[] | null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function cleanHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Parses the HTML table from the Salvamento Maritimo page to extract notices.
 * This version uses `matchAll` for robust iteration over cells.
 * @param htmlText The raw HTML content of the page.
 * @returns An array of SalvamentoAviso objects.
 */
function parseSalvamentoTable(htmlText: string): SalvamentoAviso[] {
    const avisos: SalvamentoAviso[] = [];
    
    const tableBodyRegex = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i;
    const bodyMatch = htmlText.match(tableBodyRegex);
    if (!bodyMatch || !bodyMatch[1]) {
        console.error("Parser Error: Could not find the <tbody> element of the notices table.");
        return [];
    }
    const tableBodyHtml = bodyMatch[1];

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const pdfLinkRegex = /<a href="([^"]+)"/;

    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableBodyHtml)) !== null) {
        const rowContent = rowMatch[1];
        
        // Using matchAll is more robust than a stateful exec loop for nested matches.
        const cellMatches = [...rowContent.matchAll(cellRegex)];
        const cells = cellMatches.map(match => match[1]);

        if (cells.length >= 10 && cells[0].includes('type="checkbox"')) { 
            const pdfLinkMatch = cells[9].match(pdfLinkRegex);
            
            avisos.push({
                num: cleanHtml(cells[1]),
                emision: cleanHtml(cells[2]),
                asunto: cleanHtml(cells[3]),
                zona: cleanHtml(cells[4]),
                tipo: cleanHtml(cells[5]),
                subtipo: cleanHtml(cells[6]),
                prioridad: cleanHtml(cells[7]),
                caducidad: cleanHtml(cells[8]),
                pdfLink: pdfLinkMatch ? `https://radioavisos.salvamentomaritimo.es/${pdfLinkMatch[1]}` : '',
            });
        }
    }
    return avisos;
}


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
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch the page, status: ${response.status}`);
    }

    const htmlText = await response.text();
    const avisos = parseSalvamentoTable(htmlText);

    if (avisos.length === 0) {
        // This warning may still appear if the site has no active notices, which is legitimate.
        console.warn("Could not parse any notices from the HTML table. The page structure might have changed or there are no notices currently listed.");
    }
    
    cache.data = avisos;
    cache.timestamp = now;
    return res.status(200).json(avisos);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({ 
        error: 'Failed to fetch or parse Salvamento Marítimo page', 
        details: errorMessage
    });
  }
}