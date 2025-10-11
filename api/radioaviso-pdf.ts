import type { VercelRequest, VercelResponse } from '@vercel/node';
import { URLSearchParams } from 'url';

/**
 * Descarga el PDF de un radioaviso específico
 * 
 * Parámetros:
 * - target: ID del control ASP.NET (ej: rGridRadioavisos$ctl00$ctl04$ctl01)
 * 
 * Ejemplo de uso:
 * /api/radioaviso-pdf?target=rGridRadioavisos$ctl00$ctl04$ctl01
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { target } = req.query;

    if (!target || typeof target !== 'string') {
        return res.status(400).json({ 
            error: 'Missing or invalid "target" parameter.',
            example: '/api/radioaviso-pdf?target=rGridRadioavisos$ctl00$ctl04$ctl01'
        });
    }

    const targetUrl = 'https://radioavisos.salvamentomaritimo.es/';
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
        // PASO 1: Obtener la página principal para extraer el estado
        console.log('📄 Obteniendo página principal...');
        const pageResponse = await fetch(targetUrl, {
            headers: { 
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
            },
            cache: 'no-store',
        });

        if (!pageResponse.ok) {
            throw new Error(`Failed to fetch main page, status: ${pageResponse.status}`);
        }

        const pageHtml = await pageResponse.text();
        
        // Extraer la cookie de sesión
        const cookieHeader = pageResponse.headers.get('set-cookie');
        let sessionIdCookie: string | null = null;
        if (cookieHeader) {
            const match = cookieHeader.match(/ASP\.NET_SessionId=[^;]+/);
            if (match) {
                sessionIdCookie = match[0];
            }
        }
        
        if (!sessionIdCookie) {
            console.warn('⚠️ No se pudo obtener la cookie de sesión ASP.NET');
        } else {
            console.log('🍪 Cookie de sesión obtenida:', sessionIdCookie);
        }

        // PASO 2: Extraer TODOS los campos ocultos del formulario
        console.log('🔍 Extrayendo campos del formulario...');
        const formData = new URLSearchParams();
        
        // Regex mejorada para capturar todos los inputs hidden
        const hiddenInputRegex = /<input[^>]+type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/gi;
        
        let match;
        let fieldsFound = 0;
        while ((match = hiddenInputRegex.exec(pageHtml)) !== null) {
            formData.append(match[1], match[2]);
            fieldsFound++;
        }
        
        console.log(`✅ ${fieldsFound} campos ocultos encontrados`);

        // PASO 3: Configurar los campos específicos para la descarga del PDF
        formData.set('__EVENTTARGET', target);
        formData.set('__EVENTARGUMENT', '');
        
        // CRITICAL: ScriptManager para AJAX
        formData.set('ScriptManager1', `rGridRadioavisosPanel|${target}`);
        
        // ScriptManager TSM (necesario para Telerik)
        const tsmValue = ';;System.Web.Extensions, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35:en-US:058f3d91-8b8f-42fd-95b8-9acd75e73ceb:ea597d4b:b25378d2;Telerik.Web.UI, Version=2014.1.403.45, Culture=neutral, PublicKeyToken=121fae78165ba3d4:en-US:68d9452f-f268-45b2-8db7-8c3bbf305b8d:16e4e7cd:58366029:f7645509:24ee1bba:f46195d3:ed16cbdc';
        formData.set('ScriptManager1_TSM', tsmValue);
        
        // ClientState del grid (vacío por defecto está bien)
        if (!formData.has('rGridRadioavisos_ClientState')) {
            formData.set('rGridRadioavisos_ClientState', '');
        }
        
        // Indicar que es una petición AJAX asíncrona
        formData.set('__ASYNCPOST', 'true');
        
        // RadAJAX Control ID
        formData.set('RadAJAXControlID', 'ctl03');
        
        // Campo de destinatarios (vacío)
        if (!formData.has('txtDestinatarios')) {
            formData.set('txtDestinatarios', '');
        }

        console.log('📋 Campos configurados para la petición POST');

        // PASO 4: Hacer la petición POST para obtener el PDF
        console.log('📡 Enviando petición POST...');
        const pdfResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': userAgent,
                'Accept': 'application/pdf,*/*',
                'Referer': targetUrl,
                'Origin': 'https://radioavisos.salvamentomaritimo.es',
                'X-Requested-With': 'XMLHttpRequest',
                'X-MicrosoftAjax': 'Delta=true',
                ...(sessionIdCookie && { 'Cookie': sessionIdCookie }),
            },
            body: formData.toString(),
            redirect: 'follow'
        });

        console.log(`📥 Respuesta recibida: ${pdfResponse.status} ${pdfResponse.statusText}`);
        const contentType = pdfResponse.headers.get('Content-Type');
        console.log(`📄 Content-Type: ${contentType}`);

        // Verificar si es un PDF
        if (!pdfResponse.ok) {
            const errorText = await pdfResponse.text().catch(() => "Could not read response body.");
            console.error("❌ Error en la respuesta:", { 
                status: pdfResponse.status, 
                contentType, 
                bodyPreview: errorText.substring(0, 500) 
            });
            throw new Error(`Failed to get PDF. Server responded with status ${pdfResponse.status}.`);
        }

        if (!contentType?.includes('application/pdf')) {
            // Puede que sea una respuesta AJAX que redirija
            const responseText = await pdfResponse.text();
            console.log('📄 Respuesta (no PDF):', responseText.substring(0, 500));
            
            throw new Error(`Expected PDF but got: ${contentType}`);
        }

        // PASO 5: Transmitir el PDF al cliente
        console.log('✅ PDF recibido, enviando al cliente...');
        
        if (!pdfResponse.body) {
            throw new Error('PDF response body is empty.');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="radioaviso.pdf"');
        
        const reader = pdfResponse.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

        console.log('✅ PDF enviado exitosamente');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('❌ Error en /api/radioaviso-pdf:', {
            message: errorMessage,
            target: target
        });
        
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to retrieve the PDF from the source.',
                details: errorMessage,
                hint: 'El target debe ser un ID de control ASP.NET como: rGridRadioavisos$ctl00$ctl04$ctl01'
            });
        }
    }
}
