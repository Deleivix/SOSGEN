import { handleCopy } from "../utils/helpers";

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
let meteosIntervalId: number | null = null;
let meteosCache: any = null; // Use this to store the last successful fetch
let isFetchingMeteos: boolean = false; // Prevent concurrent fetches

/**
 * Generates the HTML string for the entire bulletin display.
 * @param bulletin - The bulletin data object.
 * @returns An HTML string.
 */
const renderBulletinHTML = (bulletin: any) => {
    const copyButtonHTML = (cardId: keyof typeof bulletin, text: string, ariaLabel: string) => `
        <button class="copy-btn bulletin-copy-btn" data-card-id="${String(cardId)}" aria-label="${ariaLabel}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
            <span>${text}</span>
        </button>
    `;

    return `
        <div class="meteos-header">
            <h2 class="content-card-title">Boletines Meteorológicos Marítimos de AEMET</h2>
            <p class="translator-desc">Boletines formateados y traducidos mediante IA para una fácil lectura y transmisión. La información se actualiza en segundo plano.</p>
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
        <div class="skeleton skeleton-title" style="width: 70%; height: 1.8em; margin-bottom: 0.5rem;"></div>
        <div class="skeleton skeleton-text" style="width: 90%;"></div>
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

/**
 * Fetches data from the API and updates the cache. It does not touch the DOM.
 * @returns The fetched data.
 */
async function fetchMeteosData() {
    if (isFetchingMeteos) return; // Prevent concurrent fetches
    isFetchingMeteos = true;
    try {
        const response = await fetch('/api/meteos', { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'La API devolvió un error.');
        }
        const data = await response.json();
        meteosCache = data; // Update cache on success
        return data;
    } catch (err) {
        console.error("Error fetching METEOS data:", err);
        // On background fail, we just log it and keep the old data.
        throw err; // Re-throw to be handled by the caller
    } finally {
        isFetchingMeteos = false;
    }
}

/**
 * Main function to render the Meteos page. It handles caching and triggers data fetching.
 * @param container The HTML element to render the page into.
 */
export function renderMeteos(container: HTMLElement) {
    container.classList.add('content-card');
    container.style.maxWidth = "1400px";

    // Attach event listeners only once per container instance
    if (!(container as any).__meteosListenersAttached) {
        initializeMeteosEventListeners(container);
        (container as any).__meteosListenersAttached = true;
    }
    
    // If we have cached data, display it immediately. No loading state.
    if (meteosCache) {
        container.innerHTML = renderBulletinHTML(meteosCache);
    } else {
        // First time load: show skeleton, then fetch and render.
        container.innerHTML = skeletonHTML;
        fetchMeteosData()
            .then(data => {
                if (data && document.body.contains(container)) {
                    container.innerHTML = renderBulletinHTML(data);
                }
            })
            .catch(err => {
                const errorMessage = err instanceof Error ? err.message : "Error desconocido al obtener datos meteorológicos.";
                if (document.body.contains(container)) {
                    container.innerHTML = `<p class="error" style="text-align: center; padding: 2rem;">${errorMessage}</p>`;
                }
            });
    }

    // Setup the background refresh interval, but only once for the lifetime of the app.
    if (!meteosIntervalId) {
        meteosIntervalId = window.setInterval(async () => {
            try {
                const newData = await fetchMeteosData();
                // If the user is currently on the meteos page, refresh its content transparently.
                const currentPage = document.querySelector<HTMLElement>('#page-4.active');
                if (currentPage && newData) {
                    currentPage.innerHTML = renderBulletinHTML(newData);
                }
            } catch (error) {
                // Background refresh failed. We keep the stale data and log the error.
                console.error("Meteos background refresh failed. Displaying stale data.");
            }
        }, REFRESH_INTERVAL);
    }
}

/**
 * Initializes event listeners for the Meteos page, primarily for copy buttons.
 * @param container The HTML element containing the Meteos page.
 */
function initializeMeteosEventListeners(container: HTMLElement) {
    // Event delegation for copy buttons
    container.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const copyBtn = target.closest<HTMLButtonElement>('.bulletin-copy-btn');
        if (copyBtn && meteosCache) {
            const cardId = copyBtn.dataset.cardId as keyof typeof meteosCache;
            const textToCopy = meteosCache[cardId];
            if (textToCopy) {
                handleCopy(textToCopy);
                const span = copyBtn.querySelector('span');
                if (span) {
                    const originalText = span.textContent;
                    span.textContent = '¡Copiado!';
                    copyBtn.disabled = true;
                    setTimeout(() => {
                        span.textContent = originalText;
                        copyBtn.disabled = false;
                    }, 2000);
                }
            }
        }
    });
}
