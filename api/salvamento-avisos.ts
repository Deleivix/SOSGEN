import type { VercelRequest, VercelResponse } from '@vercel/node';

// El tipo de dato que refleja las columnas de la tabla
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

// The SOAP request body to call the official web service
const soapRequestBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ObtenerRadioavisosActivos xmlns="http://tempuri.org/" />
  </soap:Body>
</soap:Envelope>`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const now = Date.now();
  if (cache.data && (now - cache.timestamp < CACHE_DURATION_MS)) {
    return res.status(200).json(cache.data);
  }

  const targetUrl = 'https://radioavisos.salvamentomaritimo.es/WS/Radioavisos_V2.asmx';
  
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

    // Extract the JSON string from inside the SOAP XML response
    const jsonStringMatch = xmlText.match(/<ObtenerRadioavisosActivosResult>([\s\S]*?)<\/ObtenerRadioavisosActivosResult>/);
    if (!jsonStringMatch || !jsonStringMatch[1]) {
        throw new Error("Could not find ObtenerRadioavisosActivosResult in the SOAP response.");
    }

    const jsonString = jsonStringMatch[1];
    const rawAvisos = JSON.parse(jsonString);

    if (!Array.isArray(rawAvisos)) {
        throw new Error("Parsed API data is not an array.");
    }

    // Map the raw data from the official API to our desired format
    const avisos: SalvamentoAviso[] = rawAvisos.map((item: any) => ({
      num: item.id_radioaviso || '',
      emision: item.f_emision || '',
      asunto: item.asunto || '',
      zona: item.zona || '',
      tipo: item.tipo || '',
      subtipo: item.subtipo || '',
      prioridad: item.prioridad || '',
      caducidad: item.f_caducidad || '',
      pdfLink: item.fichero ? `https://radioavisos.salvamentomaritimo.es/ficheros/${item.fichero}` : '',
    }));
    
    cache.data = avisos;
    cache.timestamp = now;
    return res.status(200).json(avisos);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in /api/salvamento-avisos:", errorMessage);
    return res.status(500).json({ 
        error: 'Failed to fetch or process data from Salvamento Marítimo API', 
        details: errorMessage
    });
  }
}
