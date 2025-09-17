import type { VercelRequest, VercelResponse } from '@vercel/node';

// Cache to avoid excessive API calls
interface Cache<T> {
  data: T | null;
  timestamp: number;
}
const forecastCache: Cache<any> = {
  data: null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const AEMET_URLS = {
    GALICIA: 'https://www.aemet.es/xml/maritima/FQXX40MM.xml',
    CANTABRICO: 'https://www.aemet.es/xml/maritima/FQXX41MM.xml',
};

// --- Helper function to parse forecast from bulletin text ---
function parseForecastFromText(text: string) {
    const forecast = {
        windDirection: 'VAR',
        windForceBft: 0,
        waveHeightMeters: 0,
        visibilityKm: 10,
        weatherSummary: 'Despejado',
        weatherIcon: 'sunny'
    };

    // 1. Wind
    const windMatch = text.match(/(?:VIENTO|ARRECIANDO A|ROLANDO A|TENDIENDO A)\s+([A-Z\s/O]+?)\s+(\d+)(?:\s*[A-Z]\s+(\d+))?/i);
    if (windMatch) {
        const directions = windMatch[1].replace(/COMPONENTE/i, '').trim().split(/\s+O\s+|\s*\/\s*/);
        forecast.windDirection = directions[0];
        forecast.windForceBft = parseInt(windMatch[3] || windMatch[2], 10);
    } else {
        const variableMatch = text.match(/VARIABLE\s+(\d+)(?:\s+A\s+(\d+))?/i);
        if(variableMatch) {
            forecast.windDirection = 'VAR';
            forecast.windForceBft = parseInt(variableMatch[2] || variableMatch[1], 10);
        }
    }

    // 2. Waves
    const waveMatch = text.match(/(?:MAR DE FONDO|OLAS)\s+.*?(\d+(?:\.\d+)?)(?:\s+A\s+(\d+(?:\.\d+)?))?\s+METROS/i);
    if (waveMatch) {
        forecast.waveHeightMeters = parseFloat(waveMatch[2] || waveMatch[1]);
    } else {
        if (/FUERTE MAREJADA/i.test(text)) forecast.waveHeightMeters = 3.0;
        else if (/MAREJADA/i.test(text)) forecast.waveHeightMeters = 1.8;
        else if (/MAREJADILLA/i.test(text)) forecast.waveHeightMeters = 0.8;
    }
    
    // 3. Visibility & Weather
    if (/NIEBLA|BRUMA|MALA/i.test(text)) {
        forecast.visibilityKm = 2;
        forecast.weatherSummary = 'Niebla o bruma';
        forecast.weatherIcon = 'fog';
    } else if (/REGULAR/i.test(text)) {
        forecast.visibilityKm = 8;
    }

    if (/AGUACEROS|LLUVIA/i.test(text)) {
        forecast.weatherSummary = 'Aguaceros';
        forecast.weatherIcon = 'rain';
    } else if (/TORMENTAS/i.test(text)) {
        forecast.weatherSummary = 'Tormentas';
        forecast.weatherIcon = 'thunderstorm';
    } else if (/NUBO/i.test(text)) {
        forecast.weatherSummary = 'Nuboso';
        forecast.weatherIcon = 'cloudy';
    }

    return forecast;
}


export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const now = Date.now();
  if (forecastCache.data && (now - forecastCache.timestamp < CACHE_DURATION_MS)) {
      console.log("Serving forecast from cache.");
      return response.status(200).json(forecastCache.data);
  }
  console.log("Fetching fresh forecast from AEMET bulletins.");

  try {
    const [galiciaRes, cantabricoRes] = await Promise.all([
        fetch(AEMET_URLS.GALICIA, { cache: 'no-store' }),
        fetch(AEMET_URLS.CANTABRICO, { cache: 'no-store' })
    ]);

    if (!galiciaRes.ok || !cantabricoRes.ok) {
        throw new Error('Failed to fetch one or more AEMET bulletins.');
    }

    const [galiciaBuffer, cantabricoBuffer] = await Promise.all([
        galiciaRes.arrayBuffer(),
        cantabricoRes.arrayBuffer()
    ]);

    const decoder = new TextDecoder('iso-8859-1');
    const galiciaXml = decoder.decode(galiciaBuffer);
    const cantabricoXml = decoder.decode(cantabricoBuffer);
    
    const allXml = galiciaXml + cantabricoXml;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(allXml, "application/xml");

    const zones = xmlDoc.querySelectorAll("prediccion > zona");
    const forecastData = Array.from(zones).map(zone => {
        const locationName = zone.getAttribute('nombre')?.replace(/AGUAS COSTERAS DE /i, '') || 'Desconocido';
        const textContent = zone.querySelector('texto')?.textContent || '';
        const forecast = parseForecastFromText(textContent);
        
        return {
            locationName,
            ...forecast
        };
    }).filter(f => f.locationName !== 'Desconocido');

    if (forecastData.length === 0) {
        throw new Error("No se pudo extraer la información de los boletines de AEMET.");
    }

    forecastCache.data = forecastData;
    forecastCache.timestamp = now;

    return response.status(200).json(forecastData);

  } catch (error) {
    console.error("Error in /api/forecast:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate forecast.", details: errorMessage });
  }
}