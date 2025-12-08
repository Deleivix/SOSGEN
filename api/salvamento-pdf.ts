
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
        console.log(`PDF POST returned redirect to: ${location}`);
        
        if (!location) {
             throw new Error('Redirect response missing Location header');
        }

        const nextUrl = new URL(location, targetUrl).toString();

        // If it redirects back to the main page (or similar), it's a session rejection
        if (nextUrl === targetUrl || location === '/' || location.toLowerCase().includes('default.aspx')) {
            throw new Error('Server rejected the download request (Session Expired/Invalid).');
        }
        
        // Follow the redirect to whatever URL (e.g. /Informes/Report2b.aspx)
        const fileResponse = await fetch(nextUrl, {
             headers: { 
                 'User-Agent': userAgent, 
                 'Cookie': cookies,
                 'Referer': targetUrl
             }
        });
        
        return processPdfResponse(fileResponse, res);
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
         throw new Error(`Server returned HTML (${title}) at ${response.url}. The system cannot parse this as PDF.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
        const data = await pdf(buffer);
        let text = data.text;

        // --- 1. REMOVE FOOTER (LEGAL DISCLAIMER) ---
        // We find the start of the disclaimer and cut everything after it.
        const footerMarker = "Aviso: La información contenida en este sitio web es solo para fines informativos";
        const footerIndex = text.indexOf(footerMarker);
        if (footerIndex !== -1) {
            text = text.substring(0, footerIndex);
        }

        // --- 2. NORMALIZE WHITESPACE ---
        text = text.replace(/\r\n/g, '\n');

        // --- 3. FIX BROKEN HEADERS ---
        // PDF parsing often splits "Fecha Emisión" into "Fecha \n Emisión"
        text = text.replace(/Fecha\s*\n\s*Emisi[óo]n:/gi, 'Fecha Emisión:');
        text = text.replace(/Fecha\s*\n\s*Caducidad:/gi, 'Fecha Caducidad:');

        // --- 4. JOIN VALUES TO HEADERS ---
        // If the value is on the next line (e.g., "Radioaviso:\nNR-XXX"), bring it up.
        // Applied to short metadata fields.
        const metaHeaders = ['Radioaviso:', 'Fecha Emisión:', 'Fecha Caducidad:'];
        metaHeaders.forEach(h => {
             // Regex: Header followed by newline and potential whitespace
             const regex = new RegExp(`(${h})\\s*\\n\\s*`, 'gi');
             text = text.replace(regex, '$1 ');
        });

        // --- 5. SECTION SPACING & FORMATTING ---
        
        // Ensure Metadata headers start on a new line if they aren't already
        metaHeaders.forEach(h => {
             const regex = new RegExp(`(?<!^)\\s*(${h})`, 'gi');
             text = text.replace(regex, '\n$1');
        });

        // Ensure "Texto Español" and "English Text" have double newlines above them for clarity
        // and a single newline below to start the body text.
        const sectionHeaders = ['Texto Español:', 'English Text:'];
        sectionHeaders.forEach(h => {
            const regex = new RegExp(`\\s*(${h})`, 'gi');
            text = text.replace(regex, '\n\n$1\n');
        });

        // --- 6. FINAL CLEANUP ---
        // Collapse multiple spaces into one
        text = text.replace(/[ \t]+/g, ' '); 
        // Collapse excessive newlines (more than 2) into 2
        text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); 
        
        const cleanText = text.trim();
            
        return res.status(200).json({ text: cleanText });
    } catch (parseError) {
        console.error('PDF Parse Error:', parseError);
        return res.status(500).json({ error: 'Failed to parse PDF content.' });
    }
}
