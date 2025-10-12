

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { ALL_STATIONS, STATIONS_VHF, STATIONS_MF } from "../data";
import { getCurrentUser } from "../utils/auth";
import { debounce, showToast } from "../utils/helpers";

// =================================================================================
// --- DATA TYPES & STATE ---
// =================================================================================

type SalvamentoAviso = {
  num: string; emision: string; asunto: string; zona: string;
  tipo: string; subtipo: string; prioridad: string; caducidad: string;
  eventTarget: string;
};
type NR = {
    id: string; version: number; fullId: string; stations: string[];
    expiryDate: string; expiryTime: string; isAmpliado: boolean; isCaducado: boolean;
};
type HistoryLog = {
    id: string; timestamp: string; user: string;
    action: 'AÑADIDO' | 'EDITADO' | 'BORRADO' | 'CANCELADO';
    nrId: string; details: string;
};
type AppData = { nrs: NR[]; history: HistoryLog[]; };
type View = 'INICIO' | 'AÑADIR' | 'RADIOAVISOS' | 'EDITAR' | 'HISTORIAL';
type SortDirection = 'ascending' | 'descending';
type SortConfig<T> = { key: keyof T; direction: SortDirection };

// --- Centralized Component State ---
let state = {
    appData: { nrs: [] as NR[], history: [] as HistoryLog[] },
    isAppDataLoading: true,
    appDataError: null as string | null,
    currentView: 'INICIO' as View,
    componentContainer: null as HTMLElement | null,
    // Salvamento Panel State
    salvamentoAvisos: [] as SalvamentoAviso[],
    isSalvamentoLoading: false,
    salvamentoError: null as string | null,
    lastSalvamentoUpdate: null as Date | null,
    salvamentoFilterText: '',
    salvamentoSortConfig: { key: 'emision' as keyof SalvamentoAviso, direction: 'descending' as SortDirection },
    // Local Tables State
    nrFilterText: '',
    historyFilterText: '',
    nrSortConfig: { key: 'id' as keyof NR, direction: 'ascending' as SortDirection },
    historySortConfig: { key: 'timestamp' as keyof HistoryLog, direction: 'descending' as SortDirection },
};

// =================================================================================
// --- API LAYER ---
// =================================================================================

const api = {
    getData: async (): Promise<AppData> => {
        console.log('[DEBUG] api.getData: Fetching data from /api/radioavisos');
        const response = await fetch('/api/radioavisos');
        if (!response.ok) throw new Error('No se pudo obtener la información del servidor.');
        console.log('[DEBUG] api.getData: Fetch successful.');
        return response.json();
    },
    saveData: async (data: AppData): Promise<void> => {
        console.log('[DEBUG] api.saveData: Saving data to /api/radioavisos');
        const response = await fetch('/api/radioavisos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('No se pudo guardar la información en el servidor.');
        console.log('[DEBUG] api.saveData: Save successful.');
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

function parseExpiry(caducidad: string): { expiryDate: string, expiryTime: string } {
    if (!caducidad || !caducidad.includes(' ')) {
        return { expiryDate: '', expiryTime: '' };
    }
    const parts = caducidad.split(' ');
    if (parts.length < 2) return { expiryDate: '', expiryTime: '' };

    const datePart = parts[0];
    const timePart = parts[1];
    
    const dateParts = datePart.split('/');
    if (dateParts.length < 3) return { expiryDate: '', expiryTime: '' };

    const [day, month, year] = dateParts;

    if (!day || !month || !year || !timePart || year.length !== 4) {
        return { expiryDate: '', expiryTime: '' };
    }

    return {
        expiryDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        expiryTime: timePart
    };
}

const getMedioTags = (zona: string): string => {
    const upperZona = zona.toUpperCase();
    const zonasArray = upperZona.split(',').map(z => z.trim()).filter(Boolean);
    const hasCoruna = zonasArray.includes('CORUÑA');
    const hasOtherZones = zonasArray.some(z => z !== 'CORUÑA');
    let tags = '';
    if (hasCoruna) tags += `<span class="category-badge navtex" style="margin-right: 4px;">NAVTEX</span>`;
    if (hasOtherZones || !hasCoruna) tags += `<span class="category-badge fonia">FONÍA</span>`;
    return tags;
};

/**
 * Determines if a given date is within Daylight Saving Time for Spain.
 * DST starts on the last Sunday of March and ends on the last Sunday of October.
 */
function isDstSpain(date: Date = new Date()): boolean {
    const year = date.getFullYear();
    // DST starts on the last Sunday of March at 01:00 UTC
    const mar = new Date(Date.UTC(year, 2, 31));
    const startDay = mar.getUTCDate() - mar.getUTCDay();
    const dstStart = new Date(Date.UTC(year, 2, startDay, 1, 0, 0));

    // DST ends on the last Sunday of October at 01:00 UTC
    const oct = new Date(Date.UTC(year, 9, 31));
    const endDay = oct.getUTCDate() - oct.getUTCDay();
    const dstEnd = new Date(Date.UTC(year, 9, endDay, 1, 0, 0));
    
    return date >= dstStart && date < dstEnd;
}

function getExpiryStatus(nr: NR): 'status-green' | 'status-yellow' | 'status-orange' {
    if (!nr.expiryDate || !nr.expiryTime) {
        return 'status-green';
    }

    try {
        const expiryDateTime = new Date(`${nr.expiryDate}T${nr.expiryTime}Z`);
        const now = new Date();

        if (expiryDateTime <= now) {
            return 'status-green'; // Expired, will be filtered out on next refresh
        }

        const hoursUntilExpiry = (expiryDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilExpiry > 24) {
            return 'status-green';
        }

        // --- Timezone-aware shift calculation for Spanish time ---
        const isDst = isDstSpain(now);
        const spainOffsetHours = isDst ? 2 : 1;
        
        const nowInSpainTimezone = new Date(now.getTime() + spainOffsetHours * 3600 * 1000);
        const currentSpainHour = nowInSpainTimezone.getUTCHours();
        
        const shiftEndInSpainTimezone = new Date(nowInSpainTimezone);
        shiftEndInSpainTimezone.setUTCMinutes(0, 0, 0);
        
        // Spanish local time shifts: Mañana (7-15), Tarde (15-23), Noche (23-07)
        if (currentSpainHour >= 7 && currentSpainHour < 15) {
            shiftEndInSpainTimezone.setUTCHours(15);
        } else if (currentSpainHour >= 15 && currentSpainHour < 23) {
            shiftEndInSpainTimezone.setUTCHours(23);
        } else {
            if (currentSpainHour >= 23) { // After 23:00, shift ends next day
                shiftEndInSpainTimezone.setUTCDate(shiftEndInSpainTimezone.getUTCDate() + 1);
            }
            shiftEndInSpainTimezone.setUTCHours(7);
        }

        // Convert the shift end time back to actual UTC for comparison
        const actualShiftEndUTC = new Date(shiftEndInSpainTimezone.getTime() - spainOffsetHours * 3600 * 1000);
        
        if (expiryDateTime <= actualShiftEndUTC) {
            return 'status-orange'; // Expires within the current Spanish shift
        }
        
        return 'status-yellow'; // Expires within 24 hours but not in the current shift

    } catch (e) {
        return 'status-green'; // If date is invalid
    }
}


// =================================================================================
// --- DATA PROCESSING & SYNC LOGIC ---
// =================================================================================

async function syncWithSalvamento() {
    console.log('[DEBUG] syncWithSalvamento: Starting sync.');
    const user = getCurrentUser();
    if (!user) {
        console.log('[DEBUG] syncWithSalvamento: No user, skipping sync.');
        return;
    }

    const avisosOficiales = state.salvamentoAvisos;
    const nrsLocales = state.appData.nrs;

    const ZONAS_RELEVANTES = ['ESPAÑA COSTA N', 'ESPAÑA COSTA NW', 'CORUÑA'];
    
    const avisosRelevantes = avisosOficiales.filter(aviso => 
        ZONAS_RELEVANTES.some(zona => aviso.zona.toUpperCase().includes(zona)) ||
        aviso.tipo.toUpperCase() === 'NAVTEX'
    );

    let nrsActualizados = [...nrsLocales];
    let nuevosLogs: HistoryLog[] = [];
    let hayCambios = false;

    for (const aviso of avisosRelevantes) {
        const nrId = aviso.num.replace(/^NR-/, '');
        const isNavtexAviso = aviso.tipo.toUpperCase() === 'NAVTEX' || aviso.zona.toUpperCase().includes('CORUÑA');
        
        const indiceLocal = nrsActualizados.findIndex(nr => nr.id === nrId && !nr.isCaducado);

        if (indiceLocal === -1) {
            // --- ADD NEW NR ---
            hayCambios = true;
            const { expiryDate, expiryTime } = parseExpiry(aviso.caducidad);
            const newNR: NR = {
                id: nrId, version: 1, fullId: `${nrId}-1`, stations: [],
                expiryDate: expiryDate, expiryTime: expiryTime,
                isAmpliado: false, isCaducado: false
            };
            if (isNavtexAviso) {
                newNR.stations.push('Navtex');
            }
            nrsActualizados.push(newNR);
            nuevosLogs.push({
                id: `log-${Date.now()}-${nrId}`, timestamp: new Date().toISOString(), user: 'SISTEMA',
                action: 'AÑADIDO', nrId: nrId, details: `Añadido automáticamente desde SASEMAR. ${isNavtexAviso ? 'Asignado a Navtex.' : ''}`
            });

        } else {
            // --- UPDATE EXISTING NR ---
            const nrExistente = nrsActualizados[indiceLocal];
            const alreadyHasNavtex = nrExistente.stations.includes('Navtex');

            // If it's a NAVTEX advisory and the local NR doesn't have the Navtex station yet, add it.
            if (isNavtexAviso && !alreadyHasNavtex) {
                hayCambios = true;
                nrExistente.stations.push('Navtex');
                nuevosLogs.push({
                    id: `log-${Date.now()}-${nrId}`, timestamp: new Date().toISOString(), user: 'SISTEMA',
                    action: 'EDITADO', nrId: nrId, details: 'Añadida automáticamente la estación Navtex.'
                });
            }
        }
    }

    if (hayCambios) {
        console.log(`[DEBUG] syncWithSalvamento: Found changes. Saving...`);
        const finalData: AppData = {
            nrs: nrsActualizados,
            history: [...nuevosLogs, ...state.appData.history]
        };
        try {
            await api.saveData(finalData);
            state.appData = finalData;
            showToast(`Sincronización con SASEMAR completada.`, 'info');
        } catch (error) {
            showToast("Error al guardar los NRs importados/actualizados.", "error");
        }
    } else {
        console.log('[DEBUG] syncWithSalvamento: No changes found.');
    }
}


async function updateSalvamentoData() {
    console.log('[DEBUG] updateSalvamentoData: Starting fetch.');
    state.isSalvamentoLoading = true;
    state.salvamentoError = null;
    
    try {
        console.log('[DEBUG] updateSalvamentoData: Fetching from /api/salvamento-avisos');
        const response = await fetch('/api/salvamento-avisos');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Respuesta no válida del servidor.');
        }
        console.log('[DEBUG] updateSalvamentoData: Fetch successful.');
        state.salvamentoAvisos = await response.json();
        state.lastSalvamentoUpdate = new Date();
        
        console.log('[DEBUG] updateSalvamentoData: Calling syncWithSalvamento.');
        await syncWithSalvamento();

    } catch (e) {
        console.error("[DEBUG] updateSalvamentoData: CATCH block.", e);
        state.salvamentoAvisos = [];
        state.salvamentoError = 'No se pudo conectar con la fuente oficial de Salvamento Marítimo. Por favor, inténtelo de nuevo más tarde.';
    } finally {
        console.log('[DEBUG] updateSalvamentoData: FINALLY block.');
        state.isSalvamentoLoading = false;
    }
}

// =================================================================================
// --- CORE RENDERING LOGIC ---
// =================================================================================

async function reRender() {
    console.log('[DEBUG:Render] reRender called. State:', { isAppDataLoading: state.isAppDataLoading, appDataError: state.appDataError });
    if (!state.componentContainer) {
        console.error('[DEBUG:Render] reRender aborted: componentContainer is null.');
        return;
    }
    const activeElementId = document.activeElement?.id;
    
    const salvamentoPanel = document.getElementById('salvamento-panel-container');
    if (salvamentoPanel) salvamentoPanel.innerHTML = renderSalvamentoPanelHTML();

    const localManagerContainer = document.getElementById('local-manager-container');
    if(localManagerContainer) localManagerContainer.innerHTML = renderLocalManagerHTML();

    const activeElement = activeElementId ? document.getElementById(activeElementId) : null;
    if (activeElement instanceof HTMLElement) {
        activeElement.focus();
    }
    console.log('[DEBUG:Render] reRender completed DOM updates.');
}

async function loadInitialData() {
    console.log('[DEBUG] loadInitialData: START. Setting isAppDataLoading = true.');
    state.isAppDataLoading = true;
    state.appDataError = null;

    // First render: Show skeletons immediately
    await reRender();
    
    try {
        console.log('[DEBUG] loadInitialData: Awaiting api.getData()');
        state.appData = await api.getData();
        console.log('[DEBUG] loadInitialData: api.getData() finished. Awaiting updateSalvamentoData()');
        await updateSalvamentoData();
        console.log('[DEBUG] loadInitialData: updateSalvamentoData() finished.');
    } catch (error) {
        console.error('[DEBUG] loadInitialData: CATCH block.', error);
        const message = error instanceof Error ? error.message : "Error desconocido";
        state.appDataError = message;
    } finally {
        console.log('[DEBUG] loadInitialData: FINALLY block. isAppDataLoading is now false. Triggering reRender...');
        state.isAppDataLoading = false;
        // Second render: Show final content
        await reRender();
        console.log('[DEBUG] loadInitialData: Final reRender complete.');
    }
}

export function renderRadioavisos(container: HTMLElement) {
    state.componentContainer = container;
    if (!getCurrentUser()) {
        container.innerHTML = `<div class="content-card"><p class="error">Debe iniciar sesión para acceder a esta herramienta.</p></div>`;
        return;
    }
    
    // Set up the page structure only once
    if (!(container as any).__radioavisosListenersAttached) {
        container.innerHTML = `
            <div id="salvamento-panel-container"></div>
            <div class="content-card" style="max-width: 1400px; margin-top: 2rem;" id="local-manager-container"></div>
        `;
        attachEventListeners(container);
        (container as any).__radioavisosListenersAttached = true;
    }
    
    // Kick off the data loading and rendering process
    loadInitialData();
}

function renderSalvamentoPanelHTML(): string {
    console.log('[DEBUG:Render] renderSalvamentoPanelHTML called. State:', { isSalvamentoLoading: state.isSalvamentoLoading, salvamentoError: state.salvamentoError });
    const spinnerIcon = `<svg class="spinner" style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    const refreshIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>`;

    let content;
    if (state.isSalvamentoLoading && state.salvamentoAvisos.length === 0) {
        console.log('[DEBUG:Render] ... rendering salvamento SKELETON.');
        content = `<div class="loader-container"><div class="loader"></div></div>`;
    } else if (state.salvamentoError) {
        console.log('[DEBUG:Render] ... rendering salvamento ERROR.');
        content = `<p class="error" style="padding: 1rem; text-align: center;">${state.salvamentoError}</p>`;
    } else if (state.salvamentoAvisos.length === 0 && !state.isSalvamentoLoading) {
        content = `<p class="drill-placeholder">No hay radioavisos disponibles en la fuente oficial.</p>`;
    } else {
        console.log('[DEBUG:Render] ... rendering salvamento CONTENT.');
        const ZONAS_FILTRADAS = ['ESPAÑA COSTA N', 'ESPAÑA COSTA NW', 'CORUÑA'];
        const searchTerm = state.salvamentoFilterText.toLowerCase();
        const filteredAvisos = state.salvamentoAvisos
            .filter(aviso => 
                ZONAS_FILTRADAS.some(zona => aviso.zona.toUpperCase().includes(zona)) ||
                aviso.tipo.toUpperCase() === 'NAVTEX'
            )
            .filter(aviso => 
                aviso.num.toLowerCase().includes(searchTerm) ||
                aviso.asunto.toLowerCase().includes(searchTerm) ||
                aviso.zona.toLowerCase().includes(searchTerm)
            );
        const sortedAvisos = [...filteredAvisos].sort((a, b) => {
            const { key, direction } = state.salvamentoSortConfig;
            const aValue = a[key] || '';
            const bValue = b[key] || '';
            const comparison = aValue.localeCompare(bValue, undefined, { numeric: true });
            return direction === 'ascending' ? comparison : -comparison;
        });

        const renderHeader = (key: keyof SalvamentoAviso, label: string) => {
            const isSorted = state.salvamentoSortConfig.key === key;
            const sortClass = isSorted ? `sort-${state.salvamentoSortConfig.direction}` : '';
            return `<th class="${sortClass}" data-sort-key="${key}" data-table="salvamento">${label}</th>`;
        };

        if (sortedAvisos.length === 0) {
            content = `
                <div class="filterable-table-header">
                    <input type="search" class="filter-input" placeholder="Filtrar por número, asunto o zona..." value="${state.salvamentoFilterText}" data-action="filter" data-filter-target="salvamento">
                </div>
                <p class="drill-placeholder">No hay radioavisos para los filtros aplicados.</p>
            `;
        } else {
            content = `
                <div class="filterable-table-header">
                     <input type="search" class="filter-input" placeholder="Filtrar por número, asunto o zona..." value="${state.salvamentoFilterText}" data-action="filter" data-filter-target="salvamento">
                </div>
                <div class="table-wrapper">
                    <table class="reference-table">
                        <thead>
                            <tr>
                                ${renderHeader('num', 'Num.')}
                                ${renderHeader('emision', 'Emisión')}
                                ${renderHeader('asunto', 'Asunto')}
                                ${renderHeader('zona', 'Zona')}
                                <th style="min-width: 150px;">Estaciones (Gestor)</th>
                                ${renderHeader('prioridad', 'Prioridad')}
                                <th>Medio</th>
                                ${renderHeader('caducidad', 'Caducidad')}
                            </tr>
                        </thead>
                        <tbody>
                        ${sortedAvisos.map(aviso => {
                            const normalizedAvisoNum = aviso.num.replace(/^NR-/, '');
                            const localNR = state.appData.nrs.find(nr => nr.id === normalizedAvisoNum && !nr.isCaducado);
                            const stationsText = localNR && localNR.stations.length > 0 
                                ? localNR.stations.map(s => s.replace(/ (VHF|MF)$/, '').replace('Navtex', 'NTX')).join(', ') 
                                : '---';

                            return `
                                <tr>
                                    <td>${aviso.num}</td>
                                    <td>${aviso.emision}</td>
                                    <td style="white-space: normal; min-width: 250px;">${aviso.asunto}</td>
                                    <td style="min-width: 150px;">${aviso.zona}</td>
                                    <td style="min-width: 150px;">${stationsText}</td>
                                    <td><span class="category-badge ${aviso.prioridad.toLowerCase()}">${aviso.prioridad}</span></td>
                                    <td>${getMedioTags(aviso.zona)}</td>
                                    <td>${aviso.caducidad}</td>
                                </tr>
                            `;
                        }).join('')}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>
                    </a>
                </div>
                <div class="salvamento-panel-controls">
                    ${state.lastSalvamentoUpdate ? `<span class="last-update-text">${getFormattedDateTime(state.lastSalvamentoUpdate.toISOString())}</span>` : ''}
                    <button class="secondary-btn" data-action="refresh-salvamento" ${state.isSalvamentoLoading ? 'disabled' : ''}>
                        ${state.isSalvamentoLoading ? spinnerIcon : refreshIcon}
                        <span>${state.isSalvamentoLoading ? 'Actualizando...' : 'Actualizar'}</span>
                    </button>
                </div>
            </div>
            ${content}
        </div>
    `;
}

function renderLocalManagerHTML(): string {
    console.log('[DEBUG:Render] renderLocalManagerHTML called. State:', { isAppDataLoading: state.isAppDataLoading, appDataError: state.appDataError });
    const user = getCurrentUser();
    if (!user) return `<div class="content-card"><p class="error">Error de autenticación.</p></div>`;

    if (state.isAppDataLoading) {
        console.log('[DEBUG:Render] ... rendering local manager SKELETON.');
        return `<div class="loader-container"><div class="loader"></div></div>`;
    }
    if (state.appDataError) {
        console.log(`[DEBUG:Render] ... rendering local manager ERROR: ${state.appDataError}`);
        return `<p class="error">${state.appDataError}</p>`;
    }

    console.log('[DEBUG:Render] ... rendering local manager CONTENT.');
    const views: { id: View, name: string }[] = [
        { id: 'INICIO', name: 'Inicio' }, { id: 'AÑADIR', name: 'Añadir Manual' },
        { id: 'RADIOAVISOS', name: 'Radioavisos' }, { id: 'HISTORIAL', name: 'Historial' }
    ];

    return `
        <div class="form-divider" style="width: 100%; margin: -0.5rem auto 1.5rem auto;">
            <span>Gestor Local</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
            <h2 class="content-card-title" style="margin: 0; padding: 0; border: none;">Gestor de Radioavisos</h2>
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
            ${views.map(v => `<button class="info-nav-btn ${state.currentView === v.id ? 'active' : ''}" data-view="${v.id}" data-action="switch-view">${v.name}</button>`).join('')}
        </div>
        <div id="radioavisos-view-content" style="margin-top: 2rem;">
            ${renderCurrentViewContent()}
        </div>
    `;
}

// =================================================================================
// --- EVENT HANDLING ---
// =================================================================================

async function handleRefreshSalvamento() {
    state.isSalvamentoLoading = true;
    await reRender();
    await updateSalvamentoData();
    await reRender();
}

async function handleSwitchView(element: HTMLElement) {
    state.currentView = element.dataset.view as View;
    await reRender();
}

async function handleGoToEdit(nrId: string) {
    if (!nrId) return;
    state.currentView = 'EDITAR'; 
    await reRender(); 
    const searchInput = state.componentContainer?.querySelector('#edit-search-id') as HTMLInputElement | null;
    const searchButton = state.componentContainer?.querySelector('button[data-action="edit-search"]') as HTMLButtonElement | null;
    if (searchInput && searchButton) {
        searchInput.value = nrId;
        searchButton.click(); 
    }
}

async function handleCompleteNr(element: HTMLElement) {
    const nrId = element.dataset.nrId;
    if (nrId) {
        await handleGoToEdit(nrId);
    }
}

async function handleCancelNR(nrId: string) {
    const user = getCurrentUser();
    if (!user) return showToast("Error de sesión.", "error");

    try {
        if (!state.appData.nrs.some(nr => nr.id === nrId && !nr.isCaducado)) {
            return showToast(`El NR ${nrId} no existe o ya está cancelado.`, "error");
        }
        if (!window.confirm(`¿Está seguro de que desea CANCELAR todas las versiones vigentes del NR ${nrId}?`)) {
            return;
        }
        const finalData: AppData = {
            nrs: state.appData.nrs.map(nr => (nr.id === nrId ? {...nr, isCaducado: true} : nr)),
            history: [
                {id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'CANCELADO', nrId: nrId, details: `Marcado como caducado.`},
                ...state.appData.history
            ]
        };
        await api.saveData(finalData);
        state.appData = finalData;
        showToast(`${nrId} ha sido cancelado.`, 'info');
        await reRender();
    } catch (error) {
        showToast("Error al cancelar: " + (error instanceof Error ? error.message : "Error desconocido"), "error");
    }
}


async function handleSort(element: HTMLElement) {
    const key = element.dataset.sortKey;
    const targetTable = element.dataset.table;
    if (!key) return;

    if (targetTable === 'nrs') {
        const isSameKey = state.nrSortConfig.key === key;
        state.nrSortConfig = {
            key: key as keyof NR,
            direction: isSameKey && state.nrSortConfig.direction === 'ascending' ? 'descending' : 'ascending',
        };
    } else if (targetTable === 'history') {
        const isSameKey = state.historySortConfig.key === key;
        state.historySortConfig = {
            key: key as keyof HistoryLog,
            direction: isSameKey && state.historySortConfig.direction === 'ascending' ? 'descending' : 'ascending',
        };
    } else if (targetTable === 'salvamento') {
        const isSameKey = state.salvamentoSortConfig.key === key;
        state.salvamentoSortConfig = {
            key: key as keyof SalvamentoAviso,
            direction: isSameKey && state.salvamentoSortConfig.direction === 'ascending' ? 'descending' : 'ascending',
        };
    }
    await reRender();
}

function attachEventListeners(container: HTMLElement) {
    container.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const actionElement = target.closest<HTMLElement>('[data-action]');
        
        if (actionElement) {
            const action = actionElement.dataset.action;
            switch(action) {
                case 'refresh-salvamento': await handleRefreshSalvamento(); break;
                case 'switch-view': await handleSwitchView(actionElement); break;
                case 'import': state.componentContainer?.querySelector<HTMLInputElement>('.file-input-hidden')?.click(); break;
                case 'export': handleExport(); break;
                case 'add-submit': await handleAddSubmit(); break;
                case 'add-clear': state.currentView = 'AÑADIR'; await reRender(); break;
                case 'edit-search': await handleEditSearch(); break;
                case 'edit-save': await handleEditSave(); break;
                case 'go-to-edit': await handleGoToEdit(actionElement.dataset.nrId!); break;
                case 'cancel-nr': await handleCancelNR(actionElement.dataset.nrId!); break;
                case 'complete-nr': await handleCompleteNr(actionElement); break;
            }
        } else if (target.closest('th[data-sort-key]')) {
            await handleSort(target.closest('th[data-sort-key]')!);
        }
    });
    
    const debouncedFilter = debounce(async (e: Event) => {
        const input = e.target as HTMLInputElement;
        const target = input.dataset.filterTarget;
        if (target === 'nrs') state.nrFilterText = input.value;
        else if (target === 'history') state.historyFilterText = input.value;
        else if (target === 'salvamento') state.salvamentoFilterText = input.value;
        await reRender();
    }, 300);

    container.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.dataset.action === 'filter') debouncedFilter(e);
    });
    
    container.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.id === 'add-is-versionado') {
            const versionedInput = document.getElementById('add-versioned-id-container');
            if (versionedInput) versionedInput.style.display = target.checked ? 'block' : 'none';
        } else if (target.id === 'add-has-expiry') {
            const expiryInputs = document.getElementById('add-expiry-inputs');
            if (expiryInputs) expiryInputs.style.display = target.checked ? 'flex' : 'none';
        } else if (target.classList.contains('file-input-hidden')) {
            handleFileChange(e);
        }
    });
}

async function handleAddSubmit() {
    const user = getCurrentUser();
    if (!user) return showToast("Error de sesión. Por favor, inicie sesión de nuevo.", "error");
    if (!state.componentContainer) return;
    const container = state.componentContainer;

    try {
        const nrNum = (container.querySelector('#add-nr-num') as HTMLInputElement).value.trim();
        const nrYear = (container.querySelector('#add-nr-year') as HTMLInputElement).value.trim();
        if (!nrNum || !nrYear) return showToast("El número y el año del NR son obligatorios.", "error");
        const nrId = `${nrNum}/${nrYear}`;

        const stations = Array.from(container.querySelectorAll<HTMLInputElement>('#add-stations-group input:checked')).map(cb => cb.value);
        if (stations.length === 0) return showToast("Debe seleccionar al menos una estación.", "error");

        const versionadoCheckbox = container.querySelector('#add-is-versionado') as HTMLInputElement;
        const versionedFrom = versionadoCheckbox.checked ? (container.querySelector('#add-versioned-id') as HTMLInputElement).value.trim() : undefined;
        
        if (state.appData.nrs.some(nr => nr.id === nrId && !nr.isCaducado && !versionedFrom)) {
            return showToast(`Error: El NR ${nrId} ya existe y está vigente. Para crear una nueva versión, marque la casilla 'Versionado'.`, "error");
        }

        let version = 1;
        let nrsToUpdate = [...state.appData.nrs];
        if (versionedFrom) {
            const previousVersions = nrsToUpdate.filter(nr => nr.id === versionedFrom);
            if (previousVersions.length > 0) {
                version = Math.max(...previousVersions.map(nr => nr.version)) + 1;
                nrsToUpdate = nrsToUpdate.map(nr => nr.id === versionedFrom ? { ...nr, isCaducado: true } : nr);
                state.appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'CANCELADO', nrId: versionedFrom, details: `Versionado a ${nrId}-${version}`});
            }
        }
        
        const expiryCheckbox = container.querySelector('#add-has-expiry') as HTMLInputElement;
        const newNR: NR = {
            id: nrId, version, fullId: `${nrId}-${version}`, stations,
            expiryDate: expiryCheckbox.checked ? (container.querySelector('#add-expiry-date') as HTMLInputElement).value : '',
            expiryTime: expiryCheckbox.checked ? (container.querySelector('#add-expiry-time') as HTMLInputElement).value : '',
            isAmpliado: (container.querySelector('#add-is-ampliado') as HTMLInputElement).checked,
            isCaducado: false
        };

        const finalData: AppData = {
            nrs: [...nrsToUpdate, newNR],
            history: [
                { id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'AÑADIDO', nrId, details: `Añadida versión ${version} a ${stations.length} estaciones.` },
                ...state.appData.history
            ]
        };

        await api.saveData(finalData);
        state.appData = finalData;
        showToast(`${nrId}-${version} añadido.`, 'success');
        state.currentView = 'INICIO';
        await reRender();
    } catch (error) { 
        showToast("Error al guardar: " + (error instanceof Error ? error.message : "Error desconocido"), "error");
    }
}

async function handleEditSave() {
    const user = getCurrentUser();
    if (!user) return showToast("Error de sesión.", "error");
    if (!state.componentContainer) return;
    const container = state.componentContainer;

    const formContainer = container.querySelector('#edit-form-container') as HTMLElement;
    const fullId = formContainer.dataset.fullId;
    if (!fullId) return;

    try {
        const nrToUpdate = state.appData.nrs.find(nr => nr.fullId === fullId);
        if (!nrToUpdate) {
            showToast("El NR que intenta editar ya no existe.", "error");
            state.currentView = 'INICIO';
            return await loadInitialData();
        }

        const updatedStations = Array.from(container.querySelectorAll<HTMLInputElement>('#edit-stations-group input:checked')).map(cb => cb.value);
        if (updatedStations.length === 0) {
            return showToast("Debe seleccionar al menos una estación para guardar.", "error");
        }
        
        const updatedNrs = state.appData.nrs.map(nr => nr.fullId === fullId ? {
            ...nr,
            expiryDate: (container.querySelector('#edit-expiry-date') as HTMLInputElement).value,
            expiryTime: (container.querySelector('#edit-expiry-time') as HTMLInputElement).value,
            isAmpliado: (container.querySelector('#edit-is-ampliado') as HTMLInputElement).checked,
            stations: updatedStations,
        } : nr);

        const finalData: AppData = {
            nrs: updatedNrs,
            history: [
                { id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'EDITADO', nrId: nrToUpdate.id, details: `Editada versión ${nrToUpdate.version}.` },
                ...state.appData.history
            ]
        };
        await api.saveData(finalData);
        state.appData = finalData;
        showToast(`${nrToUpdate.id} actualizado.`, 'success');
        state.currentView = 'INICIO';
        await reRender();
    } catch (error) { 
        showToast("Error al guardar la edición: " + (error instanceof Error ? error.message : "Error desconocido"), "error");
    }
}

async function handleEditSearch() {
    if (!state.componentContainer) return;
    const container = state.componentContainer;
    const searchInput = container.querySelector('#edit-search-id') as HTMLInputElement;
    const formContainer = container.querySelector('#edit-form-container') as HTMLElement;
    const searchId = searchInput.value.trim();

    try {
        const foundNRs = state.appData.nrs.filter(nr => nr.id === searchId && !nr.isCaducado);
        if (foundNRs.length > 0) {
            const latestVersion = foundNRs.sort((a, b) => b.version - a.version)[0];
            formContainer.dataset.fullId = latestVersion.fullId;
            (container.querySelector('#edit-expiry-date') as HTMLInputElement).value = latestVersion.expiryDate;
            (container.querySelector('#edit-expiry-time') as HTMLInputElement).value = latestVersion.expiryTime;
            (container.querySelector('#edit-is-ampliado') as HTMLInputElement).checked = latestVersion.isAmpliado;
            container.querySelectorAll<HTMLInputElement>('#edit-stations-group input').forEach(cb => {
                cb.checked = latestVersion.stations.includes(cb.value);
            });
            formContainer.style.display = 'block';
        } else {
            showToast(`NR ${searchId} no encontrado o está cancelado.`, 'info');
            formContainer.style.display = 'none';
        }
    } catch (error) {
        showToast("Error al buscar: " + (error instanceof Error ? error.message : "Error desconocido"), "error");
    }
}

function handleExport() {
    const dataStr = JSON.stringify(state.appData, null, 2);
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
            
            const dataToProcess = parsedData as unknown as AppData;
            
            await api.saveData(dataToProcess);
            state.appData = dataToProcess;
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
    console.log(`[DEBUG:Render] renderCurrentViewContent called for view: ${state.currentView}`);
    switch (state.currentView) {
        case 'INICIO': return renderMainView();
        case 'AÑADIR': return renderAddView();
        case 'RADIOAVISOS': return renderRadioavisosDbView();
        case 'EDITAR': return renderEditView();
        case 'HISTORIAL': return renderHistoryView();
        default: return `<p>Vista no encontrada</p>`;
    }
}

function renderAttentionPanel(): string {
    const nonNavtexStations = [...STATIONS_VHF, ...STATIONS_MF];
    
    const nrsNeedingAttention = state.appData.nrs.filter(nr => {
        if (nr.isCaducado) {
            return false;
        }

        // Find the corresponding official advisory in the latest fetched data
        const officialAviso = state.salvamentoAvisos.find(aviso => aviso.num.replace(/^NR-/, '') === nr.id);
        
        // Fallback: if we can't find the official aviso, check if it has 0 stations.
        if (!officialAviso) {
            return nr.stations.length === 0;
        }

        const upperZona = officialAviso.zona.toUpperCase();
        
        // An advisory needs a non-Navtex station if its zone is one of the main coastal areas.
        const needsNonNavtexStation = upperZona.includes('ESPAÑA COSTA N') || upperZona.includes('ESPAÑA COSTA NW');
        
        // Check if it has any non-Navtex station assigned already.
        const hasNonNavtexStation = nr.stations.some(s => nonNavtexStations.includes(s));
        
        // It's pending if it needs a non-Navtex station but doesn't have one yet.
        return needsNonNavtexStation && !hasNonNavtexStation;
    });

    if (nrsNeedingAttention.length === 0) return '';
    
    return `
        <div class="attention-panel">
            <div class="attention-panel-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="warning-icon" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/></svg>
                <h4>Acciones Pendientes</h4>
            </div>
            <p>Los siguientes NRs han sido importados pero necesitan que se les asignen estaciones de VHF/MF:</p>
            <ul class="attention-list">
                ${nrsNeedingAttention.map(nr => `
                    <li class="attention-item">
                        <span>${nr.id}</span>
                        <button class="primary-btn-small" data-action="complete-nr" data-nr-id="${nr.id}">Completar</button>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}


function renderMainView(): string {
    console.log('[DEBUG:Render] ... rendering MainView.');
    const { history, nrs } = state.appData;
    const lastAction = (action: HistoryLog['action']) => [...history].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).find(h => h.action === action);
    const lastAdded = lastAction('AÑADIDO');
    const lastEdited = lastAction('EDITADO');
    const lastDeleted = lastAction('BORRADO');
    const activeNRs = nrs.filter(nr => !nr.isCaducado);

    const STATIONS_NAVTEX = ['Navtex'];
    const allTableStations = [...STATIONS_VHF, ...STATIONS_MF, ...STATIONS_NAVTEX];

    const nrsByStation = allTableStations.reduce((acc, station) => {
        acc[station] = activeNRs.filter(nr => nr.stations.includes(station)).map(nr => nr.id);
        return acc;
    }, {} as Record<string, string[]>);

    const maxNrs = Math.max(0, ...Object.values(nrsByStation).map(arr => arr.length));
    
    return `
        ${renderAttentionPanel()}
        <div class="station-tables">
            <div class="station-table-container">
                <h3>Radioavisos Vigentes por Estación</h3>
                <div class="table-wrapper">
                    <table class="station-table horizontal-table reference-table">
                        <thead>
                            <tr>
                                ${STATIONS_VHF.map(s => `<th class="header-vhf">${s.replace(' VHF', '')}</th>`).join('')}
                                ${STATIONS_MF.map(s => `<th class="header-mf">${s}</th>`).join('')}
                                ${STATIONS_NAVTEX.map(s => `<th class="header-navtex">${s}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${maxNrs === 0 
                                ? `<tr><td colspan="${allTableStations.length}" class="drill-placeholder" style="padding: 1rem;">No hay NRs vigentes.</td></tr>` 
                                : Array.from({ length: maxNrs }).map((_, r) => `<tr>${allTableStations.map(s => `<td>${nrsByStation[s]?.[r] || ''}</td>`).join('')}</tr>`).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="label">Total NRs vigentes:</div><div class="value green">${activeNRs.length}</div></div>
            <div class="stat-card"><div class="label">Último NR añadido:</div><div class="value">${lastAdded ? lastAdded.nrId : '-'}</div><small>Por: ${lastAdded?.user || '-'}</small></div>
             <div class="stat-card"><div class="label">Último NR editado:</div><div class="value">${lastEdited ? lastEdited.nrId : '-'}</div><small>Por: ${lastEdited?.user || '-'}</small></div>
            <div class="stat-card"><div class="label">Último NR borrado:</div><div class="value red">${lastDeleted ? lastDeleted.nrId : '-'}</div><small>Por: ${lastDeleted?.user || '-'}</small></div>
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
            <div style="flex-grow: 1;"><label for="edit-search-id">Buscar NR por ID (ej: 2237/2025)</label><input type="text" id="edit-search-id" placeholder="ID del NR, sin versión" class="simulator-input"/></div>
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

function renderRadioavisosDbView(): string {
    const searchTerm = state.nrFilterText.toLowerCase();
    const filteredNrs = state.appData.nrs.filter(nr =>
        !nr.isCaducado &&
        (nr.id.toLowerCase().includes(searchTerm) ||
        nr.fullId.toLowerCase().includes(searchTerm) ||
        (nr.expiryDate && nr.expiryDate.includes(searchTerm)))
    );
    const sortedNrs = [...filteredNrs].sort((a, b) => {
        const { key, direction } = state.nrSortConfig;
        const comparison = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true });
        return direction === 'ascending' ? comparison : -comparison;
    });

    if (sortedNrs.length === 0) {
        return `<div class="filterable-table-header"><input type="search" class="filter-input" placeholder="Filtrar NRs vigentes..." value="${state.nrFilterText}" data-action="filter" data-filter-target="nrs"></div><p class="drill-placeholder">No se encontraron NRs vigentes.</p>`;
    }

    const renderHeader = (key: keyof NR, label: string) => {
        const isSorted = state.nrSortConfig.key === key;
        const sortClass = isSorted ? `sort-${state.nrSortConfig.direction}` : '';
        return `<th class="${sortClass}" data-sort-key="${key}" data-table="nrs">${label}</th>`;
    };
    
    const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/></svg>`;

    return `
        <div class="filterable-table-header"><input type="search" class="filter-input" placeholder="Filtrar NRs vigentes..." value="${state.nrFilterText}" data-action="filter" data-filter-target="nrs"></div>
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead>
                    <tr>
                        <th title="Estado de Caducidad">${clockIcon}</th>
                        ${renderHeader('id', 'NR')}
                        ${renderHeader('version', 'Versión')}
                        ${renderHeader('expiryDate', 'Caducidad (UTC)')}
                        <th>EECC</th>
                        ${renderHeader('isAmpliado', 'Ampliado')}
                        <th style="text-align: center;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedNrs.map(nr => `
                        <tr>
                            <td style="text-align: center;"><span class="status-dot ${getExpiryStatus(nr)}"></span></td>
                            <td>${nr.id}</td>
                            <td>v${nr.version}</td>
                            <td>${nr.expiryDate || 'N/A'} ${nr.expiryTime || ''}</td>
                            <td>${nr.stations.length > 0 ? nr.stations.length : '-'}</td>
                            <td class="${nr.isAmpliado ? 'true-cell' : 'false-cell'}">${nr.isAmpliado ? '✔' : '✖'}</td>
                            <td>
                                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                                    <button class="secondary-btn" data-action="go-to-edit" data-nr-id="${nr.id}">Editar</button>
                                    <button class="tertiary-btn" data-action="cancel-nr" data-nr-id="${nr.id}">Cancelar</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="status-legend">
            <div class="legend-item"><span class="status-dot status-orange"></span> Caduca en este turno</div>
            <div class="legend-item"><span class="status-dot status-yellow"></span> Caduca en las próximas 24h</div>
            <div class="legend-item"><span class="status-dot status-green"></span> Vigente (> 24h)</div>
        </div>`;
}

function renderHistoryView(): string {
    const searchTerm = state.historyFilterText.toLowerCase();
    const filteredHistory = state.appData.history.filter(log =>
        log.nrId.toLowerCase().includes(searchTerm) || log.user.toLowerCase().includes(searchTerm) ||
        log.action.toLowerCase().includes(searchTerm) || log.details.toLowerCase().includes(searchTerm)
    );
    const sortedHistory = [...filteredHistory].sort((a, b) => {
        const { key, direction } = state.historySortConfig;
        const comparison = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true });
        return direction === 'ascending' ? comparison : -comparison;
    });

    if (sortedHistory.length === 0) {
        return `<div class="filterable-table-header"><input type="search" class="filter-input" placeholder="Filtrar historial..." value="${state.historyFilterText}" data-action="filter" data-filter-target="history"></div><p class="drill-placeholder">No hay operaciones registradas.</p>`;
    }
    
    const renderHeader = (key: keyof HistoryLog, label: string) => {
        const isSorted = state.historySortConfig.key === key;
        const sortClass = isSorted ? `sort-${state.historySortConfig.direction}` : '';
        return `<th class="${sortClass}" data-sort-key="${key}" data-table="history">${label}</th>`;
    };

    return `
        <div class="filterable-table-header"><input type="search" class="filter-input" placeholder="Filtrar historial..." value="${state.historyFilterText}" data-action="filter" data-filter-target="history"></div>
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead><tr>${renderHeader('nrId', 'NR')}${renderHeader('timestamp', 'F/H Acción')}${renderHeader('user', 'Usuario')}${renderHeader('action', 'Acción')}${renderHeader('details', 'Detalles')}</tr></thead>
                <tbody>${sortedHistory.map(log => `<tr><td>${log.nrId}</td><td>${getFormattedDateTime(log.timestamp)}</td><td>${log.user}</td><td>${log.action}</td><td>${log.details}</td></tr>`).join('')}</tbody>
            </table>
        </div>`;
}
