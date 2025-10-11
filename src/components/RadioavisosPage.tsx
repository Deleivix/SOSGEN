import { showToast } from "../utils/helpers";

type SalvamentoAviso = {
  num: string;
  emision: string;
  asunto: string;
  zona:string;
  tipo: string;
  subtipo: string;
  prioridad: string;
  caducidad: string;
  eventTarget: string;
};

let avisosCache: SalvamentoAviso[] = [];
let lastFetchTime: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function renderRadioavisos(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <div class="radioavisos-header">
                <h2 class="content-card-title">Radioavisos NAVTEX de Salvamento Marítimo</h2>
                <button id="radioavisos-refresh-btn" class="secondary-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
                    <span>Actualizar</span>
                </button>
            </div>
            <div class="radioavisos-filters">
                 <input type="search" id="radioavisos-search-input" class="phone-directory-search" placeholder="Buscar por asunto, zona, tipo...">
            </div>
            <div id="radioavisos-table-container">
                <!-- Table will be rendered here -->
            </div>
        </div>
    `;
    initializeRadioavisos(container);
}

function renderTable(avisos: SalvamentoAviso[]) {
    const container = document.getElementById('radioavisos-table-container');
    if (!container) return;

    if (avisos.length === 0) {
        container.innerHTML = `<p class="drill-placeholder">No se encontraron radioavisos.</p>`;
        return;
    }

    const tableHtml = `
        <table class="reference-table radioavisos-table">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Asunto</th>
                    <th>Zona</th>
                    <th>Tipo</th>
                    <th>Emisión</th>
                    <th>Caducidad</th>
                    <th>PDF</th>
                </tr>
            </thead>
            <tbody>
                ${avisos.map(aviso => `
                    <tr>
                        <td>${aviso.num}</td>
                        <td>${aviso.asunto}</td>
                        <td>${aviso.zona}</td>
                        <td>${aviso.tipo}</td>
                        <td>${aviso.emision}</td>
                        <td>${aviso.caducidad}</td>
                        <td>
                            <a href="/api/radioaviso-pdf?target=${encodeURIComponent(aviso.eventTarget)}" target="_blank" rel="noopener noreferrer" class="primary-btn-small" title="Ver PDF oficial">
                                Ver PDF
                            </a>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    container.innerHTML = tableHtml;
}

function renderSkeleton() {
     const container = document.getElementById('radioavisos-table-container');
    if (!container) return;
    const skeletonRow = `<tr>${Array(7).fill('<td><div class="skeleton skeleton-text"></div></td>').join('')}</tr>`;
    container.innerHTML = `
         <table class="reference-table radioavisos-table">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Asunto</th>
                    <th>Zona</th>
                    <th>Tipo</th>
                    <th>Emisión</th>
                    <th>Caducidad</th>
                    <th>PDF</th>
                </tr>
            </thead>
            <tbody>
                ${Array(10).fill(skeletonRow).join('')}
            </tbody>
        </table>
    `;
}

async function fetchAvisos() {
    const now = Date.now();
    if (avisosCache.length > 0 && (now - lastFetchTime < CACHE_DURATION_MS)) {
        return avisosCache;
    }

    renderSkeleton();
    const refreshBtn = document.getElementById('radioavisos-refresh-btn') as HTMLButtonElement;
    if(refreshBtn) refreshBtn.disabled = true;

    try {
        const response = await fetch('/api/salvamento-avisos');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Error al obtener los radioavisos.');
        }
        const data: SalvamentoAviso[] = await response.json();
        avisosCache = data;
        lastFetchTime = now;
        return data;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        showToast(message, 'error');
        const container = document.getElementById('radioavisos-table-container');
        if (container) container.innerHTML = `<p class="error">${message}</p>`;
        return [];
    } finally {
        if(refreshBtn) refreshBtn.disabled = false;
    }
}

async function initializeRadioavisos(container: HTMLElement) {
    const searchInput = document.getElementById('radioavisos-search-input') as HTMLInputElement;
    const refreshBtn = document.getElementById('radioavisos-refresh-btn') as HTMLButtonElement;

    const allAvisos = await fetchAvisos();
    renderTable(allAvisos);

    const filterAvisos = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (!searchTerm) {
            renderTable(avisosCache);
            return;
        }
        const filtered = avisosCache.filter(aviso => 
            Object.values(aviso).some(val => 
                String(val).toLowerCase().includes(searchTerm)
            )
        );
        renderTable(filtered);
    };

    searchInput.addEventListener('input', filterAvisos);
    
    refreshBtn.addEventListener('click', async () => {
        // Force refresh by clearing cache
        avisosCache = [];
        lastFetchTime = 0;
        const freshAvisos = await fetchAvisos();
        renderTable(freshAvisos);
        searchInput.value = ''; // Reset search
    });
}
