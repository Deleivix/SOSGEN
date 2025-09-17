import { handleCopy, showToast } from "../utils/helpers";

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
let meteosIntervalId: number | null = null;
let isFetchingMeteos: boolean = false;

// --- STATE MANAGEMENT ---
interface BulletinState {
    id: string;
    title: string;
    url: string;
    fetchKey: string;
    parser: (xml: string) => string;
    rawContent: string | null;
    processedEs: string | null;
    processedEn: string | null;
    status: 'idle' | 'loading' | 'processing' | 'done' | 'error';
    error: string | null;
}

let bulletinStates: Record<string, BulletinState> = {
    'main': { id: 'main', title: 'Boletín Atlántico (FQNT42MM)', url: '/api/meteos', fetchKey: 'rawXml', parser: parseApartadoBulletin, rawContent: null, processedEs: null, processedEn: null, status: 'idle', error: null },
    'warnings': { id: 'warnings', title: 'Avisos Marítimos (WONT40MM)', url: '/api/main-warnings', fetchKey: 'rawXml', parser: parseApartadoBulletin, rawContent: null, processedEs: null, processedEn: null, status: 'idle', error: null },
    'coastal_galicia': { id: 'coastal_galicia', title: 'Costero Galicia (FQXX40MM)', url: '/api/warnings', fetchKey: 'rawGalicia', parser: parseCoastalBulletin, rawContent: null, processedEs: null, processedEn: null, status: 'idle', error: null },
    'coastal_cantabrico': { id: 'coastal_cantabrico', title: 'Costero Cantábrico (FQXX41MM)', url: '/api/warnings', fetchKey: 'rawCantabrico', parser: parseCoastalBulletin, rawContent: null, processedEs: null, processedEn: null, status: 'idle', error: null },
};

// --- PARSING & TRANSLATION LOGIC ---

const cleanHtml = (text: string | null): string => {
    if (!text) return '';
    const ta = document.createElement('textarea');
    ta.innerHTML = text.replace(/<br\s*\/?>/gi, '\n');
    return ta.value.replace(/<[^>]+>/g, '').trim().replace(/&nbsp;/g, ' ');
};

function parseApartadoBulletin(xml: string): string {
    const sections = xml.match(/<apartado>[\s\S]*?<\/apartado>/g);
    if (!sections) {
        // Fallback for simple bulletins like Avisos Marítimos
        const bodyMatch = xml.match(/<body>([\s\S]*?)<\/body>/) || xml.match(/<texto>([\s\S]*?)<\/texto>/);
        if (bodyMatch) return cleanHtml(bodyMatch[1]);
        return "Error: No se encontraron secciones ('apartado') en el boletín.";
    }

    return sections.map(section => {
        const titleMatch = section.match(/<titulo>([\s\S]*?)<\/titulo>/);
        const textMatch = section.match(/<texto>([\s\S]*?)<\/texto>/);
        const title = titleMatch ? cleanHtml(titleMatch[1]) : '';
        const text = textMatch ? cleanHtml(textMatch[1]) : 'Contenido no disponible.';
        return `${title.toUpperCase()}\n${text}`;
    }).join('\n\n').trim();
}

function parseCoastalBulletin(xml: string): string {
    let fullText = '';
    const nameMatch = xml.match(/<nombre>([\s\S]*?)<\/nombre>/);
    if (nameMatch) fullText += cleanHtml(nameMatch[1]).toUpperCase() + '\n\n';

    const warningMatch = xml.match(/<aviso>([\s\S]*?)<\/aviso>/);
    if (warningMatch) fullText += `AVISO: ${cleanHtml(warningMatch[1])}\n\n`;

    const zones = xml.match(/<zona[\s\S]*?<\/zona>/g);
    if (!zones) return fullText || "Error: No se encontraron zonas.";

    const zoneTexts = zones.map(zoneStr => {
        const nameMatch = zoneStr.match(/nombre="([^"]+)"/);
        const name = nameMatch ? nameMatch[1].trim() : 'ZONA DESCONOCIDA';
        
        const predMatch = zoneStr.match(/<prediccion>([\s\S]*?)<\/prediccion>/);
        if (!predMatch) return `${name.toUpperCase()}:\nNo hay predicción disponible.`;

        const predText = predMatch[1];
        const parts = ['viento', 'mar', 'mar_de_fondo', 'visibilidad', 'aguaceros'];
        
        const details = parts.map(part => {
            const match = predText.match(new RegExp(`<${part}>([\\s\\S]*?)</${part}>`));
            if (!match) return null;
            
            const textMatch = match[1].match(/<texto>([\s\S]*?)<\/texto>/);
            const text = textMatch ? cleanHtml(textMatch[1]) : cleanHtml(match[1]);
            
            return text ? `${text.charAt(0).toUpperCase() + text.slice(1)}.` : null;
        }).filter(Boolean).join(' ');

        return `${name.toUpperCase()}:\n${details}`;
    }).join('\n\n');

    return (fullText + zoneTexts).trim();
}

const translationDict: { [key: string]: string } = {
    // General
    'AVISO': 'WARNING', 'No hay avisos en vigor': 'No warnings in force', 'ZONA DE': 'ZONE OF',
    // Directions
    'Norte': 'North', 'Este': 'East', 'Sur': 'South', 'Oeste': 'West', 'Nordeste': 'Northeast', 'Sudeste': 'Southeast', 'Sudoeste': 'Southwest', 'Noroeste': 'Northwest', 'Variable': 'Variable', 'Componente': 'Component',
    // Wind force & Sea state
    'Fuerza': 'Force', 'amainando a': 'decreasing to', 'arreciando a': 'increasing to',
    'Rizada': 'Rippled', 'Marejadilla': 'Slight sea', 'Marejada': 'Moderate sea', 'Fuerte Marejada': 'Rough sea', 'Gruesa': 'Very rough sea', 'Mar de fondo': 'Swell',
    'disminuyendo a': 'decreasing to', 'combinada': 'combined', 'metros': 'meters',
    // Weather
    'Despejado': 'Clear', 'Intervalos nubosos': 'Partly cloudy', 'Nuboso': 'Cloudy', 'Cubierto': 'Overcast',
    'Posibilidad de': 'Possibility of', 'chubascos': 'showers', 'lluvias': 'rain', 'tormentas': 'thunderstorms',
    'brumas': 'mist', 'nieblas': 'fog',
    // Visibility
    'Visibilidad': 'Visibility', 'Buena': 'Good', 'Regular': 'Moderate', 'Mala': 'Poor',
    // Locations (partial)
    'Aguas costeras de': 'Coastal waters of', 'FINISTERRE A': 'FINISTERRE TO', 'Cabo': 'Cape',
    // ... add more as needed
};

function translateText(text: string): string {
    let translated = ` ${text} `; // Pad for whole word matching
    Object.entries(translationDict).forEach(([es, en]) => {
        // Case-insensitive, global, whole word replacement
        const regex = new RegExp(`([\\s,.:;])(${es})([\\s,.:;])`, 'gi');
        translated = translated.replace(regex, `$1${en}$3`);
    });
    return translated.trim();
}


// --- RENDERING LOGIC ---

const renderBulletinCard = (state: BulletinState) => {
    let esContent = '', enContent = '';
    
    switch (state.status) {
        case 'loading':
            esContent = enContent = `<div class="skeleton skeleton-text" style="height: 12em;"></div>`;
            break;
        case 'processing':
            esContent = enContent = `Procesando...`;
            break;
        case 'error':
            esContent = enContent = `<span style="color: var(--danger-color)">Error: ${state.error}</span>`;
            break;
        case 'done':
            esContent = state.processedEs || 'No disponible.';
            enContent = state.processedEn || 'No disponible.';
            break;
        default:
            esContent = enContent = 'Esperando para cargar...';
    }

    return `
        <div class="language-column">
             <div class="bulletin-card" id="card-${state.id}-es">
                <div class="bulletin-card-header">
                    <h3>Español (TTS)</h3>
                    <button class="bulletin-copy-btn" data-lang="es" aria-label="Copiar ${state.title} en Español" ${!state.processedEs ? 'disabled' : ''}>Copiar</button>
                </div>
                <pre class="bulletin-content">${esContent}</pre>
            </div>
        </div>
        <div class="language-column">
            <div class="bulletin-card" id="card-${state.id}-en">
                <div class="bulletin-card-header">
                    <h3>Inglés</h3>
                    <button class="bulletin-copy-btn" data-lang="en" aria-label="Copiar ${state.title} en Inglés" ${!state.processedEn ? 'disabled' : ''}>Copiar</button>
                </div>
                <pre class="bulletin-content">${enContent}</pre>
            </div>
        </div>
    `;
};


const renderMeteosLayout = () => {
    const mainBulletins = [bulletinStates.main, bulletinStates.warnings];
    const coastalBulletins = [bulletinStates.coastal_galicia, bulletinStates.coastal_cantabrico];

    return `
    <div class="meteos-header">
        <div class="meteos-header-text">
            <h2 class="content-card-title" style="margin-bottom: 0.5rem; border: none; padding: 0;">Boletines Meteorológicos Marítimos de AEMET</h2>
            <p class="translator-desc" style="margin-bottom: 0;">Boletines formateados y traducidos. La información se actualiza automáticamente.</p>
        </div>
        <button id="meteos-refresh-btn" class="secondary-btn">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
            <span>Actualizar</span>
        </button>
    </div>

    ${mainBulletins.map(state => `
        <div class="content-card" style="padding: 1rem; margin-bottom: 2rem;">
            <h3 class="reference-table-subtitle" style="margin-top:0; margin-bottom:1rem;">${state.title}</h3>
            <div class="bulletins-container" data-bulletin-id="${state.id}">
                ${renderBulletinCard(state)}
            </div>
        </div>
    `).join('')}

    <div class="content-card" style="padding: 1rem;">
        <h3 class="reference-table-subtitle" style="margin-top:0; margin-bottom:1rem;">Boletines Costeros</h3>
        <div class="coastal-container">
            ${coastalBulletins.map(state => `
                <div class="bulletin-group">
                    <h4 style="text-align: center; margin-bottom: 1rem;">${state.title}</h4>
                    <div class="bulletins-container" data-bulletin-id="${state.id}">
                        ${renderBulletinCard(state)}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;
};

// --- DATA FETCHING & PROCESSING ---

const updateCard = (id: string) => {
    const container = document.querySelector(`.bulletins-container[data-bulletin-id="${id}"]`);
    if (container) {
        container.innerHTML = renderBulletinCard(bulletinStates[id]);
    }
};

async function fetchAndProcessData() {
    if (isFetchingMeteos) return;
    isFetchingMeteos = true;
    
    document.querySelector<HTMLButtonElement>('#meteos-refresh-btn')?.setAttribute('disabled', 'true');
    Object.keys(bulletinStates).forEach(k => { bulletinStates[k].status = 'loading'; });
    const meteosContent = document.getElementById('meteos-content');
    if (meteosContent) meteosContent.innerHTML = renderMeteosLayout();

    await Promise.allSettled(Object.values(bulletinStates).map(async (state) => {
        try {
            const response = await fetch(state.url);
            if (!response.ok) throw new Error(`Error ${response.status} de AEMET`);
            const data = await response.json();
            
            state.rawContent = data[state.fetchKey];
            if (!state.rawContent) throw new Error("Respuesta de AEMET vacía.");

            state.status = 'processing';
            updateCard(state.id);

            state.processedEs = state.parser(state.rawContent);
            state.processedEn = translateText(state.processedEs);
            state.status = 'done';

        } catch (e) {
            state.status = 'error';
            state.error = e instanceof Error ? e.message : "Error desconocido.";
        } finally {
            updateCard(state.id);
        }
    }));

    isFetchingMeteos = false;
    document.querySelector<HTMLButtonElement>('#meteos-refresh-btn')?.removeAttribute('disabled');
}

// --- INITIALIZATION ---

export function renderMeteos(container: HTMLElement) {
    container.innerHTML = `<div id="meteos-content"></div>`;
    
    fetchAndProcessData();
    
    if (meteosIntervalId) clearInterval(meteosIntervalId);
    meteosIntervalId = window.setInterval(fetchAndProcessData, REFRESH_INTERVAL);

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const refreshBtn = target.closest('#meteos-refresh-btn');
        const copyBtn = target.closest<HTMLButtonElement>('.bulletin-copy-btn');

        if (refreshBtn && !isFetchingMeteos) {
            fetchAndProcessData();
        }

        if (copyBtn) {
            // FIX: Cast the result of `closest` to HTMLElement to ensure the `dataset` property is available.
            const container = copyBtn.closest<HTMLElement>('.bulletins-container');
            const bulletinId = container?.dataset.bulletinId;
            const lang = copyBtn.dataset.lang;
            if (bulletinId && (lang === 'es' || lang === 'en')) {
                const state = bulletinStates[bulletinId];
                const contentToCopy = lang === 'es' ? state.processedEs : state.processedEn;
                if (contentToCopy) {
                    handleCopy(contentToCopy);
                } else {
                    showToast("No hay contenido para copiar.", "error");
                }
            }
        }
    });
}
