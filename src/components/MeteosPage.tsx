import { handleCopy, showToast } from "../utils/helpers";

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
let meteosIntervalId: number | null = null;
let isFetchingMeteos: boolean = false;

// --- STATE MANAGEMENT ---
interface BulletinState {
    id: string;
    title: string;
    rawContent: string | null;
    status: 'idle' | 'loading' | 'done' | 'error';
    error: string | null;
}

let bulletinStates: Record<string, BulletinState> = {
    'main': { id: 'main', title: 'Boletín Atlántico (FQNT42MM)', rawContent: null, status: 'idle', error: null },
    'warnings': { id: 'warnings', title: 'Avisos Marítimos (WONT40MM)', rawContent: null, status: 'idle', error: null },
    'coastal_galicia': { id: 'coastal_galicia', title: 'Costero Galicia (FQXX40MM)', rawContent: null, status: 'idle', error: null },
    'coastal_cantabrico': { id: 'coastal_cantabrico', title: 'Costero Cantábrico (FQXX41MM)', rawContent: null, status: 'idle', error: null },
};

// --- RENDERING LOGIC ---

const renderBulletinCard = (state: BulletinState) => {
    let contentHtml = '';
    switch (state.status) {
        case 'loading':
            contentHtml = `<div class="skeleton skeleton-text" style="height: 15em;"></div>`;
            break;
        case 'error':
            contentHtml = `<span style="color: var(--danger-color)">Error: ${state.error}</span>`;
            break;
        case 'done':
            // Basic XML escaping for display
            const escapedContent = state.rawContent
                ? state.rawContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                : 'No disponible.';
            contentHtml = escapedContent;
            break;
        default:
            contentHtml = 'Esperando para cargar...';
    }

    return `
        <div class="bulletin-card" id="card-${state.id}">
            <div class="bulletin-card-header">
                <h3>${state.title}</h3>
                <button class="copy-btn bulletin-copy-btn" data-card-id="${state.id}" aria-label="Copiar ${state.title}" ${!state.rawContent ? 'disabled' : ''}>
                    Copiar
                </button>
            </div>
            <pre class="bulletin-content">${contentHtml}</pre>
        </div>`;
};

const renderMeteosLayout = () => `
    <div class="meteos-header">
        <div class="meteos-header-text">
            <h2 class="content-card-title" style="margin-bottom: 0.5rem; border: none; padding: 0;">Boletines Meteorológicos Marítimos de AEMET</h2>
            <p class="translator-desc" style="margin-bottom: 0;">Contenido XML en crudo obtenido directamente de AEMET. La información se actualiza automáticamente.</p>
        </div>
        <button id="meteos-refresh-btn" class="secondary-btn">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
            <span>Actualizar</span>
        </button>
    </div>
    <div class="bulletins-container" style="grid-template-columns: 1fr; gap: 1.5rem;">
        ${renderBulletinCard(bulletinStates.main)}
        ${renderBulletinCard(bulletinStates.warnings)}
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

async function fetchRawData(stateKey: string, url: string, rawDataKey: string) {
    try {
        bulletinStates[stateKey].status = 'loading';
        updateCard(stateKey);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error ${response.status} de AEMET`);
        
        const data = await response.json();
        const xmlText = data[rawDataKey];

        if (!xmlText) throw new Error("Respuesta de AEMET vacía.");

        bulletinStates[stateKey].rawContent = xmlText;
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
    
    const refreshBtn = document.querySelector<HTMLButtonElement>('#meteos-refresh-btn');
    if(refreshBtn) refreshBtn.disabled = true;

    const contentEl = document.getElementById('meteos-content');
    if (contentEl) {
        Object.keys(bulletinStates).forEach(k => { 
            bulletinStates[k].status = 'loading'; 
            bulletinStates[k].rawContent = null;
            bulletinStates[k].error = null;
        });
        contentEl.innerHTML = renderMeteosLayout();
    }
    
    await Promise.allSettled([
        fetchRawData('main', '/api/meteos', 'rawXml'),
        fetchRawData('warnings', '/api/main-warnings', 'rawXml'),
        fetchRawData('coastal_galicia', '/api/warnings', 'rawGalicia'),
        fetchRawData('coastal_cantabrico', '/api/warnings', 'rawCantabrico')
    ]);

    isFetchingMeteos = false;
    const finalRefreshBtn = document.querySelector<HTMLButtonElement>('#meteos-refresh-btn');
    if(finalRefreshBtn) finalRefreshBtn.disabled = false;
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
            if (cardId && bulletinStates[cardId]) {
                const contentToCopy = bulletinStates[cardId].rawContent;
                if (contentToCopy) {
                    handleCopy(contentToCopy);
                } else {
                    showToast("No hay contenido para copiar.", "error");
                }
            }
        }
    });
}