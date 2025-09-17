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

// --- Mapping from the desired station name to the AEMET zone name ---
const STATION_ZONE_MAPPING: { [key: string]: string } = {
    'La Guardia': 'Pontevedra',
    'Vigo': 'Pontevedra',
    'Finisterre': 'A Coruña',
    'A Coruña': 'A Coruña',
    'Ortegal': 'Lugo', // Although geographically in A Coruña, its forecast is often with Lugo's section.
    'Navia': 'Asturias',
    'Cabo Peñas': 'Asturias',
    'Santander': 'Cantabria',
    'Bilbao': 'Bizkaia',
    'Pasajes': 'Gipuzkoa',
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
    
    const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');

    // Wind
    const windMatch = normalizedText.match(/(?:VIENTO|ARRECIANDO A|ROLANDO A|TENDIENDO A)\s+([A-Z\s/O]+?)\s+(\d+)(?:\s*[A-Z]\s+(\d+))?/);
    if (windMatch) {
        const directions = windMatch[1].replace(/COMPONENTE/i, '').trim().split(/\s+O\s+|\s*\/\s*/);
        forecast.windDirection = directions[0].trim();
        forecast.windForceBft = parseInt(windMatch[3] || windMatch[2], 10);
    } else {
        const variableMatch = normalizedText.match(/VARIABLE\s+(\d+)(?:\s+A\s+(\d+))?/);
        if(variableMatch) {
            forecast.windDirection = 'VAR';
            forecast.windForceBft = parseInt(variableMatch[2] || variableMatch[1], 10);
        }
    }

    // Waves
    const waveMatch = normalizedText.match(/(?:MAR DE FONDO|OLAS)\s+.*?(\d+(?:\.\d+)?)(?:\s+A\s+(\d+(?:\.\d+)?))?\s+METROS?/);
    if (waveMatch) {
        forecast.waveHeightMeters = parseFloat(waveMatch[2] || waveMatch[1]);
    } else {
        if (normalizedText.includes('FUERTE MAREJADA')) forecast.waveHeightMeters = 3.0;
        else if (normalizedText.includes('MAREJADA')) forecast.waveHeightMeters = 1.8;
        else if (normalizedText.includes('MAREJADILLA')) forecast.waveHeightMeters = 0.8;
        else if (normalizedText.includes('RIZADA')) forecast.waveHeightMeters = 0.1;
    }
    
    // Visibility & Weather
    if (normalizedText.includes('NIEBLA') || normalizedText.includes('BRUMA') || normalizedText.includes('MALA')) {
        forecast.visibilityKm = 2;
        forecast.weatherSummary = 'Niebla o bruma';
        forecast.weatherIcon = 'fog';
    } else if (normalizedText.includes('REGULAR')) {
        forecast.visibilityKm = 8;
    }

    if (normalizedText.includes('AGUACEROS') || normalizedText.includes('LLUVIA')) {
        forecast.weatherSummary = 'Aguaceros';
        forecast.weatherIcon = 'rain';
    } else if (normalizedText.includes('TORMENTAS')) {
        forecast.weatherSummary = 'Tormentas';
        forecast.weatherIcon = 'thunderstorm';
    } else if (normalizedText.includes('NUBO')) {
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
    
    // 1. Parse all bulletins and store forecasts by zone name (province)
    const zoneForecasts = new Map<string, any>();
    const zoneRegex = /<zona[^>]*nombre="([^"]+)"[^>]*>[\s\S]*?<texto>([\s\S]*?)<\/texto>[\s\S]*?<\/zona>/gi;
    let match;
    while ((match = zoneRegex.exec(allXml)) !== null) {
        const zoneName = match[1].replace(/AGUAS COSTERAS DE /i, '').trim();
        const textContent = match[2] || '';
        const forecast = parseForecastFromText(textContent);
        zoneForecasts.set(zoneName, forecast);
    }

    // 2. Create the final forecast list by mapping stations to their zone's forecast
    const forecastData = [];
    for (const [stationName, zoneName] of Object.entries(STATION_ZONE_MAPPING)) {
        const zoneForecast = zoneForecasts.get(zoneName);
        if (zoneForecast) {
            forecastData.push({
                locationName: stationName,
                ...zoneForecast
            });
        }
    }

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
