import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- Server-Side Cache ---
interface Cache<T> {
  data: T | null;
  timestamp: number;
}
const forecastCache: Cache<any> = {
  data: null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// --- AEMET URLs ---
const AEMET_GALICIA_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX40MM.xml';
const AEMET_CANTABRICO_COASTAL_URL = 'https://www.aemet.es/xml/maritima/FQXX41MM.xml';

// --- Parsing Helpers ---

const parseWind = (text: string): { windDirection: string, windForceBft: number } => {
    if (!text) return { windDirection: 'N/A', windForceBft: 0 };
    const upperText = text.toUpperCase();

    const dirMap: { [key: string]: string } = {
        'NORTE': 'N', 'NORDESTE': 'NE', 'ESTE': 'E', 'SUDESTE': 'SE',
        'SUR': 'S', 'SUDOESTE': 'SW', 'OESTE': 'W', 'NOROESTE': 'NW',
        'VARIABLE': 'VAR'
    };
    
    let windDirection = 'VAR';
    for (const key in dirMap) {
        if (upperText.includes(key)) {
            windDirection = dirMap[key];
            break;
        }
    }
    
    const forceMatch = upperText.match(/FUERZA\s*(\d)(?:\s*A\s*(\d))?/);
    let windForceBft = 0;
    if (forceMatch) {
        windForceBft = parseInt(forceMatch[2] || forceMatch[1], 10);
    }

    return { windDirection, windForceBft };
};

const parseWaveHeight = (swellText: string, seaText: string): number => {
    if (swellText) {
        const heightMatch = swellText.match(/(\d)(?:\s*A\s*(\d))?\s*METRO/i);
        if (heightMatch) return parseInt(heightMatch[2] || heightMatch[1], 10);
    }
    // Fallback to sea state if swell is not specified in meters
    const seaStateMap: { [key: string]: number } = {
        'RIZADA': 0.1, 'MAREJADILLA': 0.5, 'MAREJADA': 1.25,
        'FUERTE MAREJADA': 2.5, 'GRUESA': 4, 'MUY GRUESA': 6
    };
    for (const key in seaStateMap) {
        if (seaText && seaText.toUpperCase().includes(key)) {
            return seaStateMap[key];
        }
    }
    return 0;
};

const parseVisibility = (text: string): number => {
    if (!text) return 10;
    const upperText = text.toUpperCase();
    if (upperText.includes('BUENA')) return 10;
    if (upperText.includes('REGULAR')) return 8;
    if (upperText.includes('MALA')) return 4;
    if (upperText.includes('NIEBLA')) return 1;
    return 10;
};

const parseWeather = (text: string): { weatherIcon: string, weatherSummary: string } => {
    if (!text) return { weatherIcon: 'sunny', weatherSummary: 'Despejado' };
    const upperText = text.toUpperCase();
    if (upperText.includes('TORMENTA')) return { weatherIcon: 'thunderstorm', weatherSummary: 'Tormenta' };
    if (upperText.includes('LLUVIA') || upperText.includes('LLOVIZNA')) return { weatherIcon: 'rain', weatherSummary: 'Lluvia' };
    if (upperText.includes('CHUBASCOS')) return { weatherIcon: 'heavy-rain', weatherSummary: 'Chubascos' };
    if (upperText.includes('NIEBLA')) return { weatherIcon: 'fog', weatherSummary: 'Niebla' };
    if (upperText.includes('NUBOSO') || upperText.includes('CUBIERTO')) return { weatherIcon: 'cloudy', weatherSummary: 'Nuboso' };
    return { weatherIcon: 'partly-cloudy', weatherSummary: 'Parcialmente nuboso' };
};

const parseBulletinXml = (xmlText: string) => {
    const zones = xmlText.match(/<zona[\s\S]*?<\/zona>/g) || [];
    return zones.map(zoneStr => {
        const nameMatch = zoneStr.match(/nombre="([^"]+)"/);
        const locationName = nameMatch ? nameMatch[1].trim() : 'Desconocido';

        const getText = (tag: string) => {
            const match = zoneStr.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
            const contentMatch = match ? match[1].match(/<texto>([\s\S]*?)<\/texto>/) : null;
            return contentMatch ? contentMatch[1].trim() : (match ? match[1].trim() : '');
        };
        
        const getInnerContent = (outerTag: string, innerTag: string) => {
             const outerMatch = zoneStr.match(new RegExp(`<${outerTag}>[\\s\\S]*?</${outerTag}>`));
             if (!outerMatch) return '';
             const innerMatch = outerMatch[0].match(new RegExp(`<${innerTag}>([\\s\\S]*?)</${innerTag}>`));
             return innerMatch ? innerMatch[1].trim() : '';
        };

        const vientoText = getInnerContent('prediccion', 'viento');
        const marText = getInnerContent('prediccion', 'mar');
        const marDeFondoText = getInnerContent('prediccion', 'mar_de_fondo');
        const visibilidadText = getInnerContent('prediccion', 'visibilidad');
        const aguacerosText = getInnerContent('prediccion', 'aguaceros');
        
        const { windDirection, windForceBft } = parseWind(vientoText);
        const { weatherIcon, weatherSummary } = parseWeather(aguacerosText);

        return {
            locationName,
            windDirection,
            windForceBft,
            waveHeightMeters: parseWaveHeight(marDeFondoText, marText),
            visibilityKm: parseVisibility(visibilidadText),
            weatherIcon,
            weatherSummary,
            // Omitted fields as they are not in the source data
            seaTemperatureCelsius: 20, // Placeholder
            airTemperatureCelsius: 22, // Placeholder
            pressureHpa: 1015, // Placeholder
            pressureTrend: 'steady' // Placeholder
        };
    });
};


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
    // Filter out placeholder data before sending from cache
    const cachedData = forecastCache.data.map((item: any) => {
        const { seaTemperatureCelsius, airTemperatureCelsius, pressureHpa, pressureTrend, ...rest } = item;
        return rest;
    });
    return response.status(200).json(cachedData);
  }
  console.log("Fetching fresh forecast from AEMET.");

  try {
    const [galiciaResponse, cantabricoResponse] = await Promise.all([
        fetch(AEMET_GALICIA_COASTAL_URL, { cache: 'no-store' }),
        fetch(AEMET_CANTABRICO_COASTAL_URL, { cache: 'no-store' })
    ]);

    if (!galiciaResponse.ok || !cantabricoResponse.ok) {
        throw new Error(`Failed to fetch AEMET data. Statuses: ${galiciaResponse.status}, ${cantabricoResponse.status}`);
    }

    const [galiciaXml, cantabricoXml] = await Promise.all([
        galiciaResponse.text(),
        cantabricoResponse.text()
    ]);

    const galiciaForecasts = parseBulletinXml(galiciaXml);
    const cantabricoForecasts = parseBulletinXml(cantabricoXml);

    const combinedForecasts = [...galiciaForecasts, ...cantabricoForecasts];
    
    // Filter to match the locations previously used by the AI for consistency
    const targetLocations = [
        "FINISTERRE", "ÁRTABRO", "VIGO", "AS MARIÑAS", // Galicia
        "CANTÁBRICA OCCIDENTAL", "CANTÁBRICA ESTE", // Asturias/Cantabria
        "CANTABRIA", "PAÍS VASCO" // Cantabria/País Vasco
    ];

    const finalData = combinedForecasts
        .filter(f => targetLocations.some(target => f.locationName.toUpperCase().includes(target)))
        .map(f => {
            // Remove placeholder fields before sending and caching
            const { seaTemperatureCelsius, airTemperatureCelsius, pressureHpa, pressureTrend, ...rest } = f;
            return rest;
        });

    forecastCache.data = finalData;
    forecastCache.timestamp = now;

    return response.status(200).json(finalData);

  } catch (error) {
    console.error("Error in /api/forecast:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return response.status(500).json({ error: "Failed to generate forecast.", details: errorMessage });
  }
}