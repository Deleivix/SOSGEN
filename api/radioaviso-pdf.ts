import type { VercelRequest, VercelResponse } from '@vercel/node';
import { URLSearchParams } from 'url';

/**
 * This handler fetches the official PDF for a given radio warning.
 * It works by first scraping the main page to get necessary ASP.NET form state fields
 * (__VIEWSTATE, etc.), and then sending a POST request that mimics the JavaScript
 * `__doPostBack` function call for the specific PDF link.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { target } = req.query;

    if (!target || typeof target !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "target" parameter.' });
    }

    const targetUrl = 'https://radioavisos.salvamentomaritimo.es/';

    try {
        // Step 1: Fetch the main page to get the form state.
        const pageResponse = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            cache: 'no-store',
        });

        if (!pageResponse.ok) {
            throw new Error(`Failed to fetch main page, status: ${pageResponse.status}`);
        }
        const pageHtml = await pageResponse.text();

        // Step 2: Parse the HTML to extract all hidden ASP.NET fields.
        const formData = new URLSearchParams();
        const hiddenInputRegex = /<input type="hidden" name="([^"]+)" id="[^"]+" value="([^"]*)" \/>/g;
        
        let match;
        while ((match = hiddenInputRegex.exec(pageHtml)) !== null) {
            formData.append(match[1], match[2]);
        }

        // Step 3: Set the specific target for the PDF link we want to "click".
        formData.set('__EVENTTARGET', target);
        formData.set('__EVENTARGUMENT', '');

        // Step 4: Make the POST request to trigger the PDF download.
        const pdfResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': targetUrl,
            },
            body: formData.toString()
        });

        if (!pdfResponse.ok || pdfResponse.headers.get('Content-Type') !== 'application/pdf') {
            throw new Error(`Failed to get PDF, status: ${pdfResponse.status}, content-type: ${pdfResponse.headers.get('Content-Type')}`);
        }

        // Step 5: Stream the PDF back to the client.
        const pdfBuffer = await pdfResponse.arrayBuffer();

        res.setHeader('Content-Type', 'application/pdf');
        // 'inline' tells the browser to try and display it, rather than just downloading.
        res.setHeader('Content-Disposition', 'inline; filename="radioaviso.pdf"');
        res.send(Buffer.from(pdfBuffer));

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error({
            message: "Error in /api/radioaviso-pdf",
            details: errorMessage,
            target: target
        });
        return res.status(500).json({
            error: 'Failed to retrieve the PDF from the source.',
            details: errorMessage
        });
    }
}