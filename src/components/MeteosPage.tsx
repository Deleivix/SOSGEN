import { handleCopy, showToast } from "../utils/helpers";

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
let meteosIntervalId: number | null = null;
let meteosCache: any = null;
let isFetchingMeteos: boolean = false;

const renderMeteosHTML = (bulletin: any) => {
    const copyButtonHTML = (cardId: keyof typeof bulletin, text: string, ariaLabel: string) => `
        <button class="copy-btn bulletin-copy-btn" data-card-id="${String(cardId)}" aria-label="${ariaLabel}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
            <span>${text}</span>
        </button>
    `;

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
        <div class="bulletins-container">
            <div class="language-column">
                <div class="bulletin-card">
                    <div class="bulletin-card-header">
                        <h3>Boletín Atlántico</h3>
                        ${copyButtonHTML('spanish', 'Copiar', 'Copiar boletín en español')}
                    </div>
                    <pre class="bulletin-content">${bulletin.spanish}</pre>
                </div>
                <div class="bulletin-card">
                    <div class="bulletin-card-header">
                        <h3>Avisos Marítimos</h3>
                        ${copyButtonHTML('spanish_warnings', 'Copiar', 'Copiar avisos en español')}
                    </div>
                    <pre class="bulletin-content">${bulletin.spanish_warnings}</pre>
                </div>
            </div>
            <div class="language-column">
                <div class="bulletin-card">
                    <div class="bulletin-card-header">
                        <h3>Atlantic Bulletin</h3>
                        ${copyButtonHTML('english', 'Copy', 'Copy English bulletin')}
                    </div>
                    <pre class="bulletin-content">${bulletin.english}</pre>
                </div>
                <div class="bulletin-card">
                    <div class="bulletin-card-header">
                        <h3>Maritime Warnings</h3>
                        ${copyButtonHTML('english_warnings', 'Copy', 'Copy English warnings')}
                    </div>
                    <pre class="bulletin-content">${bulletin.english_warnings}</pre>
                </div>
            </div>
        </div>
        <h3 class="reference-table-subtitle" style="margin-top: 2rem;">Boletines Costeros</h3>
        <div class="coastal-container">
            <div class="bulletin-card">
                <div class="bulletin-card-header">
                    <h3>Costero - Galicia</h3>
                    ${copyButtonHTML('galicia_coastal', 'Copiar', 'Copiar boletín costero de Galicia')}
                </div>
                <pre class="bulletin-content">${bulletin.galicia_coastal}</pre>
            </div>
            <div class="bulletin-card">
                <div class="bulletin-card-header">
                    <h3>Costero - Cantábrico</h3>
                     ${copyButtonHTML('cantabrico_coastal', 'Copiar', 'Copiar boletín costero del Cantábrico')}
                </div>
                <pre class="bulletin-content">${bulletin.cantabrico_coastal}</pre>
            </div>
        </div>
    `;
};

const skeletonHTML = `
    <div class="meteos-header">
        <div class="meteos-header-text">
            <div class="skeleton skeleton-title" style="width: 70%; height: 1.8em; margin-bottom: 0.5rem;"></div>
            <div class="skeleton skeleton-text" style="width: 90%;"></div>
        </div>
        <div class="skeleton" style="width: 120px; height: 40px; border-radius: 6px; flex-shrink: 0;"></div>
    </div>
    <div class="bulletins-container">
        <div class="language-column">
            <div class="skeleton skeleton-box" style="height: 400px;"></div>
            <div class="skeleton skeleton-box" style="height: 300px;"></div>
        </div>
        <div class="language-column">
            <div class="skeleton skeleton-box" style="height: 400px;"></div>
            <div class="skeleton skeleton-box" style="height: 300px;"></div>
        </div>
    </div>
`;

async function fetchMeteosData() {
    if (isFetchingMeteos) return; 
    isFetchingMeteos = true;
    try {
        const response = await fetch('/api/meteos', { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'La API devolvió un error.');
        }
        const data = await response.json();
        meteosCache = data;
        return data;
    } catch (err) {
        console.error("Error fetching METEOS data:", err);
        throw err;
    } finally {
        isFetchingMeteos = false;
    }
}

export function renderMeteos(container: HTMLElement) {
    container.classList.add('content-card');
    container.style.maxWidth = "1400px";

    if (!(container as any).__meteosListenersAttached) {
        initializeMeteosEventListeners(container);
        (container as any).__meteosListenersAttached = true;
    }
    
    if (meteosCache) {
        container.innerHTML = renderMeteosHTML(meteosCache);
    } else {
        container.innerHTML = skeletonHTML;
        fetchMeteosData()
            .then(data => {
                if (data && document.body.contains(container)) {
                    container.innerHTML = renderMeteosHTML(data);
                }
            })
            .catch(err => {
                const errorMessage = err instanceof Error ? err.message : "Error desconocido al obtener datos meteorológicos.";
                if (document.body.contains(container)) {
                    container.innerHTML = `<p class="error" style="text-align: center; padding: 2rem;">${errorMessage}</p>`;
                }
            });
    }

    if (!meteosIntervalId) {
        meteosIntervalId = window.setInterval(async () => {
            try {
                const newData = await fetchMeteosData();
                const currentPage = document.querySelector<HTMLElement>('#page-4.active');
                if (currentPage && newData) {
                    currentPage.innerHTML = renderMeteosHTML(newData);
                }
            } catch (error) {
                console.error("Meteos background refresh failed. Displaying stale data.");
            }
        }, REFRESH_INTERVAL);
    }
}

function initializeMeteosEventListeners(container: HTMLElement) {
    container.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        
        const refreshBtn = target.closest<HTMLButtonElement>('#meteos-refresh-btn');
        if (refreshBtn) {
            if (isFetchingMeteos) return;

            refreshBtn.disabled = true;
            refreshBtn.innerHTML = `
                <svg class="spinner" viewBox="0 0 16 16"><path d="M8,1.125 C4.2,1.125 1.125,4.2 1.125,8 C1.125,11.8 4.2,14.875 8,14.875" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
                <span>Actualizando...</span>`;

            try {
                const newData = await fetchMeteosData();
                if (newData && document.body.contains(container)) {
                    container.innerHTML = renderMeteosHTML(newData);
                    showToast('Boletines actualizados.', 'success');
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Error al actualizar.";
                showToast(errorMessage, 'error');
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = `
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
                    <span>Actualizar</span>`;
            }
            return;
        }

        const copyBtn = target.closest<HTMLButtonElement>('.bulletin-copy-btn');
        if (copyBtn && meteosCache) {
            const cardId = copyBtn.dataset.cardId as keyof typeof meteosCache;
            const textToCopy = meteosCache[cardId];
            if (textToCopy) {
                handleCopy(textToCopy);
            }
        }
    });
}