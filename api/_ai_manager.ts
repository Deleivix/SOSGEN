
import { GoogleGenAI } from '@google/genai';
import { sql } from '@vercel/postgres';

// --- IN-MEMORY STATE FOR CIRCUIT BREAKER ---
// Note: In serverless (Vercel), this resets on cold starts, which is acceptable 
// as persistent state is stored in DB.
let errorCount = 0;
let firstErrorTime = 0;
const ERROR_THRESHOLD = 10;
const TIME_WINDOW_MS = 5 * 60 * 1000; // 5 Minutes

// --- STATIC DICTIONARIES FOR FALLBACKS ---
const NAUTICAL_DICTIONARY: Record<string, string> = {
    "proa": "bow", "popa": "stern", "babor": "port", "estribor": "starboard",
    "barlovento": "windward", "sotavento": "leeward", "ancla": "anchor",
    "fondeadero": "anchorage", "buque": "vessel", "barco": "ship",
    "pesquero": "fishing vessel", "mercante": "merchant ship",
    "velero": "sailing vessel", "yate": "yacht", "remolcador": "tug",
    "vía de agua": "taking on water", "incendio": "fire", "hombre al agua": "man overboard",
    "abandono": "abandon ship", "naufragio": "shipwreck", "varada": "grounding",
    "abordaje": "collision", "sin gobierno": "not under command",
    "a la deriva": "adrift", "aviso": "warning", "temporal": "gale",
    "mar gruesa": "rough sea", "viento": "wind", "nudos": "knots",
    "rumbo": "course", "velocidad": "speed", "posición": "position",
    "asistencia": "assistance", "socorro": "distress", "urgencia": "urgency",
    "seguridad": "safety", "mayday": "mayday", "pan pan": "pan pan",
    "securite": "securite", "silencio": "silence", "cambio": "over",
    "recibido": "received", "entendido": "understood"
};

// --- STATIC DRILLS LIBRARY (Fallback if DB is empty) ---
const STATIC_DRILLS = [
    {
        type: 'dsc',
        title: "Incendio Sala Máquinas",
        scenario: "El CCR Finisterre recibe una alerta DSC en VHF Ch 70. MMSI: 224056789. Naturaleza: Fire/Explosion. Coordenadas: 43-22N 009-10W. No hay voz posterior.",
        questions: [
            { questionText: "¿Cuál es la primera acción?", options: ["ACK inmediato", "Esperar y escuchar", "Relay inmediato"], correctAnswerIndex: 1 },
            { questionText: "Si se confirma, ¿qué medio usas para contactar?", options: ["VHF Ch 16", "VHF Ch 70", "MF 2182"], correctAnswerIndex: 0 }
        ]
    },
    {
        type: 'radiotelephony',
        title: "Hombre al Agua",
        scenario: "Escuchas en Ch 16: 'MAYDAY MAYDAY MAYDAY, Aquí Pesquero ALBATROS. Hombre al agua a 2 millas al Norte de Cíes. Necesitamos ayuda inmediata'.",
        questions: [
            { questionText: "¿Fraseología correcta de acuse de recibo?", options: ["RECEIVED MAYDAY", "ROGER MAYDAY", "COPIADO MAYDAY"], correctAnswerIndex: 0 },
            { questionText: "¿Acción prioritaria?", options: ["Lanzar bengala", "Informar al CCS y emitir Relay si se ordena", "Ir a la zona sin avisar"], correctAnswerIndex: 1 }
        ]
    }
];

export class AiManager {
    
    // 1. Check if ECO Mode is Active
    static async isEcoMode(): Promise<boolean> {
        try {
            // Ensure table exists
            await sql`CREATE TABLE IF NOT EXISTS app_config (key VARCHAR(50) PRIMARY KEY, value VARCHAR(50));`;
            
            const { rows } = await sql`SELECT value FROM app_config WHERE key = 'eco_mode';`;
            if (rows.length > 0) {
                return rows[0].value === 'true';
            }
            return false;
        } catch (e) {
            console.warn("DB check failed for ECO mode, defaulting to false", e);
            return false;
        }
    }

    // 2. Set ECO Mode
    static async setEcoMode(active: boolean): Promise<void> {
        await sql`
            INSERT INTO app_config (key, value) VALUES ('eco_mode', ${String(active)})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        `;
        // Reset counters if manually toggled
        errorCount = 0;
        firstErrorTime = 0;
    }

    // 3. Report Error (Circuit Breaker)
    static async reportError(error: any): Promise<void> {
        // Only count Quota errors (429) or Service Unavailable (503)
        if (error.status === 429 || error.status === 503 || (error.message && error.message.includes('429'))) {
            const now = Date.now();
            
            if (now - firstErrorTime > TIME_WINDOW_MS) {
                // Reset window
                firstErrorTime = now;
                errorCount = 1;
            } else {
                errorCount++;
            }

            console.warn(`[AI-MANAGER] API Error detected. Count: ${errorCount}/${ERROR_THRESHOLD}`);

            if (errorCount >= ERROR_THRESHOLD) {
                console.error("[AI-MANAGER] Threshold reached. Activating ECO MODE automatically.");
                await this.setEcoMode(true);
            }
        }
    }

    // 4. Fallback Logic Implementations

    static getFallbackDrill(type: string): any {
        const fallback = STATIC_DRILLS.find(d => d.type === type) || STATIC_DRILLS[0];
        // Add a flag to UI knows it's static
        return { ...fallback, is_fallback: true, fullDetails: "Este es un escenario estático generado en Modo Bajo Consumo." };
    }

    static getFallbackSosgen(input: string): any {
        // Regex Extraction Strategy
        const mmsiMatch = input.match(/\d{9}/);
        const coordsMatch = input.match(/(\d{1,2}[º°\s]\d{1,2}['\.]?\d*?[NS])[\s,;-]+(\d{1,3}[º°\s]\d{1,2}['\.]?\d*?[EW])/i) || input.match(/(\d{2,3}°\s*\d+.*?)/);
        const pobMatch = input.match(/(\d+)\s*(personas|pob|tripulantes)/i);
        const vesselMatch = input.match(/(?:buque|embarcación|velero|yate|pesquero)\s+["']?([^"'\s,]+)["']?/i);
        const distressKeywords = ["incendio", "fuego", "vía de agua", "hundimiento", "abandono", "hombre al agua", "médico", "abordaje"];
        const nature = distressKeywords.find(k => input.toLowerCase().includes(k)) || "PELIGRO INDETERMINADO";

        const mmsi = mmsiMatch ? mmsiMatch[0] : "_________";
        const coords = coordsMatch ? (coordsMatch[0] + (coordsMatch[1] ? " " + coordsMatch[2] : "")) : "POSICIÓN DESCONOCIDA";
        const pob = pobMatch ? pobMatch[1] : "__";
        const vessel = vesselMatch ? vesselMatch[1].toUpperCase() : "EMBARCACIÓN";

        const esDesc = `Buque ${vessel} (MMSI ${mmsi}), con ${pob} personas a bordo, reporta ${nature} en posición ${coords}. Requiere asistencia inmediata.`;
        const enDesc = `Vessel ${vessel} (MMSI ${mmsi}), with ${pob} POB, reports ${nature.toUpperCase()} in position ${coords}. Requires immediate assistance.`;

        return {
            stationName: "ESTACIÓN COSTERA",
            mrcc: "CCS COMPETENTE",
            spanishDescription: esDesc,
            englishDescription: enDesc
        };
    }

    static getFallbackTranslation(text: string): string {
        const lower = text.toLowerCase().trim();
        // 1. Direct Dictionary Match
        if (NAUTICAL_DICTIONARY[lower]) return NAUTICAL_DICTIONARY[lower];
        
        // 2. Word-by-word replacement for simple phrases
        const words = lower.split(/\s+/);
        const translatedWords = words.map(w => NAUTICAL_DICTIONARY[w] || w);
        const result = translatedWords.join(' ');
        
        if (result !== lower) return `[ECO] ${result}`;
        
        return "[ECO MODE] Traducción IA no disponible. Consulte el diccionario.";
    }

    static getFallbackMmsiSearch(mmsi: string): any {
        // Return null info but keep the structure so frontend renders external links
        return {
            vesselInfo: {
                mmsi: mmsi,
                stationName: "BÚSQUEDA AUTOMÁTICA DESACTIVADA",
                summary: "El sistema está en Modo Bajo Consumo. La extracción automática de datos está deshabilitada. Por favor, utilice los enlaces directos a MarineTraffic o VesselFinder mostrados arriba."
            },
            sources: []
        };
    }
}
