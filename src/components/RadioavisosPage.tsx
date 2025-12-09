
import { ALL_STATIONS, STATIONS_VHF, STATIONS_MF } from "../data";
import { getCurrentUser } from "../utils/auth";
import { debounce, showToast } from "../utils/helpers";

type SalvamentoAviso = {
  num: string; emision: string; asunto: string; zona: string;
  tipo: string; subtipo: string; prioridad: string; caducidad: string;
  eventTarget: string;
};
type NR = {
    id: string; baseId: string; version: number; stations: string[];
    expiryDate: string; expiryTime: string; isAmpliado: boolean; isCaducado: boolean; isManual: boolean;
};
type HistoryLog = { id: string; timestamp: string; user: string; action: string; nrId: string; details: string; };
type AppData = { nrs: NR[]; history: HistoryLog[]; };
type View = 'NX' | 'AÑADIR' | 'HISTORIAL';
type SortDirection = 'ascending' | 'descending';

let state = {
    appData: { nrs: [] as NR[], history: [] as HistoryLog[] },
    isAppDataLoading: true,
    appDataError: null as string | null,
    currentView: 'NX' as View,
    componentContainer: null as HTMLElement | null,
    salvamentoAvisos: [] as SalvamentoAviso[],
    isSalvamentoLoading: false,
    salvamentoError: null as string | null,
    lastSalvamentoUpdate: null as Date | null,
    filterText: '',
    sortConfig: { key: 'id' as keyof NR, direction: 'descending' as SortDirection },
    historyFilterText: '',
    historySortConfig: { key: 'timestamp' as keyof HistoryLog, direction: 'descending' as SortDirection },
};

const api = {
    getData: async (): Promise<AppData> => {
        const response = await fetch('/api/radioavisos');
        if (!response.ok) throw new Error('No se pudo obtener la información.');
        return response.json();
    },
    saveData: async (data: AppData): Promise<void> => {
        const response = await fetch('/api/radioavisos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('No se pudo guardar la información.');
    },
};

// --- HELPERS ---
function getBaseId(fullId: string): string { return (fullId || '').replace(/^NR-/, '').split('-')[0]; }
const getFormattedDateTime = (isoString?: string) => { if (!isoString) return '-'; try { const date = new Date(isoString); return date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'; } catch { return isoString; } };
function parseExpiry(caducidad: string) { if (!caducidad) return { expiryDate: '', expiryTime: '' }; const parts = caducidad.trim().split(/\s+/); if (parts.length < 2) return { expiryDate: '', expiryTime: '' }; const datePart = parts[0]; let timePart = parts[1] ? parts[1].trim() : ''; if (timePart.includes(':')) { const c = timePart.split(':'); if (c.length === 2) { c[0] = c[0].padStart(2, '0'); timePart = c.join(':'); } } const dateParts = datePart.split('/'); if (dateParts.length < 3) return { expiryDate: '', expiryTime: '' }; const [day, month, year] = dateParts; if (!day || !month || !year || !timePart || year.length !== 4) return { expiryDate: '', expiryTime: '' }; return { expiryDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`, expiryTime: timePart }; }
function isDstSpain(date: Date = new Date()): boolean { const year = date.getFullYear(); const mar = new Date(Date.UTC(year, 2, 31)); const startDay = mar.getUTCDate() - mar.getUTCDay(); const dstStart = new Date(Date.UTC(year, 2, startDay, 1, 0, 0)); const oct = new Date(Date.UTC(year, 9, 31)); const endDay = oct.getUTCDate() - oct.getUTCDay(); const dstEnd = new Date(Date.UTC(year, 9, endDay, 1, 0, 0)); return date >= dstStart && date < dstEnd; }
function getExpiryStatus(nr: NR): 'status-green' | 'status-yellow' | 'status-orange' { if (!nr.expiryDate || !nr.expiryTime || nr.isCaducado) return 'status-green'; try { const expiryDateTime = new Date(`${nr.expiryDate}T${(nr.expiryTime || '').trim()}Z`); if (isNaN(expiryDateTime.getTime())) return 'status-green'; const now = new Date(); if (expiryDateTime <= now) return 'status-green'; const hoursUntilExpiry = (expiryDateTime.getTime() - now.getTime()) / (1000 * 60 * 60); if (hoursUntilExpiry > 24) return 'status-green'; return 'status-orange'; } catch (e) { return 'status-green'; } }

async function syncWithSalvamento() {
    const user = getCurrentUser();
    if (!user) return;
    const avisosOficiales = state.salvamentoAvisos;
    let nrsActualizados = [...state.appData.nrs];
    let nuevosLogs: HistoryLog[] = [];
    let hayCambios = false;
    const ZONAS_RELEVANTES = ['ESPAÑA COSTA N', 'ESPAÑA COSTA NW', 'CORUÑA'];
    const avisosRelevantes = avisosOficiales.filter(aviso => ZONAS_RELEVANTES.some(zona => aviso.zona.toUpperCase().includes(zona)) || aviso.tipo.toUpperCase() === 'NAVTEX');
    const officialBaseIds = avisosRelevantes.map(a => getBaseId(a.num));

    for (const aviso of avisosRelevantes) {
        const avisoBaseId = getBaseId(aviso.num);
        const isNavtexAviso = aviso.tipo.toUpperCase() === 'NAVTEX' || aviso.zona.toUpperCase().includes('CORUÑA');
        const activeLocalVersion = nrsActualizados.find(nr => nr.baseId === avisoBaseId && !nr.isCaducado);

        if (activeLocalVersion) {
            const alreadyHasNavtex = activeLocalVersion.stations.includes('Navtex');
            if (isNavtexAviso && !alreadyHasNavtex) {
                hayCambios = true;
                const index = nrsActualizados.findIndex(nr => nr.id === activeLocalVersion.id);
                if (index > -1) {
                    nrsActualizados[index].stations.push('Navtex');
                    nuevosLogs.push({ id: `log-${Date.now()}-${avisoBaseId}`, timestamp: new Date().toISOString(), user: 'SISTEMA', action: 'EDITADO', nrId: avisoBaseId, details: `Añadida automáticamente la estación Navtex.` });
                }
            }
        } else {
            const allLocalVersions = nrsActualizados.filter(nr => nr.baseId === avisoBaseId);
            const latestCaducadoVersion = allLocalVersions.filter(nr => nr.isCaducado).sort((a, b) => b.version - a.version)[0]; 
            if (latestCaducadoVersion) {
                hayCambios = true;
                const index = nrsActualizados.findIndex(nr => nr.id === latestCaducadoVersion.id);
                if (index > -1) {
                    const { expiryDate, expiryTime } = parseExpiry(aviso.caducidad);
                    nrsActualizados[index].isCaducado = false;
                    nrsActualizados[index].expiryDate = expiryDate;
                    nrsActualizados[index].expiryTime = expiryTime;
                    if (isNavtexAviso && !nrsActualizados[index].stations.includes('Navtex')) nrsActualizados[index].stations.push('Navtex');
                    nuevosLogs.push({ id: `log-${Date.now()}-${avisoBaseId}`, timestamp: new Date().toISOString(), user: 'SISTEMA', action: 'EDITADO', nrId: avisoBaseId, details: `Reactivado automáticamente desde SASEMAR.` });
                }
            } else {
                hayCambios = true;
                const { expiryDate, expiryTime } = parseExpiry(aviso.caducidad);
                const newNR: NR = { id: `NR-${avisoBaseId}`, baseId: avisoBaseId, version: 1, stations: [], expiryDate, expiryTime, isAmpliado: false, isCaducado: false, isManual: false };
                if (isNavtexAviso) newNR.stations.push('Navtex');
                nrsActualizados.push(newNR);
                nuevosLogs.push({ id: `log-${Date.now()}-${avisoBaseId}`, timestamp: new Date().toISOString(), user: 'SISTEMA', action: 'AÑADIDO', nrId: avisoBaseId, details: `Añadido automáticamente desde SASEMAR.` });
            }
        }
    }
    const nrsToCancel = nrsActualizados.filter(nr => !nr.isCaducado && !nr.isManual && !officialBaseIds.includes(nr.baseId));
    if (nrsToCancel.length > 0) {
        hayCambios = true;
        nrsToCancel.forEach(nr => {
            const index = nrsActualizados.findIndex(n => n.id === nr.id);
            if (index > -1) {
                nrsActualizados[index].isCaducado = true;
                nuevosLogs.push({ id: `log-${Date.now()}-${nr.baseId}-cancel`, timestamp: new Date().toISOString(), user: 'SISTEMA', action: 'CANCELADO', nrId: nr.baseId, details: `Cancelado automáticamente.` });
            }
        });
    }
    if (hayCambios) {
        const finalData: AppData = { nrs: nrsActualizados, history: [...nuevosLogs, ...state.appData.history] };
        try { await api.saveData(finalData); state.appData = finalData; showToast(`Sincronización completada.`, 'info'); } catch (error) { showToast("Error al guardar.", "error"); }
    }
}

async function updateSalvamentoData() {
    state.isSalvamentoLoading = true;
    try {
        const response = await fetch('/api/salvamento-avisos');
        if (!response.ok) throw new Error('Error del servidor.');
        state.salvamentoAvisos = await response.json();
        state.lastSalvamentoUpdate = new Date();
        await syncWithSalvamento();
    } catch (e) { state.salvamentoAvisos = []; state.salvamentoError = 'No se pudo conectar con la fuente oficial.'; } finally { state.isSalvamentoLoading = false; }
}

async function handleViewPdf(eventTarget: string, title: string) {
    if (!eventTarget && !title) return showToast("No se puede obtener el PDF.", "error");
    const modalId = `pdf-modal-${Date.now()}`;
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = modalId;
    modalOverlay.innerHTML = `<div class="modal-content" style="max-width: 800px; text-align: left;"><h2 class="modal-title">Texto: ${title}</h2><div id="pdf-content-${modalId}" style="min-height: 200px;"><div class="loader-container"><div class="loader"></div><p style="margin-top:1rem; color:var(--text-secondary);">Descargando PDF...</p></div></div><div class="button-container" style="justify-content: flex-end; margin-top: 1.5rem; border-top: none; padding-top: 0;"><button class="primary-btn modal-close-btn" style="margin-top: 0; width: auto;">Cerrar</button></div></div>`;
    document.body.appendChild(modalOverlay);
    const closeModal = () => modalOverlay.remove();
    modalOverlay.querySelector('.modal-close-btn')?.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    try {
        const response = await fetch('/api/salvamento-avisos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventTarget, nrTitle: title })
        });
        if (!response.ok) throw new Error((await response.json()).error);
        const data = await response.json();
        const contentDiv = document.getElementById(`pdf-content-${modalId}`);
        if (contentDiv) contentDiv.innerHTML = `<div style="background: var(--bg-main); padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; font-family: var(--font-mono); white-space: pre-wrap; font-size: 0.9rem; max-height: 60vh; overflow-y: auto;">${data.text}</div>`;
    } catch (error) {
        const contentDiv = document.getElementById(`pdf-content-${modalId}`);
        if (contentDiv) contentDiv.innerHTML = `<p class="error">Error: ${error instanceof Error ? error.message : "Desconocido"}</p>`;
    }
}

// --- CORE RENDER LOGIC ---

async function reRender() {
    if (!state.componentContainer) return;
    state.componentContainer.innerHTML = renderLocalManagerHTML();
}

async function loadInitialData(showLoadingState: boolean = true) {
    if (showLoadingState) { state.isAppDataLoading = true; state.appDataError = null; await reRender(); }
    try { state.appData = await api.getData(); await updateSalvamentoData(); } catch (error) { state.appDataError = error instanceof Error ? error.message : "Error"; } finally { state.isAppDataLoading = false; await reRender(); }
}

export function renderRadioavisos(container: HTMLElement) {
    state.componentContainer = container;
    if (!getCurrentUser()) { container.innerHTML = `<div class="content-card"><p class="error">Auth required.</p></div>`; return; }
    if (!(container as any).__radioavisosListenersAttached) { attachEventListeners(container); (container as any).__radioavisosListenersAttached = true; }
    loadInitialData();
}

function renderLocalManagerHTML(): string {
    if (state.isAppDataLoading) return `<div class="content-card"><div class="loader-container"><div class="loader"></div></div></div>`;
    if (state.appDataError) return `<div class="content-card"><p class="error">${state.appDataError}</p></div>`;
    const views: { id: View, name: string }[] = [{ id: 'NX', name: 'NX' }, { id: 'AÑADIR', name: 'Añadir Manual' }, { id: 'HISTORIAL', name: 'Historial' }];
    return `<div class="content-card"><div class="info-nav-tabs">${views.map(v => `<button class="info-nav-btn ${state.currentView === v.id ? 'active' : ''}" data-view="${v.id}" data-action="switch-view">${v.name}</button>`).join('')}</div><div id="radioavisos-view-content" style="margin-top: 2rem;">${renderCurrentViewContent()}</div></div>`;
}

function renderCurrentViewContent(): string {
    switch (state.currentView) {
        case 'NX': return `${renderStationStatusTableHTML()}<div class="form-divider" style="width: 100%; margin: 2.5rem auto 2rem auto;"><span>Listado Detallado y Acciones</span></div>${renderMasterNrTableHTML()}`;
        case 'AÑADIR': return renderAddView();
        case 'HISTORIAL': return renderHistoryView();
        default: return `<p>Vista no encontrada</p>`;
    }
}

// --- RENDER IMPLEMENTATIONS ---

function renderStationStatusTableHTML() {
    const relevantNrs = state.appData.nrs.filter(nr => !nr.isCaducado);
    const stationStatus: Record<string, string> = {};
    
    ALL_STATIONS.forEach(station => {
        const nrsForStation = relevantNrs.filter(nr => nr.stations.includes(station));
        let status = 'status-green';
        if (nrsForStation.length > 0) {
            status = 'status-yellow';
            if (nrsForStation.some(nr => getExpiryStatus(nr) === 'status-orange')) {
                status = 'status-orange';
            }
        }
        stationStatus[station] = status;
    });

    // Helper to render a table cell with optional colspan
    const renderCell = (station: string, colspan: number = 1) => `
        <td colspan="${colspan}" style="text-align: center; padding: 0.5rem; vertical-align: middle; border-left: 1px solid var(--border-color);">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                <span class="status-dot ${stationStatus[station] || 'status-green'}"></span>
                <span style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap;">${station.replace(' VHF','').replace(' MF','')}</span>
            </div>
        </td>
    `;

    // Calculate colspans to align MF stations roughly with VHF stations in a 10-column grid
    // VHF has 10 stations. MF has 3 + Navtex = 4 items. 
    // Spanning logic: Finisterre(2), Coruña(3), Machichaco(3), Navtex(2) -> Total 10
    
    return `
        <div class="station-table-container">
            <h3>Estado de Estaciones (Avisos en Vigor)</h3>
            <div class="table-wrapper">
                <table class="station-table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                    <thead>
                        <tr><th colspan="10" class="header-vhf" style="border-bottom: 1px solid var(--border-color);">VHF</th></tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            ${STATIONS_VHF.map(s => renderCell(s)).join('')}
                        </tr>
                    </tbody>
                    <thead>
                        <tr>
                            <th colspan="8" class="header-mf" style="border-bottom: 1px solid var(--border-color);">MF</th>
                            <th colspan="2" class="header-navtex" style="border-bottom: 1px solid var(--border-color); border-left: 1px solid var(--border-color);">NAVTEX</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            ${renderCell('Finisterre MF', 2)}
                            ${renderCell('Coruña MF', 3)}
                            ${renderCell('Machichaco MF', 3)}
                            ${renderCell('Navtex', 2)}
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="status-legend" style="padding: 0.5rem 1rem; border-top: 1px solid var(--border-color);">
                <div class="legend-item"><span class="status-dot status-green"></span><span>Sin Avisos</span></div>
                <div class="legend-item"><span class="status-dot status-yellow"></span><span>Aviso en Vigor</span></div>
                <div class="legend-item"><span class="status-dot status-orange"></span><span>Caducando</span></div>
            </div>
        </div>
    `;
}

function renderMasterNrTableHTML() {
    let nrs = state.appData.nrs;
    if (state.filterText) {
        const ft = state.filterText.toLowerCase();
        nrs = nrs.filter(nr => nr.id.toLowerCase().includes(ft) || nr.baseId.toLowerCase().includes(ft));
    }
    nrs.sort((a, b) => {
        let valA: any = a[state.sortConfig.key];
        let valB: any = b[state.sortConfig.key];
        if (state.sortConfig.key === 'id') {
             valA = parseInt(a.baseId.split('/')[0]) || 0;
             valB = parseInt(b.baseId.split('/')[0]) || 0;
        }
        return state.sortConfig.direction === 'ascending' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });

    if (nrs.length === 0) return `<div class="content-card"><p class="drill-placeholder">No hay radioavisos registrados.</p></div>`;

    return `
        <div class="filterable-table-header">
            <input type="text" class="filter-input" placeholder="Filtrar por ID..." value="${state.filterText}" oninput="window.updateNrFilter(this.value)">
        </div>
        <div class="table-wrapper">
            <table class="reference-table data-table">
                <thead>
                    <tr>
                        <th data-sort-key="id" class="${state.sortConfig.key === 'id' ? (state.sortConfig.direction === 'ascending' ? 'sort-ascending' : 'sort-descending') : ''}" onclick="window.sortNrs('id')">ID</th>
                        <th>Ver.</th>
                        <th>Estaciones</th>
                        <th>Caducidad</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${nrs.map(nr => {
                        const statusColor = nr.isCaducado ? 'gray' : (getExpiryStatus(nr) === 'status-orange' ? 'orange' : 'green');
                        const statusText = nr.isCaducado ? 'CANCELADO' : 'EN VIGOR';
                        // Try to find official title
                        const official = state.salvamentoAvisos.find(a => getBaseId(a.num) === nr.baseId);
                        const titleForPdf = official ? official.asunto : '';
                        const targetForPdf = official ? official.eventTarget : '';

                        return `
                        <tr style="${nr.isCaducado ? 'opacity: 0.6; background-color: var(--bg-main);' : ''}">
                            <td style="font-weight: 500;">${nr.id}</td>
                            <td style="text-align: center;">${nr.version}</td>
                            <td><div style="display:flex; gap:0.25rem; flex-wrap:wrap;">${nr.stations.map(s => `<span style="font-size:0.75rem; background:var(--bg-nav-top); color:white; padding:2px 4px; border-radius:4px;">${s.replace(' VHF','').replace(' MF','')}</span>`).join('')}</div></td>
                            <td>${getFormattedDateTime(`${nr.expiryDate}T${nr.expiryTime}`)}</td>
                            <td><span class="category-badge" style="background-color: ${statusColor === 'green' ? 'var(--accent-color)' : (statusColor === 'orange' ? 'var(--danger-color)' : 'var(--text-secondary)')};">${statusText}</span></td>
                            <td>
                                <div style="display: flex; gap: 0.5rem;">
                                    ${targetForPdf ? `<button class="secondary-btn" data-action="view-pdf" data-event-target="${targetForPdf}" data-title="${titleForPdf}" title="Ver Texto PDF"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/></svg></button>` : ''}
                                    ${!nr.isCaducado ? `<button class="tertiary-btn" onclick="window.cancelNr('${nr.id}')" title="Cancelar">Cancelar</button>` : ''}
                                    <button class="secondary-btn" onclick="window.deleteNr('${nr.id}')" title="Borrar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderAddView() {
    return `
        <form id="add-nr-form" class="simulator-form" style="display: block; max-width: 600px; margin: 0 auto;">
            <div class="form-group">
                <label>ID Base (ej: 2237/2025)</label>
                <input name="baseId" class="simulator-input" required placeholder="XXXX/YYYY">
            </div>
            <div class="form-group">
                <label>Estaciones Afectadas</label>
                <div class="checkbox-group">
                    ${ALL_STATIONS.map(s => `
                        <label class="checkbox-item">
                            <input type="checkbox" name="stations" value="${s}">
                            <span>${s}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label>Fecha Caducidad</label>
                <div style="display: flex; gap: 1rem;">
                    <input type="date" name="expiryDate" class="simulator-input" required>
                    <input type="time" name="expiryTime" class="simulator-input" required>
                </div>
            </div>
            <button type="submit" class="primary-btn">Añadir Radioaviso</button>
        </form>
    `;
}

function renderHistoryView() {
    return `
        <div class="table-wrapper">
            <table class="reference-table">
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>ID</th><th>Detalles</th></tr></thead>
                <tbody>
                    ${state.appData.history.map(h => `
                        <tr>
                            <td>${new Date(h.timestamp).toLocaleString()}</td>
                            <td>${h.user}</td>
                            <td>${h.action}</td>
                            <td>${h.nrId}</td>
                            <td>${h.details}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// --- GLOBAL HANDLERS ---
(window as any).updateNrFilter = debounce((val: string) => { state.filterText = val; reRender(); }, 300);
(window as any).sortNrs = (key: keyof NR) => {
    state.sortConfig.direction = (state.sortConfig.key === key && state.sortConfig.direction === 'ascending') ? 'descending' : 'ascending';
    state.sortConfig.key = key;
    reRender();
};
(window as any).cancelNr = async (id: string) => {
    if (!confirm('¿Cancelar este radioaviso?')) return;
    const nr = state.appData.nrs.find(n => n.id === id);
    if (nr) {
        nr.isCaducado = true;
        state.appData.history.unshift({ id: `log-${Date.now()}`, timestamp: new Date().toISOString(), user: getCurrentUser()?.username || '?', action: 'CANCELADO', nrId: nr.baseId, details: 'Cancelación manual' });
        await api.saveData(state.appData);
        reRender();
        showToast('Radioaviso cancelado', 'success');
    }
};
(window as any).deleteNr = async (id: string) => {
    if (!confirm('¿Eliminar totalmente este registro? Se recomienda cancelar en su lugar.')) return;
    state.appData.nrs = state.appData.nrs.filter(n => n.id !== id);
    await api.saveData(state.appData);
    reRender();
    showToast('Registro eliminado', 'info');
};

function attachEventListeners(container: HTMLElement) {
    container.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const actionElement = target.closest<HTMLElement>('[data-action]');
        if (actionElement) {
            const action = actionElement.dataset.action;
            if(action === 'refresh-salvamento') { state.isSalvamentoLoading = true; await reRender(); await updateSalvamentoData(); await reRender(); }
            else if(action === 'switch-view') { state.currentView = actionElement.dataset.view as View; await reRender(); }
            else if(action === 'view-pdf') await handleViewPdf(actionElement.dataset.eventTarget!, actionElement.dataset.title!);
        }
    });
    
    // Handle Add Form
    container.addEventListener('submit', async (e) => {
        const target = e.target as HTMLFormElement;
        if (target.id === 'add-nr-form') {
            e.preventDefault();
            const formData = new FormData(target);
            const stations = formData.getAll('stations') as string[];
            if (stations.length === 0) return showToast('Seleccione al menos una estación', 'error');
            
            const baseId = formData.get('baseId') as string;
            const newNr: NR = {
                id: `NR-${baseId}`,
                baseId,
                version: 1,
                stations,
                expiryDate: formData.get('expiryDate') as string,
                expiryTime: formData.get('expiryTime') as string,
                isAmpliado: false,
                isCaducado: false,
                isManual: true
            };
            
            state.appData.nrs.push(newNr);
            state.appData.history.unshift({ id: `log-${Date.now()}`, timestamp: new Date().toISOString(), user: getCurrentUser()?.username || '?', action: 'AÑADIDO', nrId: baseId, details: 'Añadido manualmente' });
            await api.saveData(state.appData);
            state.currentView = 'NX';
            reRender();
            showToast('Radioaviso añadido', 'success');
        }
    });
}
