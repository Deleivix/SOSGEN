/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { ALL_STATIONS, STATIONS_VHF, STATIONS_MF } from "../data";
import { getCurrentUser } from "../utils/auth";
import { debounce, showToast } from "../utils/helpers";

// =================================================================================
// --- DATA TYPES & STATE MANAGEMENT ---
// =================================================================================

type SalvamentoAviso = {
  num: string;
  emision: string;
  asunto: string;
  zona: string;
  tipo: string;
  subtipo: string;
  prioridad: string;
  caducidad: string;
  eventTarget: string; // The ID needed to fetch the PDF
};

type NR = {
    id: string; // e.g., "2013/2024"
    version: number;
    fullId: string; // e.g., "NR-2013/2024-1"
    stations: string[];
    expiryDate: string; // YYYY-MM-DD
    expiryTime: string; // HH:MM in UTC
    isAmpliado: boolean;
    isCaducado: boolean;
};
type HistoryLog = {
    id: string;
    timestamp: string;
    user: string;
    action: 'AÑADIDO' | 'EDITADO' | 'BORRADO' | 'CANCELADO';
    nrId: string; // Base ID, e.g., "2013/2024"
    details: string;
};
type AppData = {
    nrs: NR[];
    history: HistoryLog[];
};
type View = 'INICIO' | 'AÑADIR' | 'EDITAR' | 'BORRAR' | 'BD' | 'HISTORIAL';
type SortDirection = 'ascending' | 'descending';
type SortConfig<T> = { key: keyof T; direction: SortDirection };


// --- Component-level State ---
let appData: AppData = { nrs: [], history: [] };
let isAppDataLoading = true;
let appDataError: string | null = null;
let currentView: View = 'INICIO';
let componentContainer: HTMLElement | null = null;
// --- State for Salvamento Panel ---
let salvamentoAvisos: SalvamentoAviso[] = [];
let isSalvamentoLoading = false;
let salvamentoError: string | null = null;
let lastSalvamentoUpdate: Date | null = null;
let salvamentoFilterText = '';
let salvamentoSortConfig: SortConfig<SalvamentoAviso> = { key: 'emision', direction: 'descending' };
// --- State for Tables ---
let nrFilterText = '';
let historyFilterText = '';
let nrSortConfig: SortConfig<NR> = { key: 'id', direction: 'ascending' };
let historySortConfig: SortConfig<HistoryLog> = { key: 'timestamp', direction: 'descending' };


// =================================================================================
// --- API LAYER ---
// =================================================================================

const api = {
    getData: async (): Promise<AppData> => {
        const response = await fetch('/api/radioavisos');
        if (!response.ok) throw new Error('No se pudo obtener la información del servidor.');
        return response.json();
    },
    saveData: async (data: AppData): Promise<void> => {
        const response = await fetch('/api/radioavisos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('No se pudo guardar la información en el servidor.');
    },
};

// =================================================================================
// --- HELPER FUNCTIONS ---
// =================================================================================

const getFormattedDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
    } catch {
        return isoString;
    }
};

// =================================================================================
// --- SALVAMENTO MARÍTIMO PANEL ---
// =================================================================================

async function fetchAndRenderSalvamentoAvisos() {
    isSalvamentoLoading = true;
    salvamentoError = null;
    
    const panelContainer = document.getElementById('salvamento-panel-container');
    if (panelContainer) panelContainer.innerHTML = renderSalvamentoPanelHTML();

    try {
        const response = await fetch('/api/salvamento-avisos');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Respuesta no válida del servidor.');
        }
        salvamentoAvisos = await response.json();
        lastSalvamentoUpdate = new Date();
    } catch (e) {
        salvamentoAvisos = [];
        console.error("Salvamento Fetch Error:", e);
        salvamentoError = 'No se pudo conectar con la fuente oficial de Salvamento Marítimo. Por favor, inténtelo de nuevo más tarde.';
    } finally {
        isSalvamentoLoading = false;
        const panelContainer = document.getElementById('salvamento-panel-container');
        if (panelContainer) panelContainer.innerHTML = renderSalvamentoPanelHTML();
    }
}

function renderSalvamentoPanelHTML(): string {
    const spinnerIcon = `<svg class="spinner" style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    const refreshIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>`;

    let content;
    if (isSalvamentoLoading) {
        content = `<div class="loader-container"><div class="loader"></div></div>`;
    } else if (salvamentoError) {
        content = `<p class="error" style="padding: 1rem; text-align: center;">${salvamentoError}</p>`;
    } else if (salvamentoAvisos.length === 0) {
        content = `<p class="drill-placeholder">No hay radioavisos disponibles en la fuente oficial.</p>`;
    } else {
        const ZONAS_FILTRADAS = ['ESPAÑA COSTA N', 'ESPAÑA COSTA NW', 'CORUÑA'];
        const searchTerm = salvamentoFilterText.toLowerCase();

        const filteredAvisos = salvamentoAvisos
            .filter(aviso => ZONAS_FILTRADAS.some(zona => aviso.zona.includes(zona)))
            .filter(aviso => 
                aviso.num.toLowerCase().includes(searchTerm) ||
                aviso.asunto.toLowerCase().includes(searchTerm) ||
                aviso.zona.toLowerCase().includes(searchTerm)
            );

        const sortedAvisos = [...filteredAvisos].sort((a, b) => {
            const key = salvamentoSortConfig.key;
            const aValue = a[key] || '';
            const bValue = b[key] || '';
            const comparison = aValue.localeCompare(bValue, undefined, { numeric: true });
            return salvamentoSortConfig.direction === 'ascending' ? comparison : -comparison;
        });

        const renderHeader = (key: keyof SalvamentoAviso, label: string) => {
            const isSorted = salvamentoSortConfig.key === key;
            const sortClass = isSorted ? `sort-${salvamentoSortConfig.direction}` : '';
            return `<th class="${sortClass}" data-sort-key="${key}" data-table="salvamento">${label}</th>`;
        };

        if (sortedAvisos.length === 0) {
            content = `
                <div class="filterable-table-header">
                    <input type="search" class="filter-input" placeholder="Filtrar por número, asunto o zona..." value="${salvamentoFilterText}" data-action="filter" data-filter-target="salvamento">
                </div>
                <p class="drill-placeholder">No hay radioavisos para los filtros aplicados.</p>
            `;
        } else {
            content = `
                <div class="filterable-table-header">
                     <input type="search" class="filter-input" placeholder="Filtrar por número, asunto o zona..." value="${salvamentoFilterText}" data-action="filter" data-filter-target="salvamento">
                </div>
                <div class="table-wrapper">
                    <table class="reference-table">
                        <thead>
                            <tr>
                                ${renderHeader('num', 'Num.')}
                                ${renderHeader('emision', 'Emisión')}
                                ${renderHeader('asunto', 'Asunto')}
                                ${renderHeader('zona', 'Zona')}
                                ${renderHeader('prioridad', 'Prioridad')}
                                ${renderHeader('caducidad', 'Caducidad')}
                            </tr>
                        </thead>
                        <tbody>
                        ${sortedAvisos.map(aviso => `
                            <tr>
                                <td>${aviso.num}</td>
                                <td>${aviso.emision}</td>
                                <td style="white-space: normal; min-width: 250px;">${aviso.asunto}</td>
                                <td style="min-width: 150px;">${aviso.zona}</td>
                                <td><span class="category-badge ${aviso.prioridad.toLowerCase()}">${aviso.prioridad}</span></td>
                                <td>${aviso.caducidad}</td>
                            </tr>
                        `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    return `
        <div class="salvamento-panel">
            <div class="salvamento-panel-header">
                <div>
                    <h3>Radioavisos Oficiales (Zonas N, NW, Coruña)</h3>
                    <a href="https://radioavisos.salvamentomaritimo.es/" target="_blank" rel="noopener noreferrer">
                        Ver fuente oficial
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/><path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>
                    </a>
                </div>
                <div class="salvamento-panel-controls">
                    ${lastSalvamentoUpdate ? `<span class="last-update-text">${getFormattedDateTime(lastSalvamentoUpdate.toISOString())}</span>` : ''}
                    <button class="secondary-btn" data-action="refresh-salvamento" ${isSalvamentoLoading ? 'disabled' : ''}>
                        ${isSalvamentoLoading ? spinnerIcon : refreshIcon}
                        <span>${isSalvamentoLoading ? 'Actualizando...' : 'Actualizar'}</span>
                    </button>
                </div>
            </div>
            ${content}
        </div>
    `;
}

// =================================================================================
// --- CORE RENDERING LOGIC ---
// =================================================================================

async function loadInitialData() {
    isAppDataLoading = true;
    appDataError = null;
    await reRender();
    
    try {
        appData = await api.getData();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        appDataError = message;
    } finally {
        isAppDataLoading = false;
        await reRender();
    }
}

async function reRender() {
    if (!componentContainer) return;
    const activeElementId = document.activeElement?.id;
    
    componentContainer.innerHTML = renderPageContent();

    const activeElement = activeElementId ? document.getElementById(activeElementId) : null;
    if (activeElement instanceof HTMLElement) {
        activeElement.focus();
    }
}

export function renderRadioavisos(container: HTMLElement) {
    componentContainer = container;
    const user = getCurrentUser();

    if (!user) {
        container.innerHTML = `<div class="content-card"><p class="error">Debe iniciar sesión para acceder a esta herramienta.</p></div>`;
        return;
    }
    
    if (!(container as any).__radioavisosListenersAttached) {
        attachEventListeners(container);
        (container as any).__radioavisosListenersAttached = true;
    }
    
    loadInitialData();
    fetchAndRenderSalvamentoAvisos();
}

function renderPageContent(): string {
    const user = getCurrentUser();
    if (!user) return `<div class="content-card"><p class="error">Error de autenticación. Por favor, inicie sesión de nuevo.</p></div>`;

    if (isAppDataLoading) {
        return `<div class="content-card"><div class="loader-container"><div class="loader"></div></div></div>`;
    }

    if (appDataError) {
        return `<div class="content-card"><p class="error">${appDataError}</p></div>`;
    }
    
    const views: { id: View, name: string }[] = [
        { id: 'INICIO', name: 'Inicio' }, { id: 'AÑADIR', name: 'Añadir' },
        { id: 'EDITAR', name: 'Editar' }, { id: 'BORRAR', name: 'Borrar/Cancelar' },
        { id: 'BD', name: 'Base de Datos' }, { id: 'HISTORIAL', name: 'Historial' }
    ];

    return `
        <div id="salvamento-panel-container">
            ${renderSalvamentoPanelHTML()}
        </div>

        <div class="content-card" style="max-width: 1400px; margin-top: 2rem;">
            <div class="form-divider" style="width: 100%; margin: -0.5rem auto 1.5rem auto;">
                <span>Gestor Local</span>
            </div>

            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                <h2 class="content-card-title" style="margin: 0; padding: 0; border: none;">Gestor de Radioavisos (NR)</h2>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <button class="secondary-btn" data-action="import">Importar</button>
                    <input type="file" accept=".json" class="file-input-hidden" style="display: none;" />
                    <button class="secondary-btn" data-action="export">Exportar</button>
                    <div style="font-size: 0.9rem; background-color: var(--bg-main); padding: 0.5rem 1rem; border-radius: 6px;">
                        <strong>Usuario:</strong> ${user.username}
                    </div>
                </div>
            </div>

            <div class="info-nav-tabs">
                ${views.map(v => `<button class="info-nav-btn ${currentView === v.id ? 'active' : ''}" data-view="${v.id}" data-action="switch-view">${v.name}</button>`).join('')}
            </div>

            <div id="radioavisos-view-content" style="margin-top: 2rem;">
                ${renderCurrentViewContent()}
            </div>
        </div>
    `;
}


// =================================================================================
// --- EVENT HANDLING ---
// =================================================================================

function attachEventListeners(container: HTMLElement) {
    container.addEventListener('click', handleDelegatedClick);
    
    const debouncedFilter = debounce(async (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.dataset.filterTarget === 'nrs') {
            nrFilterText = input.value;
        } else if (input.dataset.filterTarget === 'history') {
            historyFilterText = input.value;
        } else if (input.dataset.filterTarget === 'salvamento') {
            salvamentoFilterText = input.value;
            const panelContainer = document.getElementById('salvamento-panel-container');
            if(panelContainer) panelContainer.innerHTML = renderSalvamentoPanelHTML();
            return;
        }
        await reRender();
    }, 300);

    container.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.dataset.action === 'filter') {
            debouncedFilter(e);
        }
    });
    
    container.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.id === 'add-is-versionado') {
            const versionedInput = document.getElementById('add-versioned-id-container');
            if (versionedInput) versionedInput.style.display = target.checked ? 'block' : 'none';
        }
        if (target.id === 'add-has-expiry') {
            const expiryInputs = document.getElementById('add-expiry-inputs');
            if (expiryInputs) expiryInputs.style.display = target.checked ? 'flex' : 'none';
        }
        if (target.classList.contains('file-input-hidden')) {
            handleFileChange(e);
        }
    });
}

async function handleDelegatedClick(e: Event) {
    const target = e.target as HTMLElement;

    const actionElement = target.closest<HTMLElement>('[data-action]');
    if (!actionElement) return;

    const action = actionElement.dataset.action;

    const sortTh = target.closest<HTMLTableCellElement>('th[data-sort-key]');
    if (sortTh) {
        const key = sortTh.dataset.sortKey;
        const targetTable = sortTh.dataset.table;
        if (key) {
            if (targetTable === 'nrs') {
                const isSameKey = nrSortConfig.key === key;
                nrSortConfig = {
                    key: key as keyof NR,
                    direction: isSameKey && nrSortConfig.direction === 'ascending' ? 'descending' : 'ascending',
                };
            } else if (targetTable === 'history') {
                const isSameKey = historySortConfig.key === key;
                historySortConfig = {
                    key: key as keyof HistoryLog,
                    direction: isSameKey && historySortConfig.direction === 'ascending' ? 'descending' : 'ascending',
                };
            } else if (targetTable === 'salvamento') {
                const isSameKey = salvamentoSortConfig.key === key;
                salvamentoSortConfig = {
                    key: key as keyof SalvamentoAviso,
                    direction: isSameKey && salvamentoSortConfig.direction === 'ascending' ? 'descending' : 'ascending',
                };
                 const panelContainer = document.getElementById('salvamento-panel-container');
                 if (panelContainer) panelContainer.innerHTML = renderSalvamentoPanelHTML();
                 return; 
            }
            await reRender();
        }
        return;
    }


    switch(action) {
        case 'refresh-salvamento': fetchAndRenderSalvamentoAvisos(); break;
        case 'switch-view':
            currentView = actionElement.dataset.view as View;
            await reRender();
            break;
        case 'import':
            componentContainer?.querySelector<HTMLInputElement>('.file-input-hidden')?.click();
            break;
        case 'export': handleExport(); break;
        case 'add-submit': await handleAddSubmit(); break;
        case 'add-clear': currentView = 'AÑADIR'; await reRender(); break;
        case 'edit-search': await handleEditSearch(); break;
        case 'edit-save': await handleEditSave(); break;
        case 'delete-nr': await handleDeleteNR(); break;
        case 'cancel-nr': await handleCancelNR(); break;
    }
}

async function handleAddSubmit() {
    const user = getCurrentUser();
    if (!user) return showToast("Error de sesión. Por favor, inicie sesión de nuevo.", "error");
    if (!componentContainer) return;

    try {
        let currentData = appData;

        const nrNum = (componentContainer.querySelector('#add-nr-num') as HTMLInputElement).value.trim();
        const nrYear = (componentContainer.querySelector('#add-nr-year') as HTMLInputElement).value.trim();
        if (!nrNum || !nrYear) { return showToast("El número y el año del NR son obligatorios.", "error"); }
        const nrId = `${nrNum}/${nrYear}`;

        const stations = Array.from(componentContainer.querySelectorAll<HTMLInputElement>('#add-stations-group input:checked')).map(cb => cb.value);
        if (stations.length === 0) { return showToast("Debe seleccionar al menos una estación.", "error"); }

        const versionadoCheckbox = componentContainer.querySelector('#add-is-versionado') as HTMLInputElement;
        const versionedFrom = versionadoCheckbox.checked ? (componentContainer.querySelector('#add-versioned-id') as HTMLInputElement).value.trim() : undefined;
        
        if (currentData.nrs.some(nr => nr.id === nrId && !nr.isCaducado && !versionedFrom)) {
            return showToast(`Error: El NR-${nrId} ya existe y está vigente. Para crear una nueva versión, marque la casilla 'Versionado'.`, "error");
        }

        let version = 1;
        let nrsToUpdate = [...currentData.nrs];
        if (versionedFrom) {
            const previousVersions = nrsToUpdate.filter(nr => nr.id === versionedFrom);
            if (previousVersions.length > 0) {
                version = Math.max(...previousVersions.map(nr => nr.version)) + 1;
                nrsToUpdate = nrsToUpdate.map(nr => nr.id === versionedFrom ? { ...nr, isCaducado: true } : nr);
                currentData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'CANCELADO', nrId: versionedFrom, details: `Versionado a NR-${nrId}-${version}`});
            }
        }
        
        const expiryCheckbox = componentContainer.querySelector('#add-has-expiry') as HTMLInputElement;
        const newNR: NR = {
            id: nrId, version, fullId: `NR-${nrId}-${version}`, stations,
            expiryDate: expiryCheckbox.checked ? (componentContainer.querySelector('#add-expiry-date') as HTMLInputElement).value : '',
            expiryTime: expiryCheckbox.checked ? (componentContainer.querySelector('#add-expiry-time') as HTMLInputElement).value : '',
            isAmpliado: (componentContainer.querySelector('#add-is-ampliado') as HTMLInputElement).checked,
            isCaducado: false
        };

        const finalData: AppData = {
            nrs: [...nrsToUpdate, newNR],
            history: [
                { id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'AÑADIDO', nrId, details: `Añadida versión ${version} a ${stations.length} estaciones.` },
                ...currentData.history
            ]
        };

        await api.saveData(finalData);
        appData = finalData;
        showToast(`NR-${nrId}-${version} añadido.`, 'success');
        currentView = 'INICIO';
        await reRender();

    } catch (error) { 
        showToast("Error al guardar: " + (error instanceof Error ? error.message : "Error desconocido"), "error");
    }
}

async function handleEditSave() {
    const user = getCurrentUser();
    if (!user) return showToast("Error de sesión. Por favor, inicie sesión de nuevo.", "error");
    if (!componentContainer) return;

    const formContainer = componentContainer.querySelector('#edit-form-container') as HTMLElement;
    const fullId = formContainer.dataset.fullId;
    if (!fullId) return;

    try {
        let currentData = appData;
        const nrToUpdate = currentData.nrs.find(nr => nr.fullId === fullId);
        if (!nrToUpdate) {
            showToast("El NR que intenta editar ya no existe.", "error");
            currentView = 'INICIO';
            await loadInitialData(); // Re-sync with server
            return;
        }

        const updatedStations = Array.from(componentContainer.querySelectorAll<HTMLInputElement>('#edit-stations-group input:checked')).map(cb => cb.value);
        const updatedNrs = currentData.nrs.map(nr => nr.fullId === fullId ? {
            ...nr,
            expiryDate: (componentContainer.querySelector('#edit-expiry-date') as HTMLInputElement).value,
            expiryTime: (componentContainer.querySelector('#edit-expiry-time') as HTMLInputElement).value,
            isAmpliado: (componentContainer.querySelector('#edit-is-ampliado') as HTMLInputElement).checked,
            stations: updatedStations,
        } : nr);

        const updatedHistory = [
            { id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'EDITADO', nrId: nrToUpdate.id, details: `Editada versión ${nrToUpdate.version}.` },
            ...currentData.history
        ];

        const finalData: AppData = { nrs: updatedNrs, history: updatedHistory };
        await api.saveData(finalData);
        appData = finalData;
        showToast(`NR-${nrToUpdate.id} actualizado.`, 'success');
        currentView = 'INICIO';
        await reRender();

    } catch (error) { 
        showToast("Error al guardar la edición: " + (error instanceof Error ? error.message : "Error desconocido"), "error");
    }
}

async function handleDeleteNR() {
    const user = getCurrentUser();
    if (!user) return showToast("Error de sesión. Por favor, inicie sesión de nuevo.", "error");
    if (!componentContainer) return;

    const nrId = (componentContainer.querySelector('#delete-nr-id') as HTMLInputElement).value.trim();
    if (!nrId) return;

    try {
        let currentData = appData;
        if (!currentData.nrs.some(nr => nr.id === nrId)) { return showToast(`El NR-${nrId} no existe.`, "error"); }
        
        if (window.confirm(`¡ADVERTENCIA!\n\nEstá a punto de ELIMINAR permanentemente el NR-${nrId} y todas sus versiones.\nEsta acción no se puede deshacer. ¿Continuar?`)) {
            const finalData: AppData = {
                nrs: currentData.nrs.filter(nr => nr.id !== nrId),
                history: [
                    { id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'BORRADO', nrId: nrId, details: `Eliminado permanentemente.` },
                    ...currentData.history
                ]
            };
            await api.saveData(finalData);
            appData = finalData;
            showToast(`NR-${nrId} ha sido eliminado.`, 'info');
            currentView = 'INICIO';
            await reRender();
        }
    } catch (error) {
        showToast("Error al eliminar: " + (error instanceof Error ? error.message : "Error desconocido"), "error");
    }
}

async function handleCancelNR() {
    const user = getCurrentUser();
    if (!user) return showToast("Error de sesión. Por favor, inicie sesión de nuevo.", "error");
    if (!componentContainer) return;

    const nrId = (componentContainer.querySelector('#delete-nr-id') as HTMLInputElement).value.trim();
    if (!nrId) return;
    
    try {
        let currentData = appData;
        if (!currentData.nrs.some(nr => nr.id === nrId && !nr.isCaducado)) { return showToast(`El NR-${nrId} no existe o ya está cancelado.`, "error"); }
        
        if (window.confirm(`¿Está seguro de que desea CANCELAR todas las versiones vigentes del NR-${nrId}?`)) {
            const finalData: AppData = {
                nrs: currentData.nrs.map(nr => nr.id === nrId ? {...nr, isCaducado: true} : nr),
                history: [
                    {id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'CANCELADO', nrId: nrId, details: `Marcado como caducado.`},
                    ...currentData.history
                ]
            };
            await api.saveData(finalData);
            appData = finalData;
            showToast(`NR-${nrId} ha sido cancelado.`, 'info');
            currentView = 'INICIO';
            await reRender();
        }
    } catch (error) {
        showToast("Error al cancelar: " + (error instanceof Error ? error.message : "Error desconocido"), "error");
    }
}

async function handleEditSearch() {
    if (!componentContainer) return;
    const searchInput = componentContainer.querySelector('#edit-search-id') as HTMLInputElement;
    const formContainer = componentContainer.querySelector('#edit-form-container') as HTMLElement;
    const searchId = searchInput.value.trim();

    try {
        let currentData = appData;
        const foundNRs = currentData.nrs.filter(nr => nr.id === searchId && !nr.isCaducado);
        
        if (foundNRs.length > 0) {
            const latestVersion = foundNRs.sort((a, b) => b.version - a.version)[0];
            formContainer.dataset.fullId = latestVersion.fullId;
            (componentContainer.querySelector('#edit-expiry-date') as HTMLInputElement).value = latestVersion.expiryDate;
            (componentContainer.querySelector('#edit-expiry-time') as HTMLInputElement).value = latestVersion.expiryTime;
            (componentContainer.querySelector('#edit-is-ampliado') as HTMLInputElement).checked = latestVersion.isAmpliado;
            componentContainer.querySelectorAll<HTMLInputElement>('#edit-stations-group input').forEach(cb => {
                cb.checked = latestVersion.stations.includes(cb.value);
            });
            formContainer.style.display = 'block';
        } else {
            showToast(`NR-${searchId} no encontrado o está cancelado.`, 'info');
            formContainer.style.display = 'none';
        }
    } catch (error) {
        showToast("Error al buscar: " + (error instanceof Error ? error.message : "Error desconocido"), "error");
    }
}


function handleExport() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `radioavisos_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!window.confirm("¡ADVERTENCIA!\n\nImportar un archivo reemplazará TODOS los datos actuales en el servidor.\n¿Continuar?")) {
        if (input) input.value = ""; return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const parsedData = JSON.parse(e.target?.result as string);
            if (!Array.isArray(parsedData.nrs) || !Array.isArray(parsedData.history)) throw new Error("Formato de archivo incorrecto.");
            
            // FIX: The 'action' property from parsed JSON is a generic `string`, which is not assignable
            // to the specific string literal type `HistoryLog['action']`.
            // A double cast is used to bypass this strict type check, assuming the imported data is valid.
            const dataToProcess: AppData = parsedData as unknown as AppData;
            
            await api.saveData(dataToProcess);
            appData = dataToProcess;
            showToast("Datos importados y guardados.", 'success');
            await reRender();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            showToast(`Error al importar: ${message}`, 'error');
        } finally {
            if (input) input.value = "";
        }
    };
    reader.readAsText(file);
}

// =================================================================================
// --- HTML TEMPLATES FOR VIEWS ---
// =================================================================================

function renderCurrentViewContent(): string {
    switch (currentView) {
        case 'INICIO': return renderMainView();
        case 'AÑADIR': return renderAddView();
        case 'EDITAR': return renderEditView();
        case 'BORRAR': return renderDeleteView();
        case 'BD': return renderDbView();
        case 'HISTORIAL': return renderHistoryView();
        default: return `<p>Vista no encontrada</p>`;
    }
}

function renderMainView(): string {
    const lastAction = (action: HistoryLog['action']) => [...appData.history].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).find(h => h.action === action);
    const lastAdded = lastAction('AÑADIDO');
    const lastEdited = lastAction('EDITADO');
    const lastDeleted = lastAction('BORRADO');
    const activeNRs = appData.nrs.filter(nr => !nr.isCaducado);

    const vhfNrsByStation = STATIONS_VHF.reduce((acc, station) => {
        (acc as any)[station] = activeNRs.filter(nr => nr.stations.includes(station)).map(nr => `NR-${nr.id}`);
        return acc;
    }, {});
    const maxVhfNrs = Math.max(0, ...Object.values(vhfNrsByStation).map((arr: any) => arr.length));

    const mfNrsByStation = STATIONS_MF.reduce((acc, station) => {
        (acc as any)[station] = activeNRs.filter(nr => nr.stations.includes(station)).map(nr => `NR-${nr.id}`);
        return acc;
    }, {});
    const maxMfNrs = Math.max(0, ...Object.values(mfNrsByStation).map((arr: any) => arr.length));
    
    return `
        <div class="station-tables">
            <div class="station-table-container">
                <h3>Estaciones VHF</h3>
                <div class="table-wrapper">
                    <table class="station-table horizontal-table reference-table">
                        <thead><tr>${STATIONS_VHF.map(s => `<th>${s.replace(' VHF', '')}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${maxVhfNrs === 0 ? `<tr><td colspan="${STATIONS_VHF.length}" class="drill-placeholder" style="padding: 1rem;">No hay NRs vigentes.</td></tr>` : 
                            Array.from({ length: maxVhfNrs }).map((_, r) => `<tr>${STATIONS_VHF.map(s => `<td>${(vhfNrsByStation as any)[s]?.[r] || ''}</td>`).join('')}</tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="station-table-container">
                <h3>Estaciones MF</h3>
                <div class="table-wrapper">
                    <table class="station-table horizontal-table reference-table">
                         <thead><tr>${STATIONS_MF.map(s => `<th>${s.replace(' MF', '')}</th>`).join('')}</tr></thead>
                         <tbody>
                            ${maxMfNrs === 0 ? `<tr><td colspan="${STATIONS_MF.length}" class="drill-placeholder" style="padding: 1rem;">No hay NRs vigentes.</td></tr>` :
                            Array.from({ length: maxMfNrs }).map((_, r) => `<tr>${STATIONS_MF.map(s => `<td>${(mfNrsByStation as any)[s]?.[r] || ''}</td>`).join('')}</tr>`).join('')}
                         </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="label">Total NRs vigentes:</div><div class="value green">${activeNRs.length}</div></div>
            <div class="stat-card"><div class="label">Último NR añadido:</div><div class="value">${lastAdded ? `NR-${lastAdded.nrId}` : '-'}</div><small>Por: ${lastAdded?.user || '-'}</small></div>
             <div class="stat-card"><div class="label">Último NR editado:</div><div class="value">${lastEdited ? `NR-${lastEdited.nrId}` : '-'}</div><small>Por: ${lastEdited?.user || '-'}</small></div>
            <div class="stat-card"><div class="label">Último NR borrado:</div><div class="value red">${lastDeleted ? `NR-${lastDeleted.nrId}` : '-'}</div><small>Por: ${lastDeleted?.user || '-'}</small></div>
        </div>
    `;
}

function renderAddView(): string {
    const currentYear = new Date().getFullYear();
    return `
        <div class="form-grid">
            <div class="form-group" style="flex-direction: row; gap: 1rem; align-items: flex-end;">
                <div style="flex:1;"><label for="add-nr-num">NR (Número)</label><input type="text" id="add-nr-num" placeholder="2013" class="simulator-input" /></div>
                <span style="font-size: 1.5rem;">/</span>
                <div style="flex:1;"><label for="add-nr-year">Año</label><input type="text" id="add-nr-year" value="${currentYear}" class="simulator-input" /></div>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="add-is-versionado" /> Versionado de un NR anterior</label>
                <div id="add-versioned-id-container" style="display:none;">
                    <input type="text" id="add-versioned-id" placeholder="ID anterior (ej: 1550/2024)" class="simulator-input"/>
                </div>
            </div>
            <div class="form-group"><label><input type="checkbox" id="add-has-expiry" checked /> Fecha Caducidad (UTC)</label><div id="add-expiry-inputs" style="display:flex; gap: 1rem;"><input type="date" id="add-expiry-date" class="simulator-input" /><input type="time" id="add-expiry-time" class="simulator-input" /></div></div>
            <div class="form-group"><label><input type="checkbox" id="add-is-ampliado" /> NR Ampliado</label></div>
        </div>
        <h3 class="reference-table-subtitle" style="margin-top: 2rem;">Marque las EECC:</h3>
        <div class="checkbox-group" id="add-stations-group">
            ${ALL_STATIONS.map(station => `<div class="checkbox-item"><input type="checkbox" id="add-${station}" value="${station}"><label for="add-${station}">${station}</label></div>`).join('')}
        </div>
        <div class="button-container">
            <button class="primary-btn" data-action="add-submit" style="margin-top:0;">GUARDAR</button>
            <button class="secondary-btn" data-action="add-clear">LIMPIAR</button>
        </div>
    `;
}

function renderEditView(): string {
     return `
        <div class="form-group" style="display: flex; align-items: flex-end; gap: 1rem;">
            <div style="flex-grow: 1;"><label for="edit-search-id">Buscar NR por ID (ej: 2013/2024)</label><input type="text" id="edit-search-id" placeholder="ID del NR, sin versión" class="simulator-input"/></div>
            <button class="primary-btn" data-action="edit-search" style="margin-top:0;">BUSCAR</button>
        </div>
        <div id="edit-form-container" style="display:none;">
            <div class="form-divider" style="width: 100%; margin: 2rem auto;"></div>
            <div class="form-grid">
                <div class="form-group"><label for="edit-expiry-date">Fecha Caducidad (UTC)</label><input type="date" id="edit-expiry-date" class="simulator-input" /></div>
                <div class="form-group"><label for="edit-expiry-time">Hora Caducidad (UTC)</label><input type="time" id="edit-expiry-time" class="simulator-input" /></div>
                <div class="form-group" style="justify-content: center;"><label><input type="checkbox" id="edit-is-ampliado" /> NR Ampliado</label></div>
            </div>
            <h3 class="reference-table-subtitle" style="margin-top: 2rem;">Marque las EECC:</h3>
            <div class="checkbox-group" id="edit-stations-group">
                ${ALL_STATIONS.map(s => `<div class="checkbox-item"><input type="checkbox" id="edit-${s}" value="${s}"><label for="edit-${s}">${s}</label></div>`).join('')}
            </div>
            <div class="button-container">
                <button class="primary-btn" data-action="edit-save" style="margin-top:0;">GUARDAR CAMBIOS</button>
            </div>
        </div>
    `;
}

function renderDeleteView(): string {
    return `
        <div class="form-group">
            <label for="delete-nr-id">ID del NR a Borrar o Cancelar (ej: 2013/2024)</label>
            <input type="text" id="delete-nr-id" class="simulator-input"/>
        </div>
        <div class="warning-box">
            <h3>¡ADVERTENCIA!</h3>
            <p><b>ELIMINAR:</b> Borra el NR y todas sus versiones permanentemente del sistema. No se podrá recuperar.</p>
            <p><b>CANCELAR:</b> Marca el NR como caducado, pero mantiene su registro. Es la opción recomendada.</p>
        </div>
        <div class="button-container">
            <button class="tertiary-btn" data-action="delete-nr">ELIMINAR</button>
            <button class="secondary-btn" data-action="cancel-nr" style="color: #d46b08; border-color: #d46b08;">CANCELAR</button>
        </div>
    `;
}

function renderDbView(): string {
    const searchTerm = nrFilterText.toLowerCase();
    const filteredNrs = appData.nrs.filter(nr => 
        nr.id.toLowerCase().includes(searchTerm) ||
        nr.fullId.toLowerCase().includes(searchTerm) ||
        (nr.expiryDate && nr.expiryDate.includes(searchTerm))
    );

    const sortedNrs = [...filteredNrs].sort((a, b) => {
        const key = nrSortConfig.key;
        const aValue = a[key];
        const bValue = b[key];
        
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
            comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
        }

        return nrSortConfig.direction === 'ascending' ? comparison : -comparison;
    });

    if (sortedNrs.length === 0) {
        return `
            <div class="filterable-table-header">
                <input type="search" class="filter-input" placeholder="Filtrar NRs..." value="${nrFilterText}" data-action="filter" data-filter-target="nrs">
            </div>
            <p class="drill-placeholder">No se encontraron NRs.</p>`;
    }

    const renderHeader = (key: keyof NR, label: string) => {
        const isSorted = nrSortConfig.key === key;
        const sortClass = isSorted ? `sort-${nrSortConfig.direction}` : '';
        return `<th class="${sortClass}" data-sort-key="${key}" data-table="nrs">${label}</th>`;
    };

    return `
        <div class="filterable-table-header">
            <input type="search" class="filter-input" placeholder="Filtrar NRs..." value="${nrFilterText}" data-action="filter" data-filter-target="nrs">
        </div>
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead>
                    <tr>
                        ${renderHeader('id', 'NR')}
                        ${renderHeader('version', 'Versión')}
                        ${renderHeader('expiryDate', 'Caducidad (UTC)')}
                        <th>EECC</th>
                        ${renderHeader('isAmpliado', 'Ampliado')}
                        ${renderHeader('isCaducado', 'Caducado')}
                    </tr>
                </thead>
                <tbody>
                    ${sortedNrs.map(nr => `
                        <tr style="${nr.isCaducado ? 'opacity: 0.5;' : ''}">
                            <td>NR-${nr.id}</td>
                            <td>v${nr.version}</td>
                            <td>${nr.expiryDate || 'N/A'} ${nr.expiryTime || ''}</td>
                            <td>${nr.stations.length}</td>
                            <td class="${nr.isAmpliado ? 'true-cell' : 'false-cell'}">${nr.isAmpliado ? '✔' : '✖'}</td>
                            <td class="${nr.isCaducado ? 'true-cell' : 'false-cell'}">${nr.isCaducado ? '✔' : '✖'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderHistoryView(): string {
    const searchTerm = historyFilterText.toLowerCase();
    const filteredHistory = appData.history.filter(log =>
        log.nrId.toLowerCase().includes(searchTerm) ||
        log.user.toLowerCase().includes(searchTerm) ||
        log.action.toLowerCase().includes(searchTerm) ||
        log.details.toLowerCase().includes(searchTerm)
    );

     const sortedHistory = [...filteredHistory].sort((a, b) => {
        const key = historySortConfig.key;
        const aValue = a[key];
        const bValue = b[key];
        
        let comparison = 0;
        if (key === 'timestamp') {
            comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
        } else {
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                comparison = aValue.localeCompare(bValue);
            }
        }

        return historySortConfig.direction === 'ascending' ? comparison : -comparison;
    });

    if (sortedHistory.length === 0) {
        return `
            <div class="filterable-table-header">
                <input type="search" class="filter-input" placeholder="Filtrar historial..." value="${historyFilterText}" data-action="filter" data-filter-target="history">
            </div>
            <p class="drill-placeholder">No hay operaciones registradas.</p>`;
    }
    
    const renderHeader = (key: keyof HistoryLog, label: string) => {
        const isSorted = historySortConfig.key === key;
        const sortClass = isSorted ? `sort-${historySortConfig.direction}` : '';
        return `<th class="${sortClass}" data-sort-key="${key}" data-table="history">${label}</th>`;
    };

    return `
        <div class="filterable-table-header">
            <input type="search" class="filter-input" placeholder="Filtrar historial..." value="${historyFilterText}" data-action="filter" data-filter-target="history">
        </div>
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead>
                    <tr>
                        ${renderHeader('nrId', 'NR')}
                        ${renderHeader('timestamp', 'F/H Acción')}
                        ${renderHeader('user', 'Usuario')}
                        ${renderHeader('action', 'Acción')}
                        ${renderHeader('details', 'Detalles')}
                    </tr>
                </thead>
                <tbody>
                    ${sortedHistory.map(log => `
                        <tr>
                            <td>NR-${log.nrId}</td>
                            <td>${getFormattedDateTime(log.timestamp)}</td>
                            <td>${log.user}</td>
                            <td>${log.action}</td>
                            <td>${log.details}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
