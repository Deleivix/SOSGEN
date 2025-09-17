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
    rawContent: string | null;
    status: 'idle' | 'loading' | 'done' | 'error';
    error: string | null;
}

let bulletinStates: Record<string, BulletinState> = {
    'main': { id: 'main', title: 'Boletín Atlántico (FQNT42MM)', url: '/api/meteos', fetchKey: 'rawXml', rawContent: null, status: 'idle', error: null },
    'warnings': { id: 'warnings', title: 'Avisos Marítimos (WONT40MM)', url: '/api/main-warnings', fetchKey: 'rawXml', rawContent: null, status: 'idle', error: null },
    'coastal_galicia': { id: 'coastal_galicia', title: 'Costero Galicia (FQXX40MM)', url: '/api/warnings', fetchKey: 'rawGalicia', rawContent: null, status: 'idle', error: null },
    'coastal_cantabrico': { id: 'coastal_cantabrico', title: 'Costero Cantábrico (FQXX41MM)', url: '/api/warnings', fetchKey: 'rawCantabrico', rawContent: null, status: 'idle', error: null },
};


// --- RENDERING LOGIC ---

const renderBulletinCard = (state: BulletinState) => {
    let content = '';
    
    switch (state.status) {
        case 'loading':
            content = `<div class="skeleton skeleton-text" style="height: 12em;"></div>`;
            break;
        case 'error':
            content = `<span style="color: var(--danger-color)">Error: ${state.error}</span>`;
            break;
        case 'done':
            // To display XML content correctly in <pre>, we must escape HTML characters.
            content = state.rawContent ? state.rawContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'No disponible.';
            break;
        default:
            content = 'Esperando para cargar...';
    }

    return `
        <div class="bulletin-card" id="card-${state.id}">
            <div class="bulletin-card-header">
                <h3>${state.title} (XML en crudo)</h3>
                <button class="bulletin-copy-btn" aria-label="Copiar ${state.title}" ${!state.rawContent ? 'disabled' : ''}>Copiar</button>
            </div>
            <pre class="bulletin-content">${content}</pre>
        </div>
    `;
};

const renderMeteosLayout = () => {
    const allBulletins = Object.values(bulletinStates);

    return `
    <div class="meteos-header">
        <div class="meteos-header-text">
            <h2 class="content-card-title" style="margin-bottom: 0.5rem; border: none; padding: 0;">Boletines Meteorológicos Marítimos de AEMET</h2>
            <p class="translator-desc" style="margin-bottom: 0;">Mostrando XML en crudo de AEMET para análisis.</p>
        </div>
        <button id="meteos-refresh-btn" class="secondary-btn">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
            <span>Actualizar</span>
        </button>
    </div>
    <div class="bulletins-grid" style="display: grid; grid-template-columns: 1fr; gap: 2rem;">
        ${allBulletins.map(state => `
            <div class="content-card" style="padding: 1rem;" data-bulletin-id="${state.id}">
                ${renderBulletinCard(state)}
            </div>
        `).join('')}
    </div>
    `;
};


// --- DATA FETCHING ---

const updateCard = (id: string) => {
    const container = document.querySelector(`.content-card[data-bulletin-id="${id}"]`);
    if (container) {
        container.innerHTML = renderBulletinCard(bulletinStates[id]);
    }
};

async function fetchAndDisplayData() {
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
    
    fetchAndDisplayData();
    
    if (meteosIntervalId) clearInterval(meteosIntervalId);
    meteosIntervalId = window.setInterval(fetchAndDisplayData, REFRESH_INTERVAL);

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const refreshBtn = target.closest('#meteos-refresh-btn');
        const copyBtn = target.closest<HTMLButtonElement>('.bulletin-copy-btn');

        if (refreshBtn && !isFetchingMeteos) {
            fetchAndDisplayData();
        }

        if (copyBtn) {
            const card = copyBtn.closest<HTMLElement>('.content-card');
            const bulletinId = card?.dataset.bulletinId;
            if (bulletinId) {
                const state = bulletinStates[bulletinId];
                if (state.rawContent) {
                    handleCopy(state.rawContent);
                } else {
                    showToast("No hay contenido para copiar.", "error");
                }
            }
        }
    });
}