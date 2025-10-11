


import type { VercelRequest, VercelResponse } from '@vercel/node';
import { URLSearchParams } from 'url';
// FIX: Import Readable from 'stream' to handle response streaming.
import { Readable } from 'stream';

/**
 * This handler fetches the official PDF for a given radio warning.
 * It now correctly handles session cookies required by the ASP.NET backend.
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
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

    try {
        // Step 1: Fetch the main page to get form state AND the session cookie.
        const pageResponse = await fetch(targetUrl, {
            headers: { 'User-Agent': userAgent },
            cache: 'no-store',
        });

        if (!pageResponse.ok) {
            throw new Error(`Failed to fetch main page, status: ${pageResponse.status}`);
        }
        const pageHtml = await pageResponse.text();
        
        // Extract the ASP.NET session cookie, which is required for postbacks.
        const cookieHeader = pageResponse.headers.get('set-cookie');
        let sessionIdCookie: string | null = null;
        if (cookieHeader) {
            const match = cookieHeader.match(/ASP.NET_SessionId=[^;]+/);
            if (match) {
                sessionIdCookie = match[0];
            }
        }
        
        if (!sessionIdCookie) {
            console.warn("Could not retrieve ASP.NET session cookie.");
        }

        // Step 2: Parse HTML for all hidden ASP.NET fields.
        const formData = new URLSearchParams();
        const hiddenInputRegex = /<input type="hidden"\s+name="([^"]+)"[^>]*?value="([^"]*)"/gi;
        
        let match;
        while ((match = hiddenInputRegex.exec(pageHtml)) !== null) {
            formData.append(match[1], match[2]);
        }

        // Step 3: Set the specific target for the PDF link.
        formData.set('__EVENTTARGET', target);
        formData.set('__EVENTARGUMENT', '');
        
        // Step 4: Make the POST request, including the session cookie.
        const pdfResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': userAgent,
                'Referer': targetUrl,
                ...(sessionIdCookie && { 'Cookie': sessionIdCookie }),
            },
            body: formData.toString()
        });

        if (!pdfResponse.ok || !pdfResponse.headers.get('Content-Type')?.includes('application/pdf')) {
             const errorText = await pdfResponse.text().catch(() => "Could not read response body.");
             console.error("Unexpected response from PDF endpoint:", { status: pdfResponse.status, contentType: pdfResponse.headers.get('Content-Type'), body: errorText.substring(0, 500) });
            throw new Error(`Failed to get PDF. Server responded with status ${pdfResponse.status}.`);
        }

        // Step 5: Stream the PDF back to the client.
        // FIX: Replaced buffer-based response with a streaming response to avoid 'Buffer' type issues and improve performance.
        if (!pdfResponse.body) {
            throw new Error('PDF response body is empty.');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="radioaviso.pdf"');
        
        // Vercel function needs to wait for the stream to finish.
        // The `Readable.fromWeb` correctly converts the web stream to a Node.js stream.
        await new Promise<void>((resolve, reject) => {
            const body = pdfResponse.body!;
            // The `as any` cast helps bridge potential type mismatches between fetch's stream and Node's stream types.
            const nodeStream = Readable.fromWeb(body as any);
            nodeStream.pipe(res);
            nodeStream.on('end', () => resolve());
            nodeStream.on('error', (err) => reject(err));
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error({
            message: "Error in /api/radioaviso-pdf",
            details: errorMessage,
            target: target
        });
        // Avoid sending another response if one has already started streaming.
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to retrieve the PDF from the source.',
                details: errorMessage
            });
        }
    }
}
