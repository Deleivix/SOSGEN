
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pdf from 'pdf-parse';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { eventTarget } = req.body;

  if (!eventTarget) {
    return res.status(400).json({ error: 'eventTarget is required' });
  }

  const targetUrl = 'https://radioavisos.salvamentomaritimo.es/';

  try {
    // 1. GET Request to establish session and get ViewStates
    const initialResponse = await fetch(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!initialResponse.ok) throw new Error('Failed to reach Salvamento site');
    
    const html = await initialResponse.text();
    
    // Extract ASP.NET Hidden Fields
    const viewState = html.match(/id="__VIEWSTATE" value="([^"]+)"/)?.[1];
    const viewStateGenerator = html.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/)?.[1];
    const eventValidation = html.match(/id="__EVENTVALIDATION" value="([^"]+)"/)?.[1];

    if (!viewState || !viewStateGenerator || !eventValidation) {
        throw new Error('Could not parse ASP.NET ViewStates');
    }

    // 2. POST Request to trigger the PDF download (PostBack)
    const formData = new URLSearchParams();
    formData.append('__EVENTTARGET', eventTarget);
    formData.append('__EVENTARGUMENT', '');
    formData.append('__VIEWSTATE', viewState);
    formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
    formData.append('__EVENTVALIDATION', eventValidation);

    // Add other required form fields that might be present in the form (often empty but required)
    // Based on standard ASP.NET behavior, usually the above are sufficient for a LinkButton postback.

    const pdfResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            // Crucial: cookies might be needed if the site uses session cookies (ASP.NET_SessionId)
            'Cookie': initialResponse.headers.get('set-cookie') || ''
        },
        body: formData
    });

    if (!pdfResponse.ok) {
        throw new Error(`PDF Download failed with status: ${pdfResponse.status}`);
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
        return res.status(500).json({ error: 'Failed to parse PDF content.' });
    }

  } catch (error) {
    console.error('Scraping Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to retrieve PDF', details: msg });
  }
}
