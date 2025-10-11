import type { VercelRequest, VercelResponse } from '@vercel/node';

// Cache to avoid excessive API calls
const cache = new Map<string, { timestamp: number, data: any }>();
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const AEMET_URLS: { [key: string]: string } = {
    GALICIA: 'https://www.aemet.es/xml/maritima/FQXX40MM.xml',
    CANTABRICO: 'https://www.aemet.es/xml/maritima/FQXX41MM.xml',
    // For get-bulletin functionality
    'FQNT42MM': 'https://www.aemet.es/xml/maritima/FQNT42MM.xml',
    'WONT40MM': 'https://www.aemet.es/xml/maritima/WONT40MM.xml',
    'FQXX40MM': 'https://www.aemet.es/xml/maritima/FQXX40MM.xml',
    'FQXX41MM': 'https://www.aemet.es/xml/maritima/FQXX41MM.xml',
};

// --- Helper Functions for warnings ---
function parseWarningFromXml(xmlText: string): string | null {
    const avisoMatch = xmlText.match(/<aviso>[\s\S]*?<texto>([\s\S]*?)<\/texto>[\s\S]*?<\/aviso>/i);
    if (avisoMatch && avisoMatch[1]) {
        const text = avisoMatch[1].trim();
        if (text.toUpperCase().includes("NO HAY AVISO")) {
            return null;
        }
        return text;
    }
    return null;
}

// --- Helper Functions for forecast ---
const STATION_ZONE_MAPPING: { [key: string]: string } = {
    'La Guardia': 'SUR DE FISTERRA', 
    'Vigo': 'SUR DE FISTERRA', 
    'Finisterre': 'NORTE DE FISTERRA',
    'A Coruña': 'NORTE DE FISTERRA', 
    'Ortegal': 'CANTABRICO', 
    'Navia': 'CANTABRICO',
    'Cabo Peñas': 'CANTABRICO', 
    'Santander': 'CANTABRICO', 
    'Bilbao': 'CANTABRICO',
    'Pasajes': 'CANTABRICO',
};

const numberWords: { [key: string]: number } = {
    'CERO': 0, 'UNO': 1, 'DOS': 2, 'TRES': 3, 'CUATRO': 4, 'CINCO': 5,
    'SEIS': 6, 'SIETE': 7, 'OCHO': 8, 'NUEVE': 9, 'DIEZ': 10,
    'ONCE': 11, 'DOCE': 12
};

function parseForecastFromText(text: string) {
    const forecast = { windDirection: 'VAR', windForceBft: 0, waveHeightMeters: 0, visibilityKm: 10, weatherSummary: 'Despejado', weatherIcon: 'sunny' };
    const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');

    // --- Wind Force Extraction (Improved Logic) ---
    const allForces: number[] = [];
    const wordRegex = new RegExp(`\\b(${Object.keys(numberWords).join('|')})\\b`, 'g');
    const digitRegex = /\b(\d+)\b/g;

    let match;
    while((match = wordRegex.exec(normalizedText)) !== null) {
        allForces.push(numberWords[match[1]]);
    }
    while((match = digitRegex.exec(normalizedText)) !== null) {
        // Exclude wave heights by checking context
        const context = normalizedText.substring(Math.max(0, match.index - 20), match.index);
        if (!/METROS?|OLA|FONDO/.test(context)) {
            allForces.push(parseInt(match[1], 10));
        }
    }
    if (allForces.length > 0) {
        forecast.windForceBft = Math.max(...allForces);
    }

    // --- Wind Direction Extraction (Improved Logic) ---
    const dirRegex = /\b(NORTE|SURESTE|SUROESTE|NORESTE|NOROESTE|SUR|ESTE|OESTE|N|S|E|W|NE|NW|SE|SW|VARIABLE|VAR)\b/g;
    const dirMatch = dirRegex.exec(normalizedText);
    if (dirMatch) {
        let dir = dirMatch[1];
        if (dir.length > 3) { // It's a full word
            dir = dir.replace('NORTE', 'N').replace('SUR', 'S').replace('ESTE', 'E').replace('OESTE', 'W');
        }
        forecast.windDirection = dir;
    }

    // --- Wave Height Extraction ---
    const waveMatch = normalizedText.match(/(?:MAR DE FONDO|OLAS)\s+.*?(\d+(?:\.\d+)?)(?:\s+A\s+(\d+(?:\.\d+)?))?\s+METROS?/);
    if (waveMatch) {
        forecast.waveHeightMeters = parseFloat(waveMatch[2] || waveMatch[1]);
    } else {
        if (normalizedText.includes('GRUESA')) forecast.waveHeightMeters = 5.0;
        else if (normalizedText.includes('FUERTE MAREJADA')) forecast.waveHeightMeters = 3.0;
        else if (normalizedText.includes('MAREJADA')) forecast.waveHeightMeters = 1.8;
        else if (normalizedText.includes('MAREJADILLA')) forecast.waveHeightMeters = 0.8;
        else if (normalizedText.includes('RIZADA')) forecast.waveHeightMeters = 0.1;
    }

    // --- Visibility and Weather Summary ---
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
    } else if (normalizedText.includes('NUBO') || normalizedText.includes('CUBIERTO')) {
        forecast.weatherSummary = 'Nuboso';
        forecast.weatherIcon = 'cloudy';
    }
    return forecast;
}


// --- Main Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { type, id } = req.query;
    const now = Date.now();
    const cacheKey = `${type}-${id || ''}`;

    // Check cache
    const cachedEntry = cache.get(cacheKey);
    if (cachedEntry && (now - cachedEntry.timestamp < CACHE_DURATION_MS)) {
        return res.status(200).json(cachedEntry.data);
    }

    try {
        let data;
        switch (type) {
            case 'warnings':
                data = await getWarnings();
                break;
            case 'forecast':
                data = await getForecast();
                break;
            case 'bulletin':
                if (!id || typeof id !== 'string' || !AEMET_URLS[id]) {
                    return res.status(400).json({ error: 'Valid bulletin ID is required.' });
                }
                data = await getBulletin(id);
                break;
            default:
                return res.status(400).json({ error: 'Invalid request type.' });
        }
        
        cache.set(cacheKey, { timestamp: now, data });
        return res.status(200).json(data);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: `Failed to fetch AEMET data for type '${type}'.`, details: errorMessage });
    }
}

// --- Specific Data Fetching Functions ---
async function fetchAndDecode(url: string): Promise<string> {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`AEMET returned status: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('iso-8859-1');
    return decoder.decode(buffer);
}

async function getWarnings() {
    const [galiciaXml, cantabricoXml] = await Promise.all([
        fetchAndDecode(AEMET_URLS.GALICIA),
        fetchAndDecode(AEMET_URLS.CANTABRICO)
    ]);
    const galiciaWarning = parseWarningFromXml(galiciaXml);
    const cantabricoWarning = parseWarningFromXml(cantabricoXml);
    const activeWarnings = [];
    if (galiciaWarning) activeWarnings.push(`GALICIA: ${galiciaWarning}`);
    if (cantabricoWarning) activeWarnings.push(`CANTÁBRICO: ${cantabricoWarning}`);
    return { summary: activeWarnings.join('\n') };
}

async function getForecast() {
    const [galiciaXml, cantabricoXml] = await Promise.all([
        fetchAndDecode(AEMET_URLS.GALICIA),
        fetchAndDecode(AEMET_URLS.CANTABRICO)
    ]);

    const zoneForecasts = new Map<string, any>();

    const processXml = (xmlText: string) => {
        const zoneRegex = /<zona[^>]*nombre="([^"]+)"[^>]*>([\s\S]*?)<\/zona>/gi;
        const subzoneRegex = /<subzona[^>]*nombre="([^"]+)"[^>]*>[\s\S]*?<texto>([\s\S]*?)<\/texto>[\s\S]*?<\/subzona>/gi;
        const textoRegex = /<texto>([\s\S]*?)<\/texto>/i;

        let zoneMatch;
        while ((zoneMatch = zoneRegex.exec(xmlText)) !== null) {
            const zoneName = zoneMatch[1].trim().toUpperCase();
            const zoneContent = zoneMatch[2];
            
            const subzoneMatches = [...zoneContent.matchAll(subzoneRegex)];
            
            if (subzoneMatches.length > 0) {
                for (const subzoneMatch of subzoneMatches) {
                    const subzoneName = subzoneMatch[1].trim().toUpperCase();
                    const textContent = subzoneMatch[2] || '';
                    if (textContent) {
                        zoneForecasts.set(subzoneName, parseForecastFromText(textContent));
                    }
                }
            } else {
                const textoMatch = zoneContent.match(textoRegex);
                const textContent = textoMatch ? (textoMatch[1] || '') : '';
                if (textContent) {
                    zoneForecasts.set(zoneName, parseForecastFromText(textContent));
                }
            }
        }
    };
    
    processXml(galiciaXml);
    processXml(cantabricoXml);

    const forecastData = [];
    for (const [stationName, zoneName] of Object.entries(STATION_ZONE_MAPPING)) {
        const zoneForecast = zoneForecasts.get(zoneName);
        if (zoneForecast) {
            forecastData.push({ locationName: stationName, ...zoneForecast });
        }
    }
    if (forecastData.length === 0) {
        throw new Error("Could not extract forecast information from AEMET bulletins.");
    }
    return forecastData;
}


async function getBulletin(id: string) {
    const xml = await fetchAndDecode(AEMET_URLS[id]);
    return { xml };
}