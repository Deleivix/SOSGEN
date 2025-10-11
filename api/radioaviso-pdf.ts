import type { VercelRequest, VercelResponse } from '@vercel/node';
import { URLSearchParams } from 'url';

/**
 * This handler fetches the official PDF for a given radio warning.
 * It now correctly handles session cookies and all required ASP.NET form fields.
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

        // Step 3: Add/overwrite required fields for the postback.
        formData.set('__EVENTTARGET', target);
        formData.set('__EVENTARGUMENT', '');
        
        // This is for the ASP.NET AJAX UpdatePanel. Its value is critical.
        // It's composed of the UpdatePanel's ID and the event target's ID.
        formData.set(
            'ctl00$ToolkitScriptManager1',
            `ctl00$ContentPlaceHolder1$Radioavisos1$updFiltros|${target}`
        );

        // Add the current values of the filter controls. Even if empty, they are part of the form submission.
        // We assume the default "all" values which are '0' for dropdowns and empty for text.
        formData.set('ctl00$ContentPlaceHolder1$Radioavisos1$ddlTipo', '0');
        formData.set('ctl00$ContentPlaceHolder1$Radioavisos1$ddlZona', '0');
        formData.set('ctl00$ContentPlaceHolder1$Radioavisos1$txtTexto', '');
        
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
        if (!pdfResponse.body) {
            throw new Error('PDF response body is empty.');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="radioaviso.pdf"');
        
        const reader = pdfResponse.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            res.write(value);
        }
        res.end();

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error({
            message: "Error in /api/radioaviso-pdf",
            details: errorMessage,
            target: target
        });
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to retrieve the PDF from the source.',
                details: errorMessage
            });
        }
    }
}