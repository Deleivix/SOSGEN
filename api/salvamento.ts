
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pdf from 'pdf-parse';
import { Buffer } from 'buffer';

type SalvamentoAviso = {
  num: string;
  emision: string;
  asunto: string;
  zona: string;
  tipo: string;
  subtipo: string;
  prioridad: string;
  caducidad: string;
  eventTarget: string;
};

// In-memory cache for the list
let cache = {
  data: null as SalvamentoAviso[] | null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 5 * 60 * 1000;
const TARGET_URL = 'https://radioavisos.salvamentomaritimo.es/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        return handleGetList(req, res);
    } else if (req.method === 'POST') {
        return handleGetPdf(req, res);
    } else {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
}

async function handleGetList(_req: VercelRequest, res: VercelResponse) {
    const now = Date.now();
    if (cache.data && (now - cache.timestamp < CACHE_DURATION_MS)) {
        return res.status(200).json(cache.data);
    }

    try {
        const response = await fetch(TARGET_URL, {
            headers: { 'User-Agent': USER_AGENT, 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`Failed to fetch page, status: ${response.status}`);

        const html = await response.text();
        const avisos: SalvamentoAviso[] = [];
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
                    num, emision: clean(cells[2] || ''), asunto,
                    zona: clean(cells[4] || ''), tipo: clean(cells[5] || ''),
                    subtipo: clean(cells[6] || ''), prioridad: clean(cells[7] || ''),
                    caducidad: clean(cells[8] || ''), eventTarget,
                });
            }
        }

        cache.data = avisos;
        cache.timestamp = now;
        return res.status(200).json(avisos);

    } catch (error) {
        return res.status(500).json({ error: 'Failed to scrape list', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}

async function handleGetPdf(req: VercelRequest, res: VercelResponse) {
    const { eventTarget, nrTitle } = req.body;
    if (!eventTarget && !nrTitle) return res.status(400).json({ error: 'Missing parameters' });

    try {
        const initialResponse = await fetch(TARGET_URL, {
            headers: { 'User-Agent': USER_AGENT, 'Connection': 'keep-alive' }
        });

        let cookies = '';
        if (typeof initialResponse.headers.getSetCookie === 'function') {
            cookies = initialResponse.headers.getSetCookie().join('; ');
        } else {
            const rawCookie = initialResponse.headers.get('set-cookie');
            if (rawCookie) cookies = rawCookie.split(',').map(c => c.split(';')[0]).join('; ');
        }

        const html = await initialResponse.text();
        const getInputValue = (name: string) => {
            const match = html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`));
            return match ? match[1] : undefined;
        };

        const viewState = getInputValue('__VIEWSTATE');
        const eventValidation = getInputValue('__EVENTVALIDATION');
        const viewStateGenerator = getInputValue('__VIEWSTATEGENERATOR');

        if (!viewState) throw new Error('Could not parse ViewState');

        let finalEventTarget = eventTarget;
        if (nrTitle) {
            // Re-validate eventTarget if nrTitle provided (in case list order changed)
            const rows = html.split('<tr');
            const matchingRow = rows.find(r => r.includes(nrTitle));
            if (matchingRow) {
                const match = matchingRow.match(/__doPostBack\s*\(\s*(?:'|"|&#39;)([^'",]+)(?:'|"|&#39;)/i);
                if (match) finalEventTarget = match[1];
            }
        }

        const formData = new URLSearchParams();
        formData.append('__EVENTTARGET', finalEventTarget);
        formData.append('__EVENTARGUMENT', '');
        formData.append('__VIEWSTATE', viewState);
        if (viewStateGenerator) formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
        if (eventValidation) formData.append('__EVENTVALIDATION', eventValidation);

        const pdfResponse = await fetch(TARGET_URL, {
            method: 'POST',
            headers: {
                'User-Agent': USER_AGENT,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies,
                'Origin': 'https://radioavisos.salvamentomaritimo.es',
                'Referer': TARGET_URL,
            },
            body: formData,
            redirect: 'manual'
        });

        if (pdfResponse.status === 302 || pdfResponse.status === 301) {
            const location = pdfResponse.headers.get('location');
            if (!location || location.includes('default.aspx')) throw new Error('Redirect rejected');
            const nextUrl = new URL(location, TARGET_URL).toString();
            const fileResponse = await fetch(nextUrl, { headers: { 'User-Agent': USER_AGENT, 'Cookie': cookies } });
            return processPdf(fileResponse, res);
        }

        if (!pdfResponse.ok) throw new Error('Download failed');
        return processPdf(pdfResponse, res);

    } catch (error) {
        return res.status(500).json({ error: 'Failed to retrieve PDF', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}

async function processPdf(response: Response, res: VercelResponse) {
    const buffer = Buffer.from(await response.arrayBuffer());
    try {
        const data = await pdf(buffer);
        let text = data.text;
        
        // Clean up common artifacts
        text = text.replace(/^\s*Código\s*/i, '');
        const footerIndex = text.indexOf("Aviso: La información contenida");
        if (footerIndex !== -1) text = text.substring(0, footerIndex);
        
        text = text.replace(/\r\n/g, '\n')
                   .replace(/Fecha\s*\n\s*Emisi[óo]n:/gi, 'Fecha Emisión:')
                   .replace(/Fecha\s*\n\s*Caducidad:/gi, 'Fecha Caducidad:')
                   .replace(/[ \t]+/g, ' ')
                   .replace(/\n\s*\n\s*\n/g, '\n\n')
                   .trim();

        return res.status(200).json({ text });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to parse PDF' });
    }
}
