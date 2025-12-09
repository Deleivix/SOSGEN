
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pdf from 'pdf-parse';
import { Buffer } from 'buffer';

// Cache for the list of warnings
let cache = {
  data: null as any[] | null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache for list

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const targetUrl = 'https://radioavisos.salvamentomaritimo.es/';
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // --- HANDLER FOR LIST (GET) ---
  if (req.method === 'GET') {
      const now = Date.now();
      if (cache.data && (now - cache.timestamp < CACHE_DURATION_MS)) {
        return res.status(200).json(cache.data);
      }

      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Cache-Control': 'no-cache'
          },
          cache: 'no-store',
        });

        if (!response.ok) throw new Error(`Failed to fetch page, status: ${response.status}`);

        const html = await response.text();
        const avisos: any[] = [];
        const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
        
        let rowMatch;
        while ((rowMatch = trRegex.exec(html)) !== null) {
            const rowContent = rowMatch[1];
            const tdRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
            const cells: string[] = [];
            let cellMatch;
            while ((cellMatch = tdRegex.exec(rowContent)) !== null) {
                cells.push(cellMatch[1]);
            }

            if (cells.length < 8) continue;

            const postBackMatch = rowContent.match(/__doPostBack\s*\(\s*(?:'|"|&#39;)([^'",]+)(?:'|"|&#39;)/i);
            const eventTarget = postBackMatch ? postBackMatch[1] : '';

            const clean = (raw: string) => raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();

            const num = clean(cells[1] || '');
            const asunto = clean(cells[3] || '');

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

        cache.data = avisos;
        cache.timestamp = now;
        return res.status(200).json(avisos);

      } catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido";
        return res.status(500).json({ error: 'Failed to scrape list', details: msg });
      }
  }

  // --- HANDLER FOR PDF (POST) ---
  if (req.method === 'POST') {
      const { eventTarget, nrTitle } = req.body;
      if (!eventTarget && !nrTitle) return res.status(400).json({ error: 'nrTitle or eventTarget is required' });

      try {
        // 1. Initial Request for Cookies & ViewState
        const initialResponse = await fetch(targetUrl, {
            headers: { 'User-Agent': userAgent }
        });
        if (!initialResponse.ok) throw new Error('Failed to reach Salvamento site');
        
        let cookies = '';
        if (typeof initialResponse.headers.getSetCookie === 'function') {
            cookies = initialResponse.headers.getSetCookie().join('; ');
        } else {
            const raw = initialResponse.headers.get('set-cookie');
            if (raw) cookies = raw.split(',').map(c => c.split(';')[0]).join('; ');
        }

        const html = await initialResponse.text();
        const getVal = (name: string) => {
            const match = html.match(new RegExp(`id="${name}"[^>]*value="([^"]*)"`)) || html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`));
            return match ? match[1] : null;
        };

        const viewState = getVal('__VIEWSTATE');
        const viewStateGen = getVal('__VIEWSTATEGENERATOR');
        const eventValidation = getVal('__EVENTVALIDATION');

        if (!viewState) throw new Error('Could not parse ViewState');

        // Refresh Target if possible
        let finalTarget = eventTarget;
        if (nrTitle) {
            const rowMatch = html.split('<tr').find(r => r.includes(nrTitle));
            if (rowMatch) {
                const pb = rowMatch.match(/__doPostBack\s*\(\s*(?:'|"|&#39;)([^'",]+)(?:'|"|&#39;)/i);
                if (pb) finalTarget = pb[1];
            }
        }

        const formData = new URLSearchParams();
        formData.append('__EVENTTARGET', finalTarget);
        formData.append('__EVENTARGUMENT', '');
        formData.append('__VIEWSTATE', viewState);
        if (viewStateGen) formData.append('__VIEWSTATEGENERATOR', viewStateGen);
        if (eventValidation) formData.append('__EVENTVALIDATION', eventValidation);

        const pdfResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies,
                'Origin': 'https://radioavisos.salvamentomaritimo.es',
                'Referer': 'https://radioavisos.salvamentomaritimo.es/'
            },
            body: formData,
            redirect: 'manual'
        });

        // Handle Redirects (ASP.NET often redirects to the file)
        let finalResponse = pdfResponse;
        if (pdfResponse.status === 302 || pdfResponse.status === 301) {
            const loc = pdfResponse.headers.get('location');
            if (!loc) throw new Error('Redirect without location');
            const nextUrl = new URL(loc, targetUrl).toString();
            if (nextUrl === targetUrl) throw new Error('Session rejected');
            finalResponse = await fetch(nextUrl, {
                headers: { 'User-Agent': userAgent, 'Cookie': cookies }
            });
        }

        const arrayBuffer = await finalResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        try {
            const pdfData = await pdf(buffer);
            let text = pdfData.text;
            // Cleanup
            text = text.replace(/^\s*Código\s*/i, '');
            const footerIndex = text.indexOf("Aviso: La información contenida");
            if (footerIndex !== -1) text = text.substring(0, footerIndex);
            text = text.replace(/\r\n/g, '\n');
            const metaHeaders = ['Radioaviso:', 'Fecha Emisión:', 'Fecha Caducidad:'];
            metaHeaders.forEach(h => {
                 text = text.replace(new RegExp(`(${h})\\s*\\n\\s*`, 'gi'), '$1 ');
                 text = text.replace(new RegExp(`(?<!^)\\s*(${h})`, 'gi'), '\n$1');
            });
            ['Texto Español:', 'English Text:'].forEach(h => {
                text = text.replace(new RegExp(`\\s*(${h})`, 'gi'), '\n\n$1\n');
            });
            text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
            
            return res.status(200).json({ text });
        } catch (parseError) {
            return res.status(500).json({ error: 'Failed to parse PDF content.' });
        }

      } catch (error) {
          const msg = error instanceof Error ? error.message : "Error desconocido";
          return res.status(500).json({ error: 'Failed to retrieve PDF', details: msg });
      }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
