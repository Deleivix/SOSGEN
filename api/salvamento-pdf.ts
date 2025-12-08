
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pdf from 'pdf-parse';
import { Buffer } from 'buffer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // We prefer nrTitle to find the fresh eventTarget, but accept eventTarget as fallback
  const { eventTarget, nrTitle } = req.body;

  if (!eventTarget && !nrTitle) {
    return res.status(400).json({ error: 'nrTitle or eventTarget is required' });
  }

  const targetUrl = 'https://radioavisos.salvamentomaritimo.es/';

  try {
    // 1. GET Request to establish session, get ViewStates, and find fresh eventTarget if needed
    const initialResponse = await fetch(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Cache-Control': 'no-cache'
        }
    });

    if (!initialResponse.ok) throw new Error('Failed to reach Salvamento site');
    
    const html = await initialResponse.text();
    
    // Robust Manual Parser for ASP.NET Hidden Fields
    // Avoids regex complexities by finding indices directly.
    const getHiddenValue = (htmlContent: string, fieldName: string): string | undefined => {
        // 1. Find the position of the field name (id="FIELD" or name="FIELD")
        let keyIndex = htmlContent.indexOf(`id="${fieldName}"`);
        if (keyIndex === -1) keyIndex = htmlContent.indexOf(`name="${fieldName}"`);
        
        if (keyIndex === -1) return undefined;

        // 2. Find the start of the tag (<input) by looking backwards from the key
        const tagStartIndex = htmlContent.lastIndexOf('<input', keyIndex);
        if (tagStartIndex === -1) return undefined;

        // 3. Find the end of the tag (>) by looking forwards from the key
        // Note: ViewState/EventValidation base64 values do not contain '>', so this is safe.
        const tagEndIndex = htmlContent.indexOf('>', keyIndex);
        if (tagEndIndex === -1) return undefined;

        // 4. Extract the specific tag string
        const tag = htmlContent.substring(tagStartIndex, tagEndIndex + 1);

        // 5. Extract value attribute from this isolated tag
        // Handles value="..." or value='...'
        const valueMatch = tag.match(/value=["']([^"']*)["']/i);
        return valueMatch ? valueMatch[1] : undefined;
    };

    // Extract ASP.NET Hidden Fields
    const viewState = getHiddenValue(html, '__VIEWSTATE');
    const viewStateGenerator = getHiddenValue(html, '__VIEWSTATEGENERATOR');
    const eventValidation = getHiddenValue(html, '__EVENTVALIDATION');

    if (!viewState || !eventValidation) {
        // Debugging Aid
        console.error(`ViewState Parse Failed. HTML Length: ${html.length}`);
        const debugIndex = html.indexOf('__VIEWSTATE');
        if (debugIndex !== -1) {
             console.error(`Context: ${html.substring(debugIndex - 50, debugIndex + 100)}`);
        }
        throw new Error('Could not parse ASP.NET ViewStates. Page structure mismatch.');
    }

    let finalEventTarget = eventTarget;

    // If we have the NR Title, try to find the FRESH eventTarget from the HTML
    // This fixes issues where the table order changes and the frontend eventTarget becomes stale
    if (nrTitle) {
        // Simple approach: Split by <tr to isolate rows, find the one with nrTitle, extract postback
        const rows = html.split('<tr');
        const matchingRow = rows.find(r => r.includes(nrTitle));
        
        if (matchingRow) {
            // Regex to find __doPostBack('TARGET', ...)
            // Handles both single quotes and HTML encoded quotes
            const postBackMatch = matchingRow.match(/__doPostBack\s*\(\s*(?:'|"|&#39;)([^'",]+)(?:'|"|&#39;)/i);
            if (postBackMatch && postBackMatch[1]) {
                finalEventTarget = postBackMatch[1];
                console.log(`Found fresh target for ${nrTitle}: ${finalEventTarget}`);
            } else {
                console.warn(`Found row for ${nrTitle} but no PostBack target found.`);
            }
        } else {
             console.warn(`Could not find row for ${nrTitle} in fresh HTML.`);
        }
    }

    if (!finalEventTarget) {
        throw new Error("Could not determine download target for this notice.");
    }

    // 2. POST Request to trigger the PDF download (PostBack)
    const formData = new URLSearchParams();
    formData.append('__EVENTTARGET', finalEventTarget);
    formData.append('__EVENTARGUMENT', '');
    formData.append('__VIEWSTATE', viewState);
    if (viewStateGenerator) {
        formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
    }
    formData.append('__EVENTVALIDATION', eventValidation);

    const pdfResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            // Crucial: cookies are needed for session continuity
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
         // Sometimes it returns HTML (error page) instead of PDF
         // throw new Error('Server returned HTML instead of PDF. The target might be invalid.');
         // Try to parse error from HTML if possible or just generic error
         const errorHtml = await pdfResponse.text();
         // Check if it's a generic ASP.NET error page
         const titleMatch = errorHtml.match(/<title>(.*?)<\/title>/i);
         const title = titleMatch ? titleMatch[1] : 'Unknown Error Page';
         console.error('Non-PDF response title:', title);
         throw new Error(`Server returned HTML (${title}) instead of PDF. Session might have expired or target is invalid.`);
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Parse PDF to Text
    try {
        const data = await pdf(buffer);
        // Clean up text: remove excessive newlines
        const cleanText = data.text
            .replace(/\n\s*\n/g, '\n') // Remove multiple empty lines
            .trim();

        return res.status(200).json({ text: cleanText });
    } catch (parseError) {
        console.error('PDF Parse Error:', parseError);
        return res.status(500).json({ error: 'Failed to parse PDF content. Is it a valid PDF?' });
    }

  } catch (error) {
    console.error('Scraping Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to retrieve PDF', details: msg });
  }
}
