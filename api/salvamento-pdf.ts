
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pdf from 'pdf-parse';
import { Buffer } from 'buffer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { eventTarget, nrTitle } = req.body;

  if (!eventTarget && !nrTitle) {
    return res.status(400).json({ error: 'nrTitle or eventTarget is required' });
  }

  const targetUrl = 'https://radioavisos.salvamentomaritimo.es/';

  try {
    const initialResponse = await fetch(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Cache-Control': 'no-cache'
        }
    });

    if (!initialResponse.ok) throw new Error('Failed to reach Salvamento site');
    
    const html = await initialResponse.text();
    
    // Robust Extraction Strategy: Find all input tags, then inspect them
    const inputTags = html.match(/<input[^>]*>/gi) || [];
    
    let viewState: string | undefined;
    let eventValidation: string | undefined;
    let viewStateGenerator: string | undefined;

    for (const tag of inputTags) {
        // Check for ViewState
        if (!viewState && (tag.includes('id="__VIEWSTATE"') || tag.includes('name="__VIEWSTATE"'))) {
            const match = tag.match(/value\s*=\s*(["'])([\s\S]*?)\1/i);
            if (match) viewState = match[2];
        }
        // Check for EventValidation
        if (!eventValidation && (tag.includes('id="__EVENTVALIDATION"') || tag.includes('name="__EVENTVALIDATION"'))) {
            const match = tag.match(/value\s*=\s*(["'])([\s\S]*?)\1/i);
            if (match) eventValidation = match[2];
        }
        // Check for ViewStateGenerator
        if (!viewStateGenerator && (tag.includes('id="__VIEWSTATEGENERATOR"') || tag.includes('name="__VIEWSTATEGENERATOR"'))) {
            const match = tag.match(/value\s*=\s*(["'])([\s\S]*?)\1/i);
            if (match) viewStateGenerator = match[2];
        }
    }

    // CRITICAL FIX: Only ViewState is strictly mandatory. EventValidation is optional.
    if (!viewState) {
        console.error(`Parse Failed. VS found: ${!!viewState}, EV found: ${!!eventValidation}`);
        console.error(`HTML Head: ${html.substring(0, 500)}`);
        throw new Error('Could not parse ASP.NET ViewStates (VS missing).');
    }

    let finalEventTarget = eventTarget;

    // Fresh eventTarget search
    if (nrTitle) {
        const rows = html.split('<tr');
        const matchingRow = rows.find(r => r.includes(nrTitle));
        
        if (matchingRow) {
            const postBackMatch = matchingRow.match(/__doPostBack\s*\(\s*(?:'|"|&#39;)([^'",]+)(?:'|"|&#39;)/i);
            if (postBackMatch && postBackMatch[1]) {
                finalEventTarget = postBackMatch[1];
            }
        }
    }

    if (!finalEventTarget) {
        throw new Error("Could not determine download target for this notice.");
    }

    const formData = new URLSearchParams();
    formData.append('__EVENTTARGET', finalEventTarget);
    formData.append('__EVENTARGUMENT', '');
    formData.append('__VIEWSTATE', viewState);
    
    if (viewStateGenerator) {
        formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
    }
    
    // Only append EventValidation if we found it
    if (eventValidation) {
        formData.append('__EVENTVALIDATION', eventValidation);
    }

    const pdfResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': initialResponse.headers.get('set-cookie') || '',
            'Origin': 'https://radioavisos.salvamentomaritimo.es',
            'Referer': 'https://radioavisos.salvamentomaritimo.es/'
        },
        body: formData,
        redirect: 'manual' 
    });

    if (!pdfResponse.ok) {
        throw new Error(`PDF Download failed with status: ${pdfResponse.status}`);
    }

    const contentType = pdfResponse.headers.get('content-type') || '';
    if (!contentType.includes('pdf') && !contentType.includes('application/octet-stream')) {
         const errorHtml = await pdfResponse.text();
         const titleMatch = errorHtml.match(/<title>(.*?)<\/title>/i);
         const title = titleMatch ? titleMatch[1] : 'Unknown Error Page';
         console.error('Non-PDF response title:', title);
         throw new Error(`Server returned HTML (${title}) instead of PDF.`);
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
        const data = await pdf(buffer);
        const cleanText = data.text.replace(/\n\s*\n/g, '\n').trim();
        return res.status(200).json({ text: cleanText });
    } catch (parseError) {
        console.error('PDF Parse Error:', parseError);
        return res.status(500).json({ error: 'Failed to parse PDF content.' });
    }

  } catch (error) {
    console.error('Scraping Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to retrieve PDF', details: msg });
  }
}
