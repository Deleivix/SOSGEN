import type { VercelRequest, VercelResponse } from '@vercel/node';

// The data type that reflects the columns of the table
type SalvamentoAviso = {
  num: string;
  emision: string;
  asunto: string;
  zona: string;
  tipo: string;
  subtipo: string;
  prioridad: string;
  caducidad: string;
  pdfLink: string;
};

// Simple in-memory cache
const cache = {
  data: null as SalvamentoAviso[] | null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const soapRequestBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ObtenerRadioavisosActivos xmlns="http://tempuri.org/" />
  </soap:Body>
</soap:Envelope>`;

/**
 * Decodes HTML entities like &lt; and &gt; into their character equivalents.
 */
function decodeHtmlEntities(text: string): string {
    return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const now = Date.now();
  if (cache.data && (now - cache.timestamp < CACHE_DURATION_MS)) {
    return res.status(200).json(cache.data);
  }

  // CORRECTED: The previous URL (Radioavisos_V2.asmx) was outdated and returning a 404.
  const targetUrl = 'https://radioavisos.salvamentomaritimo.es/WS/Radioavisos.asmx';
  
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '"http://tempuri.org/ObtenerRadioavisosActivos"',
      },
      body: soapRequestBody,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from the web service, status: ${response.status}`);
    }

    const xmlText = await response.text();

    const resultMatch = xmlText.match(/<ObtenerRadioavisosActivosResult>([\s\S]*?)<\/ObtenerRadioavisosActivosResult>/);
    if (!resultMatch || !resultMatch[1]) {
        throw new Error("Could not find ObtenerRadioavisosActivosResult in the SOAP response.");
    }

    const encodedXml = resultMatch[1];
    const decodedXml = decodeHtmlEntities(encodedXml);
    
    const avisos: SalvamentoAviso[] = [];
    const avisoRegex = /<Radioaviso>([\s\S]*?)<\/Radioaviso>/g;
    let match;

    while ((match = avisoRegex.exec(decodedXml)) !== null) {
        const avisoXml = match[1];

        const getValue = (tag: string): string => {
            const tagRegex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
            const tagMatch = avisoXml.match(tagRegex);
            return tagMatch ? tagMatch[1].trim() : '';
        };

        const fichero = getValue('fichero');

        avisos.push({
            num: getValue('id_radioaviso'),
            emision: getValue('f_emision'),
            asunto: getValue('asunto'),
            zona: getValue('zona'),
            tipo: getValue('tipo'),
            subtipo: getValue('subtipo'),
            prioridad: getValue('prioridad'),
            caducidad: getValue('f_caducidad'),
            pdfLink: fichero ? `https://radioavisos.salvamentomaritimo.es/ficheros/${fichero}` : '',
        });
    }

    if (avisos.length === 0) {
        console.warn("Could not parse any notices from the decoded XML. The inner structure might have changed.");
    }

    cache.data = avisos;
    cache.timestamp = now;
    return res.status(200).json(avisos);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in /api/salvamento-avisos:", errorMessage);
    // Clear cache on error to force a refetch next time
    cache.data = null;
    cache.timestamp = 0;
    return res.status(500).json({ 
        error: 'Failed to fetch or process data from Salvamento Marítimo API', 
        details: errorMessage
    });
  }
}