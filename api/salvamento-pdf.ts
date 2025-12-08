
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
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    // 1. GET Request to establish session
    const initialResponse = await fetch(targetUrl, {
        headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });

    if (!initialResponse.ok) throw new Error('Failed to reach Salvamento site');
    
    // --- COOKIE HANDLING (CRITICAL) ---
    // Node fetch might return multiple set-cookie headers. We need to join them with '; '
    // .getSetCookie() is available in Node 18+, fallback to split logic if needed
    let cookies = '';
    if (typeof initialResponse.headers.getSetCookie === 'function') {
        const cookieArray = initialResponse.headers.getSetCookie();
        cookies = cookieArray.join('; ');
    } else {
        // Fallback for older environments
        const rawCookie = initialResponse.headers.get('set-cookie');
        if (rawCookie) {
            // Simple split might break dates in cookies, but usually works for ASP.NET session IDs
            cookies = rawCookie.split(',').map(c => c.split(';')[0]).join('; ');
        }
    }

    const html = await initialResponse.text();
    
    // --- VIEWSTATE PARSING ---
    const getHiddenValue = (htmlContent: string, fieldName: string): string | undefined => {
        const regex = new RegExp(`id="${fieldName}"[^>]*value="([^"]*)"`, 'i');
        const match = htmlContent.match(regex);
        if (match) return match[1];
        
        // Fallback for different attribute ordering
        const regex2 = new RegExp(`name="${fieldName}"[^>]*value="([^"]*)"`, 'i');
        const match2 = htmlContent.match(regex2);
        return match2 ? match2[1] : undefined;
    };

    const viewState = getHiddenValue(html, '__VIEWSTATE');
    const viewStateGenerator = getHiddenValue(html, '__VIEWSTATEGENERATOR');
    const eventValidation = getHiddenValue(html, '__EVENTVALIDATION');

    if (!viewState) {
        throw new Error('Could not parse ASP.NET ViewState (Critical)');
    }

    // --- TARGET REFRESH ---
    let finalEventTarget = eventTarget;
    if (nrTitle) {
        // Try to find the exact row again to ensure the eventTarget corresponds to the correct NR
        // The table might have shifted if new NRs were added
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

    // 2. POST Request (Download)
    const formData = new URLSearchParams();
    formData.append('__EVENTTARGET', finalEventTarget);
    formData.append('__EVENTARGUMENT', '');
    formData.append('__VIEWSTATE', viewState);
    if (viewStateGenerator) formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
    if (eventValidation) formData.append('__EVENTVALIDATION', eventValidation);

    // Using 'manual' redirect to inspect 302s if they occur
    const pdfResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'User-Agent': userAgent,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookies, // Using the robustly parsed cookies
            'Origin': 'https://radioavisos.salvamentomaritimo.es',
            'Referer': 'https://radioavisos.salvamentomaritimo.es/',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1'
        },
        body: formData,
        redirect: 'manual' 
    });

    // --- RESPONSE HANDLING ---
    
    // Check for 302 Redirect (Often an error in ASP.NET PostBacks unless it redirects to the file)
    if (pdfResponse.status === 302 || pdfResponse.status === 301) {
        const location = pdfResponse.headers.get('location');
        console.error(`PDF POST returned redirect to: ${location}`);
        
        // If it redirects back to the main page (or similar), it's a session rejection
        if (!location || location === targetUrl || location === '/' || location.includes('Default.aspx')) {
            throw new Error('Server rejected the download request (Session Expired/Invalid).');
        }
        
        // If it redirects to a PDF file, follows it
        if (location.endsWith('.pdf')) {
             const fileResponse = await fetch(new URL(location, targetUrl).toString(), {
                 headers: { 'User-Agent': userAgent, 'Cookie': cookies }
             });
             return processPdfResponse(fileResponse, res);
        }
        
        throw new Error(`Unexpected redirect to ${location}`);
    }

    if (!pdfResponse.ok) {
        throw new Error(`PDF Download failed with status: ${pdfResponse.status}`);
    }

    return processPdfResponse(pdfResponse, res);

  } catch (error) {
    console.error('Scraping Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to retrieve PDF', details: msg });
  }
}

async function processPdfResponse(response: Response, res: VercelResponse) {
    const contentType = response.headers.get('content-type') || '';
    
    if (!contentType.includes('pdf') && !contentType.includes('application/octet-stream')) {
         const errorHtml = await response.text();
         const titleMatch = errorHtml.match(/<title>(.*?)<\/title>/i);
         const title = titleMatch ? titleMatch[1] : 'Unknown Page';
         console.error('Non-PDF response content-type:', contentType);
         throw new Error(`Server returned HTML (${title}) instead of PDF. Possibly an error page.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
        const data = await pdf(buffer);
        // Normalize text
        const cleanText = data.text
            .replace(/\r\n/g, '\n')
            .replace(/\n\s*\n/g, '\n')
            .trim();
            
        return res.status(200).json({ text: cleanText });
    } catch (parseError) {
        console.error('PDF Parse Error:', parseError);
        return res.status(500).json({ error: 'Failed to parse PDF content.' });
    }
}
