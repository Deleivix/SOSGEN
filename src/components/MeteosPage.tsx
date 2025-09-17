import { handleCopy, showToast } from "../utils/helpers";

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
let meteosIntervalId: number | null = null;
let meteosCache: { bulletin: any; errors: string[]; timestamp: number; } | null = null;
let isFetchingMeteos: boolean = false;

const renderMeteosHTML = (bulletin: any, errors: string[] = []) => {
    const copyButtonHTML = (cardId: keyof typeof bulletin, text: string, ariaLabel: string) => `
        <button class="copy-btn bulletin-copy-btn" data-card-id="${String(cardId)}" aria-label="${ariaLabel}" ${!bulletin[cardId] ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
            <span>${text}</span>
        </button>
    `;
    
    const errorHtml = errors.length > 0
        ? `<div class="warning-box" style="margin-bottom: 1rem; text-align: left;">
             <h3 style="margin-top: 0;">Error de Carga</h3>
             <p>No se pudo obtener la información de: <strong>${errors.join(', ')}</strong>. Los datos mostrados pueden estar incompletos o desactualizados.</p>
           </div>`
        : '';

    return `
        <div class="meteos-header">
            <div class="meteos-header-text">
                <h2 class="content-card-title" style="margin-bottom: 0.5rem; border: none; padding: 0;">Boletines Meteorológicos Marítimos de AEMET</h2>
                <p class="translator-desc" style="margin-bottom: 0;">Boletines formateados y traducidos mediante IA. La información se actualiza automáticamente cada hora o manualmente.</p>
            </div>
            <button id="meteos-refresh-btn" class="secondary-btn">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
                <span>Actualizar</span>
            </button>
        </div>
        ${errorHtml}
        <div class="bulletins-container">
            <div class="language-column">
                <div class="bulletin-card">
                    <div class="bulletin-card-header">
                        <h3>Boletín Atlántico</h3>
                        ${copyButtonHTML('spanish', 'Copiar', 'Copiar boletín en español')}
                    </div>
                    <pre class="bulletin-content">${bulletin.spanish || 'No disponible.'}</pre>
                </div>
                <div class="bulletin-card">
                    <div class="bulletin-card-header">
                        <h3>Avisos Marítimos</h3>
                        ${copyButtonHTML('spanish_warnings', 'Copiar', 'Copiar avisos en español')}
                    </div>
                    <pre class="bulletin-content">${bulletin.spanish_warnings || 'No disponible.'}</pre>
                </div>
            </div>
            <div class="language-column">
                <div class="bulletin-card">
                    <div class="bulletin-card-header">
                        <h3>Atlantic Bulletin</h3>
                        ${copyButtonHTML('english', 'Copy', 'Copy English bulletin')}
                    </div>
                    <pre class="bulletin-content">${bulletin.english || 'Not available.'}</pre>
                </div>
                <div class="bulletin-card">
                    <div class="bulletin-card-header">
                        <h3>Maritime Warnings</h3>
                        ${copyButtonHTML('english_warnings', 'Copy', 'Copy English warnings')}
                    </div>
                    <pre class="bulletin-content">${bulletin.english_warnings || 'Not available.'}</pre>
                </div>
            </div>
        </div>
        <h3 class="reference-table-subtitle" style="margin-top: 2rem;">Boletines Costeros</h3>
        <div class="coastal-container">
            <div class="bulletin-card">
                <div class="bulletin-card-header">
                    <h3>Costero Galicia (TTS)</h3>
                    ${copyButtonHTML('galicia_coastal', 'Copiar', 'Copiar boletín costero de Galicia')}
                </div>
                <pre class="bulletin-content">${bulletin.galicia_coastal || 'No disponible.'}</pre>
            </div>
            <div class="bulletin-card">
                <div class="bulletin-card-header">
                    <h3>Costero Cantábrico (TTS)</h3>
                     ${copyButtonHTML('cantabrico_coastal', 'Copiar', 'Copiar boletín costero del Cantábrico')}
                </div>
                <pre class="bulletin-content">${bulletin.cantabrico_coastal || 'No disponible.'}</pre>
            </div>
        </div>
    `;
};

const renderMeteosSkeleton = () => `
    <div class="meteos-header">
        <div class="meteos-header-text">
            <h2 class="content-card-title" style="margin-bottom: 0.5rem; border: none; padding: 0;">Boletines Meteorológicos Marítimos de AEMET</h2>
            <p class="translator-desc" style="margin-bottom: 0;">Boletines formateados y traducidos mediante IA. La información se actualiza automáticamente cada hora o manualmente.</p>
        </div>
        <button id="meteos-refresh-btn" class="secondary-btn" disabled>
             <svg class="spinner" style="animation: spin 1s linear infinite; width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Cargando...</span>
        </button>
    </div>
    <div class="skeleton skeleton-box" style="height: 250px; margin-bottom: 2rem;"></div>
    <div class="skeleton skeleton-box" style="height: 180px;"></div>
`;

// Fetches data from all three endpoints in parallel
async function fetchMeteosData() {
    if (isFetchingMeteos) return;
    isFetchingMeteos = true;
    
    const meteosContent = document.getElementById('meteos-content');
    if (!meteosContent) return;

    meteosContent.innerHTML = renderMeteosSkeleton();
    
    const endpoints = {
        main: '/api/meteos',
        main_warnings: '/api/main-warnings',
        coastal_warnings: '/api/warnings',
    };
    
    const results = await Promise.allSettled(Object.values(endpoints).map(url => fetch(url, { method: 'GET' })));

    const combinedBulletin: any = {};
    const errors: string[] = [];

    const processResponse = async (result: PromiseSettledResult<Response>, name: string) => {
        if (result.status === 'fulfilled' && result.value.ok) {
            try {
                const data = await result.value.json();
                Object.assign(combinedBulletin, data);
            } catch (e) {
                errors.push(name);
            }
        } else {
            errors.push(name);
        }
    };
    
    await processResponse(results[0], 'Boletín Atlántico');
    await processResponse(results[1], 'Avisos Marítimos');
    await processResponse(results[2], 'Boletines Costeros');

    meteosCache = { bulletin: combinedBulletin, errors, timestamp: Date.now() };
    meteosContent.innerHTML = renderMeteosHTML(combinedBulletin, errors);
    isFetchingMeteos = false;
}

export function renderMeteos(container: HTMLElement) {
    container.innerHTML = `<div class="content-card" style="max-width: 1400px;" id="meteos-content"></div>`;
    
    const contentEl = document.getElementById('meteos-content');
    if (!contentEl) return;
    
    const now = Date.now();
    const lastFetch = meteosCache?.timestamp || 0;
    
    if (meteosCache && (now - lastFetch < REFRESH_INTERVAL)) {
        contentEl.innerHTML = renderMeteosHTML(meteosCache.bulletin, meteosCache.errors);
    } else {
        fetchMeteosData();
    }
    
    // Clear previous interval if it exists and set a new one
    if (meteosIntervalId) clearInterval(meteosIntervalId);
    meteosIntervalId = window.setInterval(fetchMeteosData, REFRESH_INTERVAL);

    // --- Event Listeners ---
    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const refreshBtn = target.closest('#meteos-refresh-btn');
        const copyBtn = target.closest('.bulletin-copy-btn');

        if (refreshBtn && !isFetchingMeteos) {
            fetchMeteosData();
        }

        if (copyBtn instanceof HTMLButtonElement) {
            const cardId = copyBtn.dataset.cardId as keyof NonNullable<(typeof meteosCache)>['bulletin'];
            if (cardId && meteosCache?.bulletin[cardId]) {
                handleCopy(meteosCache.bulletin[cardId]);
            } else {
                showToast("No hay contenido para copiar.", "error");
            }
        }
    });
}
