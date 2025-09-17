import { handleCopy, showToast } from "../utils/helpers";

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
let meteosIntervalId: number | null = null;
let isFetchingMeteos: boolean = false;

// --- STATE MANAGEMENT ---
interface BulletinState {
    id: string;
    title: string;
    spanishContent: string | null;
    englishContent: string | null;
    status: 'idle' | 'loading' | 'done' | 'error';
    error: string | null;
}

let bulletinStates: Record<string, BulletinState> = {
    'main': { id: 'main', title: 'Boletín Atlántico', spanishContent: null, englishContent: null, status: 'idle', error: null },
    'warnings': { id: 'warnings', title: 'Avisos Marítimos', spanishContent: null, englishContent: null, status: 'idle', error: null },
    'coastal_galicia': { id: 'coastal_galicia', title: 'Costero Galicia', spanishContent: null, englishContent: null, status: 'idle', error: null },
    'coastal_cantabrico': { id: 'coastal_cantabrico', title: 'Costero Cantábrico', spanishContent: null, englishContent: null, status: 'idle', error: null },
};

// --- TRANSLATION & PARSING DICTIONARY AND LOGIC ---
const translationDictionary: { [key: string]: string } = {
    // Titles and Sections
    'AVISO': 'WARNING', 'SITUACIÓN': 'SITUATION', 'PREDICCIÓN': 'FORECAST', 'TENDENCIA': 'TREND',
    // General Terms
    'NO HAY AVISOS EN VIGOR': 'NO WARNINGS IN FORCE', 'FUERZA': 'FORCE', 'HORAS': 'HOURS',
    'VISIBILIDAD': 'VISIBILITY', 'MAR': 'SEA', 'VIENTO': 'WIND',
    // Directions
    'NORTE': 'NORTH', 'SUR': 'SOUTH', 'ESTE': 'EAST', 'OESTE': 'WEST',
    'NORESTE': 'NORTHEAST', 'NOROESTE': 'NORTHWEST', 'SUDESTE': 'SOUTHEAST', 'SUDOESTE': 'SOUTHWEST',
    'NORNORDESTE': 'NORTH-NORTHEAST', 'NORNOROESTE': 'NORTH-NORTHWEST',
    'ESTENORDESTE': 'EAST-NORTHEAST', 'ESTESUDESTE': 'EAST-SOUTHEAST',
    'SUDSUDESTE': 'SOUTH-SOUTHEAST', 'SUDSUROESTE': 'SOUTH-SOUTHWEST',
    'OESTESUROESTE': 'WEST-SOUTHWEST', 'OESTENOROESTE': 'WEST-NORTHWEST',
    'VARIABLE': 'VARIABLE', ' rolando a ': ' veering ', ' rolando al ': ' veering to ',
    // Sea States
    'RIZADA': 'RIPPLED', 'MAREJADILLA': 'SLIGHT SEA', 'MAREJADA': 'MODERATE SEA',
    'FUERTE MAREJADA': 'ROUGH SEA', 'GRUESA': 'VERY ROUGH SEA', 'MUY GRUESA': 'HIGH SEA',
    'ARBOLADA': 'VERY HIGH SEA', 'MAR DE FONDO': 'SWELL',
    // Visibility
    'BUENA': 'GOOD', 'REGULAR': 'MODERATE', 'MALA': 'POOR', 'NIEBLA': 'FOG',
    // Weather phenomena
    'DESPEJADO': 'CLEAR', 'NUBOSO': 'CLOUDY', 'CUBIERTO': 'OVERCAST',
    'LLUVIA': 'RAIN', 'LLOVIZNA': 'DRIZZLE', 'CHUBASCOS': 'SHOWERS', 'TORMENTA': 'THUNDERSTORM',
    // Actions & Trends
    'DISMINUYENDO': 'DECREASING', 'AUMENTANDO': 'INCREASING', 'ARRECIANDO': 'FRESHENING', 'AMAINANDO': 'ABATING',
    ' rolando ': ' veering ', ' fijándose ': ' becoming ',
    // Units
    'METROS': 'METERS',
    // Numbers for TTS style replacement
    'uno': 'one', 'dos': 'two', 'tres': 'three', 'cuatro': 'four', 'cinco': 'five',
    'seis': 'six', 'siete': 'seven', 'ocho': 'eight', 'nueve': 'nine', 'cero': 'zero',
    'con': 'point'
};

function translateBulletin(spanishText: string): string {
    if (!spanishText) return '';
    let englishText = spanishText;
    // Use a regex with word boundaries to avoid replacing parts of words.
    // Sort keys by length descending to match longer phrases first (e.g., "FUERTE MAREJADA" before "MAR").
    const sortedKeys = Object.keys(translationDictionary).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        englishText = englishText.replace(regex, translationDictionary[key]);
    }
    return englishText;
}


function optimizeForTTS(text: string): string {
    if (!text) return '';
    let optimizedText = text;
    const replacements: Record<string, string> = {
        'N': 'Norte', 'S': 'Sur', 'E': 'Este', 'W': 'Oeste',
        'NE': 'Noreste', 'NW': 'Noroeste', 'SE': 'Sudeste', 'SW': 'Sudoeste',
        'REG': 'Regular', 'VIS': 'Visibilidad',
    };
    optimizedText = optimizedText.replace(/\b(N|S|E|W|NE|NW|SE|SW|REG|VIS)\b/g, (match) => replacements[match] || match);
    optimizedText = optimizedText.replace(/Fuerza (\d)/g, (_, num) => `fuerza ${numberToWords(parseInt(num, 10))}`);
    optimizedText = optimizedText.replace(/(\d)\s*a\s*(\d)\s*m/g, (_, n1, n2) => `${numberToWords(parseInt(n1, 10))} a ${numberToWords(parseInt(n2, 10))} metros`);
    optimizedText = optimizedText.replace(/(\d)\.(\d)\s*m/g, (_, i, d) => `${numberToWords(parseInt(i, 10))} con ${numberToWords(parseInt(d, 10))} metros`);
    return optimizedText;
}

function numberToWords(num: number): string {
    const units = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    return units[num] || String(num);
}

function parseMainBulletin(xmlText: string): string {
    if (!xmlText) return "No se recibieron datos para el boletín principal.";
    // Use regex for robustness against parsing/encoding errors
    const apartados = xmlText.match(/<apartado>[\s\S]*?<\/apartado>/g) || [];
    if (apartados.length === 0) return "No se encontraron secciones ('apartado') en el boletín.";
    
    let fullText = '';
    apartados.forEach(apartadoStr => {
        const tituloMatch = apartadoStr.match(/<titulo>([\s\S]*?)<\/titulo>/);
        const textoMatch = apartadoStr.match(/<texto>([\s\S]*?)<\/texto>/);
        
        const titulo = tituloMatch ? tituloMatch[1].trim().replace(/&lt;/g, "<").replace(/&gt;/g, ">") : '';
        const texto = textoMatch ? textoMatch[1].trim().replace(/&lt;/g, "<").replace(/&gt;/g, ">") : '';
        
        if (titulo && texto) {
            fullText += `${titulo.toUpperCase()}\n\n${texto}\n\n`;
        }
    });

    if (!fullText.trim()) return "El contenido del boletín principal está vacío.";
    return optimizeForTTS(fullText.trim());
}

function parseCoastalBulletin(xmlText: string): string {
    if (!xmlText) return "No se recibieron datos para el boletín costero.";
    
    const nombreMatch = xmlText.match(/<nombre>([\s\S]*?)<\/nombre>/);
    const avisoMatch = xmlText.match(/<aviso>([\s\S]*?)<\/aviso>/);

    let content = (nombreMatch ? nombreMatch[1].trim().toUpperCase() : 'BOLETÍN COSTERO') + '\n\n';
    content += 'AVISO: ' + (avisoMatch ? avisoMatch[1].trim() : 'NO HAY AVISOS EN VIGOR.') + '\n\n';
    
    const zonas = xmlText.match(/<zona[\s\S]*?<\/zona>/g) || [];
    if (zonas.length === 0) return "No se encontraron zonas de predicción en el boletín costero.";

    zonas.forEach(zonaStr => {
        const nombreZonaMatch = zonaStr.match(/nombre="([^"]+)"/);
        const situacionMatch = zonaStr.match(/<situacion>[\s\S]*?<texto>([\s\S]*?)<\/texto>[\s\S]*?<\/situacion>/);
        const prediccionMatch = zonaStr.match(/<prediccion>[\s\S]*?<mar>([\s\S]*?)<\/mar>[\s\S]*?<\/prediccion>/);

        const nombreZona = nombreZonaMatch ? nombreZonaMatch[1].trim() : '';
        const situacion = situacionMatch ? situacionMatch[1].trim() : '';
        const prediccionMar = prediccionMatch ? prediccionMatch[1].trim() : '';
        
        content += `${nombreZona.toUpperCase()}:\n`;
        if (situacion) content += `SITUACIÓN: ${situacion}\n`;
        if (prediccionMar) content += `PREDICCIÓN: ${prediccionMar}\n\n`;
    });
    
    return optimizeForTTS(content.trim());
}


// --- RENDERING LOGIC ---

const renderBulletinCard = (state: BulletinState) => {
    const renderContent = (content: string | null, lang: 'es' | 'en') => {
        if (state.status === 'loading') {
            return `<div class="skeleton skeleton-text" style="height: 10em;"></div>`;
        }
        if (state.status === 'error' && lang === 'es') {
             return `<span style="color: var(--danger-color)">Error: ${state.error}</span>`;
        }
        if (state.status === 'error' && lang === 'en') {
            return ``;
        }
        return content || 'No disponible.';
    };

    return `
        <div class="bulletin-card" id="card-${state.id}">
            <div class="bulletin-card-header">
                <h3>${state.title}</h3>
            </div>
            <div class="bulletins-container" style="padding: 1rem; gap: 1rem;">
                <div class="language-column">
                    <div class="bulletin-card-header" style="padding: 0 0 0.5rem 0; border: none; background: transparent;">
                        <h4>Español (TTS)</h4>
                        <button class="copy-btn bulletin-copy-btn" data-card-id="${state.id}" data-lang="es" aria-label="Copiar ${state.title} en Español" ${!state.spanishContent ? 'disabled' : ''}>Copiar</button>
                    </div>
                    <pre class="bulletin-content" style="padding: 0;">${renderContent(state.spanishContent, 'es')}</pre>
                </div>
                <div class="language-column">
                     <div class="bulletin-card-header" style="padding: 0 0 0.5rem 0; border: none; background: transparent;">
                        <h4>Inglés</h4>
                        <button class="copy-btn bulletin-copy-btn" data-card-id="${state.id}" data-lang="en" aria-label="Copiar ${state.title} en Inglés" ${!state.englishContent ? 'disabled' : ''}>Copiar</button>
                    </div>
                    <pre class="bulletin-content" style="padding: 0;">${renderContent(state.englishContent, 'en')}</pre>
                </div>
            </div>
        </div>`;
};

const renderMeteosLayout = () => `
    <div class="meteos-header">
        <div class="meteos-header-text">
            <h2 class="content-card-title" style="margin-bottom: 0.5rem; border: none; padding: 0;">Boletines Meteorológicos Marítimos de AEMET</h2>
            <p class="translator-desc" style="margin-bottom: 0;">Boletines formateados, traducidos y optimizados. La información se actualiza automáticamente.</p>
        </div>
        <button id="meteos-refresh-btn" class="secondary-btn">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
            <span>Actualizar</span>
        </button>
    </div>
    ${renderBulletinCard(bulletinStates.main)}
    <div style="margin-top: 2rem"></div>
    ${renderBulletinCard(bulletinStates.warnings)}
    <h3 class="reference-table-subtitle" style="margin-top: 2rem;">Boletines Costeros</h3>
    <div class="coastal-container">
        ${renderBulletinCard(bulletinStates.coastal_galicia)}
        ${renderBulletinCard(bulletinStates.coastal_cantabrico)}
    </div>
`;


const updateCard = (id: string) => {
    const cardEl = document.getElementById(`card-${id}`);
    if (cardEl) {
        cardEl.outerHTML = renderBulletinCard(bulletinStates[id]);
    }
};

async function fetchAndProcessData(stateKey: string, url: string, parser: (xml: string) => string, rawDataKey?: string) {
    try {
        bulletinStates[stateKey].status = 'loading';
        updateCard(stateKey);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error ${response.status} de AEMET`);
        
        const data = await response.json();
        const xmlText = rawDataKey ? data[rawDataKey] : data.rawXml;

        if (!xmlText) throw new Error("Respuesta de AEMET vacía.");

        const spanishContent = parser(xmlText);
        if(spanishContent.toLowerCase().includes("no se pudo") || spanishContent.toLowerCase().includes("no se encontraron")) {
            throw new Error(spanishContent);
        }

        const englishContent = translateBulletin(spanishContent);

        bulletinStates[stateKey].spanishContent = spanishContent;
        bulletinStates[stateKey].englishContent = englishContent;
        bulletinStates[stateKey].status = 'done';

    } catch (e) {
        bulletinStates[stateKey].status = 'error';
        bulletinStates[stateKey].error = e instanceof Error ? e.message : "Error desconocido.";
    } finally {
        updateCard(stateKey);
    }
}

async function fetchMeteosData() {
    if (isFetchingMeteos) return;
    isFetchingMeteos = true;
    
    document.querySelector<HTMLButtonElement>('#meteos-refresh-btn')?.setAttribute('disabled', 'true');
    const contentEl = document.getElementById('meteos-content');
    if (contentEl) {
        Object.keys(bulletinStates).forEach(k => { 
            bulletinStates[k].status = 'loading'; 
            bulletinStates[k].spanishContent = null;
            bulletinStates[k].englishContent = null;
            bulletinStates[k].error = null;
        });
        contentEl.innerHTML = renderMeteosLayout();
    }
    
    await Promise.allSettled([
        fetchAndProcessData('main', '/api/meteos', parseMainBulletin),
        fetchAndProcessData('warnings', '/api/main-warnings', parseMainBulletin),
        fetchAndProcessData('coastal_galicia', '/api/warnings', parseCoastalBulletin, 'rawGalicia'),
        fetchAndProcessData('coastal_cantabrico', '/api/warnings', parseCoastalBulletin, 'rawCantabrico')
    ]);

    isFetchingMeteos = false;
    document.querySelector<HTMLButtonElement>('#meteos-refresh-btn')?.removeAttribute('disabled');
}


export function renderMeteos(container: HTMLElement) {
    container.innerHTML = `<div class="content-card" style="max-width: 1400px;" id="meteos-content"></div>`;
    
    fetchMeteosData();
    
    if (meteosIntervalId) clearInterval(meteosIntervalId);
    meteosIntervalId = window.setInterval(fetchMeteosData, REFRESH_INTERVAL);

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const refreshBtn = target.closest('#meteos-refresh-btn');
        const copyBtn = target.closest<HTMLButtonElement>('.bulletin-copy-btn');

        if (refreshBtn && !isFetchingMeteos) {
            fetchMeteosData();
        }

        if (copyBtn) {
            const cardId = copyBtn.dataset.cardId as string;
            const lang = copyBtn.dataset.lang as 'es' | 'en';
            if (cardId && bulletinStates[cardId]) {
                const contentToCopy = lang === 'es' ? bulletinStates[cardId].spanishContent : bulletinStates[cardId].englishContent;
                if (contentToCopy) {
                    handleCopy(contentToCopy);
                } else {
                    showToast("No hay contenido para copiar.", "error");
                }
            }
        }
    });
}