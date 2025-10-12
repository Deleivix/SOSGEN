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
    id: string; // The full ID, e.g., "NR-2237/2025" or "NR-2237/2025-2"
    baseId: string; // The core part, e.g., "2237/2025"
    version: number;
    stations: string[];
    expiryDate: string;
    expiryTime: string;
    isAmpliado: boolean;
    isCaducado: boolean;
};
type HistoryLog = {
    id: string; timestamp: string; user: string;
    action: 'AÑADIDO' | 'EDITADO' | 'BORRADO' | 'CANCELADO';
    nrId: string; details: string;
};
type AppData = { nrs: NR[]; history: HistoryLog[]; };
type View = 'RADIOAVISOS' | 'AÑADIR' | 'HISTORIAL';
type SortDirection = 'ascending' | 'descending';
type SortConfig<T> = { key: keyof T; direction: SortDirection };

// --- Centralized Component State ---
let state = {
    appData: { nrs: [] as NR[], history: [] as HistoryLog[] },
    isAppDataLoading: true,
    appDataError: null as string | null,
    currentView: 'RADIOAVISOS' as View,
    componentContainer: null as HTMLElement | null,
    // Salvamento Data
    salvamentoAvisos: [] as SalvamentoAviso[],
    isSalvamentoLoading: false,
    salvamentoError: null as string | null,
    lastSalvamentoUpdate: null as Date | null,
    // Unified Table State
    filterText: '',
    sortConfig: { key: 'id' as keyof NR, direction: 'ascending' as SortDirection },
    // History Table State
    historyFilterText: '',
    historySortConfig: { key: 'timestamp' as keyof HistoryLog, direction: 'descending' as SortDirection },
};

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

function getBaseId(fullId: string): string {
    return (fullId || '').replace(/^NR-/, '').split('-')[0];
}

function getVersion(fullId: string): number {
    const parts = (fullId || '').split('-');
    return parts.length > 2 ? parseInt(parts[2], 10) : 1;
}

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
    if (!caducidad) {
        return { expiryDate: '', expiryTime: '' };
    }
    const parts = caducidad.trim().split(/\s+/);
    if (parts.length < 2) return { expiryDate: '', expiryTime: '' };

    const datePart = parts[0];
    let timePart = parts[1] ? parts[1].trim() : '';

    // Pad the hour if it's a single digit (e.g., "9:46" -> "09:46")
    if (timePart.includes(':')) {
        const timeComponents = timePart.split(':');
        if (timeComponents.length === 2) {
            timeComponents[0] = timeComponents[0].padStart(2, '0');
            timePart = timeComponents.join(':');
        }
    }

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


const getMedioTags = (zona: string): string[] => {
    const upperZona = zona.toUpperCase();
    const zonasArray = upperZona.split(',').map(z => z.trim()).filter(Boolean);
    const hasCoruna = zonasArray.includes('CORUÑA');
    const hasOtherZones = zonasArray.some(z => z !== 'CORUÑA');
    const tags: string[] = [];
    if (hasCoruna) tags.push('NAVTEX');
    if (hasOtherZones || !hasCoruna) tags.push('FONÍA');
    return tags;
};

function isDstSpain(date: Date = new Date()): boolean {
    const year = date.getFullYear();
    const mar = new Date(Date.UTC(year, 2, 31));
    const startDay = mar.getUTCDate() - mar.getUTCDay();
    const dstStart = new Date(Date.UTC(year, 2, startDay, 1, 0, 0));
    const oct = new Date(Date.UTC(year, 9, 31));
    const endDay = oct.getUTCDate() - oct.getUTCDay();
    const dstEnd = new Date(Date.UTC(year, 9, endDay, 1, 0, 0));
    return date >= dstStart && date < dstEnd;
}

function getExpiryStatus(nr: NR): 'status-green' | 'status-yellow' | 'status-orange' {
    if (!nr.expiryDate || !nr.expiryTime) return 'status-green';
    try {
        const expiryDateTime = new Date(`${nr.expiryDate}T${(nr.expiryTime || '').trim()}Z`);
        if (isNaN(expiryDateTime.getTime())) return 'status-green';

        const now = new Date();
        if (expiryDateTime <= now) return 'status-green';
        const hoursUntilExpiry = (expiryDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilExpiry > 24) return 'status-green';
        
        const spainOffsetHours = isDstSpain(now) ? 2 : 1;
        const nowInSpainTimezone = new Date(now.getTime() + spainOffsetHours * 3600 * 1000);
        const currentSpainHour = nowInSpainTimezone.getUTCHours();
        const shiftEndInSpainTimezone = new Date(nowInSpainTimezone);
        shiftEndInSpainTimezone.setUTCMinutes(0, 0, 0);
        
        if (currentSpainHour >= 7 && currentSpainHour < 15) shiftEndInSpainTimezone.setUTCHours(15);
        else if (currentSpainHour >= 15 && currentSpainHour < 23) shiftEndInSpainTimezone.setUTCHours(23);
        else {
            if (currentSpainHour >= 23) shiftEndInSpainTimezone.setUTCDate(shiftEndInSpainTimezone.getUTCDate() + 1);
            shiftEndInSpainTimezone.setUTCHours(7);
        }
        
        const actualShiftEndUTC = new Date(shiftEndInSpainTimezone.getTime() - spainOffsetHours * 3600 * 1000);
        if (expiryDateTime <= actualShiftEndUTC) return 'status-orange';
        return 'status-yellow';
    } catch (e) {
        return 'status-green';
    }
}

// =================================================================================
// --- DATA PROCESSING & SYNC LOGIC ---
// =================================================================================

async function syncWithSalvamento() {
    const user = getCurrentUser();
    if (!user) return;

    const avisosOficiales = state.salvamentoAvisos;
    let nrsActualizados = [...state.appData.nrs];
    let nuevosLogs: HistoryLog[] = [];
    let hayCambios = false;

    const ZONAS_RELEVANTES = ['ESPAÑA COSTA N', 'ESPAÑA COSTA NW', 'CORUÑA'];
    const avisosRelevantes = avisosOficiales.filter(aviso => 
        ZONAS_RELEVANTES.some(zona => aviso.zona.toUpperCase().includes(zona)) || 
        aviso.tipo.toUpperCase() === 'NAVTEX'
    );

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
                    nuevosLogs.push({ id: `log-${Date.now()}-${avisoBaseId}`, timestamp: new Date().toISOString(), user: 'SISTEMA', action: 'EDITADO', nrId: avisoBaseId, details: `Añadida automáticamente la estación Navtex a la versión ${activeLocalVersion.version}.` });
                }
            }
        } else {
            const allLocalVersions = nrsActualizados.filter(nr => nr.baseId === avisoBaseId);
            const latestCaducadoVersion = allLocalVersions
                .filter(nr => nr.isCaducado)
                .sort((a, b) => b.version - a.version)[0]; 

            if (latestCaducadoVersion) {
                hayCambios = true;
                const index = nrsActualizados.findIndex(nr => nr.id === latestCaducadoVersion.id);
                if (index > -1) {
                    const { expiryDate, expiryTime } = parseExpiry(aviso.caducidad);
                    nrsActualizados[index].isCaducado = false;
                    nrsActualizados[index].expiryDate = expiryDate;
                    nrsActualizados[index].expiryTime = expiryTime;
                    
                    if (isNavtexAviso && !nrsActualizados[index].stations.includes('Navtex')) {
                        nrsActualizados[index].stations.push('Navtex');
                    }
                    
                    nuevosLogs.push({ id: `log-${Date.now()}-${avisoBaseId}`, timestamp: new Date().toISOString(), user: 'SISTEMA', action: 'EDITADO', nrId: avisoBaseId, details: `Reactivado automáticamente (versión ${latestCaducadoVersion.version}) desde SASEMAR.` });
                }
            } else {
                hayCambios = true;
                const { expiryDate, expiryTime } = parseExpiry(aviso.caducidad);
                const newNR: NR = {
                    id: `NR-${avisoBaseId}`,
                    baseId: avisoBaseId,
                    version: 1,
                    stations: [],
                    expiryDate,
                    expiryTime,
                    isAmpliado: false,
                    isCaducado: false,
                };
                if (isNavtexAviso) newNR.stations.push('Navtex');
                nrsActualizados.push(newNR);
                nuevosLogs.push({ id: `log-${Date.now()}-${avisoBaseId}`, timestamp: new Date().toISOString(), user: 'SISTEMA', action: 'AÑADIDO', nrId: avisoBaseId, details: `Añadido automáticamente (versión 1) desde SASEMAR. ${isNavtexAviso ? 'Asignado a Navtex.' : ''}` });
            }
        }
    }

    if (hayCambios) {
        const finalData: AppData = { nrs: nrsActualizados, history: [...nuevosLogs, ...state.appData.history] };
        try {
            await api.saveData(finalData);
            state.appData = finalData;
            showToast(`Sincronización con SASEMAR completada.`, 'info');
        } catch (error) {
            showToast("Error al guardar los NRs importados/actualizados.", "error");
        }
    }
}

async function updateSalvamentoData() {
    state.isSalvamentoLoading = true;
    state.salvamentoError = null;
    try {
        const response = await fetch('/api/salvamento-avisos');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Respuesta no válida del servidor.');
        }
        state.salvamentoAvisos = await response.json();
        state.lastSalvamentoUpdate = new Date();
        await syncWithSalvamento();
    } catch (e) {
        state.salvamentoAvisos = [];
        state.salvamentoError = 'No se pudo conectar con la fuente oficial de Salvamento Marítimo.';
    } finally {
        state.isSalvamentoLoading = false;
    }
}

// =================================================================================
// --- CORE RENDERING LOGIC ---
// =================================================================================

async function reRender() {
    if (!state.componentContainer) return;
    const activeElementId = document.activeElement?.id;
    state.componentContainer.innerHTML = renderLocalManagerHTML();
    const activeElement = activeElementId ? document.getElementById(activeElementId) : null;
    if (activeElement instanceof HTMLElement) activeElement.focus();
}

async function loadInitialData(showLoadingState: boolean = true) {
    if (showLoadingState) {
        state.isAppDataLoading = true;
        state.appDataError = null;
        await reRender(); // Show skeletons immediately
    }
    try {
        state.appData = await api.getData();
        await updateSalvamentoData();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        state.appDataError = message;
    } finally {
        state.isAppDataLoading = false; // Always set to false at the end
        await reRender();
    }
}

export function renderRadioavisos(container: HTMLElement) {
    state.componentContainer = container;
    if (!getCurrentUser()) {
        container.innerHTML = `<div class="content-card"><p class="error">Debe iniciar sesión para acceder a esta herramienta.</p></div>`;
        return;
    }
    if (!(container as any).__radioavisosListenersAttached) {
        attachEventListeners(container);
        (container as any).__radioavisosListenersAttached = true;
    }
    loadInitialData();
}

function renderLocalManagerHTML(): string {
    const user = getCurrentUser();
    if (!user) return `<div class="content-card"><p class="error">Error de autenticación.</p></div>`;

    if (state.isAppDataLoading) {
        return `<div class="content-card"><div class="loader-container"><div class="loader"></div></div></div>`;
    }
    if (state.appDataError) {
        return `<div class="content-card"><p class="error">${state.appDataError}</p></div>`;
    }

    const views: { id: View, name: string }[] = [
        { id: 'RADIOAVISOS', name: 'Radioavisos' }, { id: 'AÑADIR', name: 'Añadir Manual' },
        { id: 'HISTORIAL', name: 'Historial' }
    ];

    return `
        <div class="content-card">
            <div class="info-nav-tabs">
                ${views.map(v => `<button class="info-nav-btn ${state.currentView === v.id ? 'active' : ''}" data-view="${v.id}" data-action="switch-view">${v.name}</button>`).join('')}
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

async function handleGoToEdit(fullId: string) {
    if (!fullId) return;
    const nrToEdit = state.appData.nrs.find(nr => nr.id === fullId);
    if (nrToEdit) {
        renderEditNrModal(nrToEdit);
    } else {
        showToast(`No se encontró el NR ${fullId} para editar.`, 'error');
    }
}

async function handleCancelNR(baseId: string) {
    const user = getCurrentUser();
    if (!user) return showToast("Error de sesión.", "error");
    try {
        if (!state.appData.nrs.some(nr => nr.baseId === baseId && !nr.isCaducado)) {
            return showToast(`El NR ${baseId} no existe o ya está cancelado.`, "error");
        }
        if (!window.confirm(`¿Está seguro de que desea CANCELAR todas las versiones vigentes del NR ${baseId}?`)) return;
        
        const finalData: AppData = {
            nrs: state.appData.nrs.map(nr => (nr.baseId === baseId ? {...nr, isCaducado: true} : nr)),
            history: [{id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'CANCELADO', nrId: baseId, details: `Marcadas todas las versiones como caducadas.`}, ...state.appData.history]
        };
        await api.saveData(finalData);
        showToast(`${baseId} ha sido cancelado.`, 'info');
        await loadInitialData(false);
    } catch (error) {
        showToast("Error al cancelar: " + (error instanceof Error ? error.message : "Error desconocido"), "error");
    }
}

async function handleSort(element: HTMLElement) {
    const key = element.dataset.sortKey;
    const targetTable = element.dataset.table;
    if (!key) return;

    if (targetTable === 'nrs') {
        const isSameKey = state.sortConfig.key === key;
        state.sortConfig = { key: key as keyof NR, direction: isSameKey && state.sortConfig.direction === 'ascending' ? 'descending' : 'ascending' };
    } else if (targetTable === 'history') {
        const isSameKey = state.historySortConfig.key === key;
        state.historySortConfig = { key: key as keyof HistoryLog, direction: isSameKey && state.historySortConfig.direction === 'ascending' ? 'descending' : 'ascending' };
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
                case 'add-submit': await handleAddSubmit(); break;
                case 'go-to-edit': await handleGoToEdit(actionElement.dataset.nrId!); break;
                case 'cancel-nr': await handleCancelNR(actionElement.dataset.nrId!); break;
            }
        } else if (target.closest('th[data-sort-key]')) {
            await handleSort(target.closest('th[data-sort-key]')!);
        }
    });
    
    const debouncedFilter = debounce(async (e: Event) => {
        const input = e.target as HTMLInputElement;
        const target = input.dataset.filterTarget;
        if (target === 'nrs') state.filterText = input.value;
        else if (target === 'history') state.historyFilterText = input.value;
        await reRender();
    }, 300);

    container.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.dataset.action === 'filter') debouncedFilter(e);
    });
    
    container.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.id === 'add-is-versionado') (document.getElementById('add-versioned-id-container') as HTMLElement).style.display = target.checked ? 'block' : 'none';
        else if (target.id === 'add-has-expiry') (document.getElementById('add-expiry-inputs') as HTMLElement).style.display = target.checked ? 'flex' : 'none';
    });
}

async function handleAddSubmit() {
    const user = getCurrentUser();
    if (!user || !state.componentContainer) return;
    const container = state.componentContainer;
    try {
        const nrNum = (container.querySelector('#add-nr-num') as HTMLInputElement).value.trim();
        const nrYear = (container.querySelector('#add-nr-year') as HTMLInputElement).value.trim();
        if (!nrNum || !nrYear) return showToast("El número y el año del NR son obligatorios.", "error");
        const baseId = `${nrNum}/${nrYear}`;
        const stations = Array.from(container.querySelectorAll<HTMLInputElement>('#add-stations-group input:checked')).map(cb => cb.value);
        if (stations.length === 0) return showToast("Debe seleccionar al menos una estación.", "error");
        const versionadoCheckbox = container.querySelector('#add-is-versionado') as HTMLInputElement;
        const versionedFrom = versionadoCheckbox.checked ? (container.querySelector('#add-versioned-id') as HTMLInputElement).value.trim() : undefined;
        if (state.appData.nrs.some(nr => nr.baseId === baseId && !nr.isCaducado && !versionedFrom)) return showToast(`Error: El NR ${baseId} ya existe y está vigente.`, "error");
        
        let version = 1;
        let nrsToUpdate = [...state.appData.nrs];
        let historyToUpdate = [...state.appData.history];
        if (versionedFrom) {
            const versionedFromBaseId = getBaseId(`NR-${versionedFrom}`);
            const previousVersions = nrsToUpdate.filter(nr => nr.baseId === versionedFromBaseId);
            if (previousVersions.length > 0) {
                version = Math.max(...previousVersions.map(nr => nr.version)) + 1;
                nrsToUpdate = nrsToUpdate.map(nr => nr.baseId === versionedFromBaseId ? { ...nr, isCaducado: true } : nr);
                historyToUpdate.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'CANCELADO', nrId: versionedFromBaseId, details: `Versionado a ${baseId}`});
            }
        }
        const newId = version === 1 ? `NR-${baseId}` : `NR-${baseId}-${version}`;
        const expiryCheckbox = container.querySelector('#add-has-expiry') as HTMLInputElement;
        const newNR: NR = { id: newId, baseId: baseId, version, stations, expiryDate: expiryCheckbox.checked ? (container.querySelector('#add-expiry-date') as HTMLInputElement).value : '', expiryTime: expiryCheckbox.checked ? (container.querySelector('#add-expiry-time') as HTMLInputElement).value : '', isAmpliado: (container.querySelector('#add-is-ampliado') as HTMLInputElement).checked, isCaducado: false };
        historyToUpdate.unshift({ id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'AÑADIDO', nrId: baseId, details: `Añadida versión ${version}.` });
        
        const finalData: AppData = { nrs: [...nrsToUpdate, newNR], history: historyToUpdate };
        await api.saveData(finalData);
        showToast(`${newId} añadido.`, 'success');
        state.currentView = 'RADIOAVISOS';
        await loadInitialData(false);
    } catch (error) { showToast("Error al guardar: " + (error instanceof Error ? error.message : "Error"), "error"); }
}

async function handleEditSubmit(formContainer: HTMLElement, fullId: string) {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const nrToUpdate = state.appData.nrs.find(nr => nr.id === fullId);
        if (!nrToUpdate) {
            showToast("El NR a editar ya no existe.", "error");
            return loadInitialData();
        }
        const updatedStations = Array.from(formContainer.querySelectorAll<HTMLInputElement>('#modal-edit-stations-group input:checked')).map(cb => cb.value);
        if (updatedStations.length === 0) {
            showToast("Debe seleccionar al menos una estación.", "error");
            return;
        }
        const finalData: AppData = {
            nrs: state.appData.nrs.map(nr =>
                nr.id === fullId
                ? {
                    ...nr,
                    expiryDate: (formContainer.querySelector('#modal-edit-expiry-date') as HTMLInputElement).value,
                    expiryTime: (formContainer.querySelector('#modal-edit-expiry-time') as HTMLInputElement).value,
                    isAmpliado: (formContainer.querySelector('#modal-edit-is-ampliado') as HTMLInputElement).checked,
                    stations: updatedStations
                  }
                : nr),
            history: [{ id: Date.now().toString(), timestamp: new Date().toISOString(), user: user.username, action: 'EDITADO', nrId: getBaseId(fullId), details: `Editada versión ${nrToUpdate.version}.` }, ...state.appData.history]
        };
        await api.saveData(finalData);
        showToast(`${fullId} actualizado.`, 'success');
        await loadInitialData(false);
    } catch (error) {
        showToast("Error al guardar: " + (error instanceof Error ? error.message : "Error"), "error");
    }
}

// =================================================================================
// --- HTML TEMPLATES FOR VIEWS ---
// =================================================================================

function renderCurrentViewContent(): string {
    switch (state.currentView) {
        case 'RADIOAVISOS':
            return `
                ${renderStationStatusTableHTML()}
                <div class="form-divider" style="width: 100%; margin: 2.5rem auto 2rem auto;">
                    <span>Listado Detallado y Acciones</span>
                </div>
                ${renderMasterNrTableHTML()}
            `;
        case 'AÑADIR': return renderAddView();
        case 'HISTORIAL': return renderHistoryView();
        default: return `<p>Vista no encontrada</p>`;
    }
}

function renderStationStatusTableHTML(): string {
    const activeNRs = state.appData.nrs.filter(nr => !nr.isCaducado);

    // Use full station names as keys to avoid conflicts (e.g., "Finisterre VHF" vs "Finisterre MF")
    const nrsByStation: { [key: string]: NR[] } = {};
    ALL_STATIONS.forEach(stationFullName => {
        nrsByStation[stationFullName] = activeNRs
            .filter(nr => nr.stations.includes(stationFullName))
            .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    });

    const maxRows = Math.max(0, ...Object.values(nrsByStation).map(nrs => nrs.length));

    let tableBodyHtml = '';
    if (maxRows === 0) {
        tableBodyHtml = `<tr><td colspan="${ALL_STATIONS.length}" class="drill-placeholder">No hay NRs vigentes asignados a estaciones.</td></tr>`;
    } else {
        for (let i = 0; i < maxRows; i++) {
            tableBodyHtml += '<tr>';
            
            // Iterate through the stations in the correct display order
            STATIONS_VHF.forEach(stationFullName => {
                const nr = nrsByStation[stationFullName]?.[i];
                tableBodyHtml += `<td>${nr ? nr.baseId : ''}</td>`;
            });
            STATIONS_MF.forEach(stationFullName => {
                const nr = nrsByStation[stationFullName]?.[i];
                tableBodyHtml += `<td>${nr ? nr.baseId : ''}</td>`;
            });
            const navtexNr = nrsByStation['Navtex']?.[i];
            tableBodyHtml += `<td>${navtexNr ? navtexNr.baseId : ''}</td>`;

            tableBodyHtml += '</tr>';
        }
    }
    
    // Headers generation needs to match the body order and display names
    const headersHtml = `
        <thead>
            <tr>
                ${STATIONS_VHF.map(s => `<th class="header-vhf">${s.replace(' VHF', '')}</th>`).join('')}
                ${STATIONS_MF.map(s => `<th class="header-mf">${s}</th>`).join('')}
                <th class="header-navtex">Navtex</th>
            </tr>
        </thead>`;

    const lastAdded = state.appData.history.find(h => h.action === 'AÑADIDO');
    const lastEdited = state.appData.history.find(h => h.action === 'EDITADO');
    const lastDeleted = state.appData.history.find(h => h.action === 'BORRADO' || h.action === 'CANCELADO');

    return `
        <div class="station-table-container">
            <h3 style="text-align:center; padding: 0.75rem; margin:0;">Radioavisos Vigentes por Estación</h3>
            <div class="table-wrapper">
                <table class="station-table horizontal-table">
                    ${headersHtml}
                    <tbody>
                        ${tableBodyHtml}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total NRs vigentes:</div>
                <div class="value green">${activeNRs.length}</div>
            </div>
            <div class="stat-card">
                <div class="label">Último NR añadido:</div>
                <div class="value">${lastAdded ? lastAdded.nrId : '-'}</div>
                <div class="label">Por: ${lastAdded ? lastAdded.user : '-'}</div>
            </div>
            <div class="stat-card">
                <div class="label">Último NR editado:</div>
                <div class="value">${lastEdited ? lastEdited.nrId : '-'}</div>
                 <div class="label">Por: ${lastEdited ? lastEdited.user : '-'}</div>
            </div>
            <div class="stat-card">
                <div class="label">Último NR borrado:</div>
                <div class="value">${lastDeleted ? lastDeleted.nrId : '-'}</div>
                 <div class="label">Por: ${lastDeleted ? lastDeleted.user : '-'}</div>
            </div>
        </div>
    `;
}

function renderMasterNrTableHTML(): string {
    const spinnerIcon = `<svg class="spinner" style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    const refreshIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>`;
    const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/></svg>`;
    
    let content = '';
    const searchTerm = state.filterText.toLowerCase();
    const activeNRs = state.appData.nrs.filter(nr => !nr.isCaducado);
    
    const filteredNrs = activeNRs.filter(nr => {
        const officialAviso = state.salvamentoAvisos.find(aviso => aviso.num.includes(nr.baseId));
        return nr.id.toLowerCase().includes(searchTerm) ||
               (officialAviso?.asunto.toLowerCase().includes(searchTerm)) ||
               (officialAviso?.zona.toLowerCase().includes(searchTerm)) ||
               (nr.stations.join(', ').toLowerCase().includes(searchTerm));
    });

    const sortedNrs = [...filteredNrs].sort((a, b) => {
        const { key, direction } = state.sortConfig;
        const valueA = a[key];
        const valueB = b[key];
        const comparison = String(valueA).localeCompare(String(valueB), undefined, { numeric: true });
        return direction === 'ascending' ? comparison : -comparison;
    });

    if (sortedNrs.length === 0) {
        content = `<p class="drill-placeholder">No se encontraron NRs vigentes para los filtros aplicados.</p>`;
    } else {
        const renderHeader = (key: keyof NR, label: string) => {
            const isSorted = state.sortConfig.key === key;
            const sortClass = isSorted ? `sort-${state.sortConfig.direction}` : '';
            return `<th class="${sortClass}" data-sort-key="${key}" data-table="nrs">${label}</th>`;
        };

        content = `
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead>
                    <tr>
                        <th title="Estado de Caducidad">${clockIcon}</th>
                        ${renderHeader('id', 'NR')}
                        <th style="min-width: 250px;">Asunto</th>
                        <th style="min-width: 150px;">Zona</th>
                        <th>Estaciones</th>
                        <th>Prioridad</th>
                        <th>Medio</th>
                        ${renderHeader('expiryDate', 'Caducidad')}
                        <th title="Indica si las estaciones han sido asignadas manualmente">Revisado</th>
                        <th style="text-align: center;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                ${sortedNrs.map(nr => {
                    const officialAviso = state.salvamentoAvisos.find(aviso => aviso.num.includes(nr.baseId));
                    const medios = officialAviso ? getMedioTags(officialAviso.zona) : [];
                    
                    let isReviewed = false;
                    if (officialAviso) {
                        const zonasArray = officialAviso.zona.toUpperCase().split(',').map(z => z.trim()).filter(Boolean);
                        const requiresOnlyNavtex = zonasArray.every(z => z === 'CORUÑA') && zonasArray.length > 0;
                        const hasFoniaStation = nr.stations.some(s => s !== 'Navtex');
                        const hasNavtexStation = nr.stations.includes('Navtex');
                        isReviewed = (requiresOnlyNavtex && hasNavtexStation) || hasFoniaStation;
                    } else {
                        isReviewed = nr.stations.length > 0;
                    }

                    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="var(--accent-color-dark)" viewBox="0 0 16 16" aria-hidden="true"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/></svg>`;
                    const crossIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="var(--danger-color)" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>`;
                    return `
                        <tr>
                            <td style="text-align: center;"><span class="status-dot ${getExpiryStatus(nr)}"></span></td>
                            <td>${nr.id}</td>
                            <td style="white-space: normal;">${officialAviso?.asunto || '---'}</td>
                            <td>${officialAviso?.zona || '---'}</td>
                            <td>${nr.stations.length > 0 ? nr.stations.map(s => {
                                if (s.endsWith(' MF')) return s;
                                if (s.endsWith(' VHF')) return s.replace(' VHF', '');
                                return s;
                            }).join(', ') : '-'}</td>
                            <td>
                                ${officialAviso ? `<span class="category-badge ${officialAviso.prioridad.toLowerCase()}">${officialAviso.prioridad}</span>` : ''}
                            </td>
                            <td>
                                ${medios.map(m => `<span class="category-badge ${m.toLowerCase()}" style="margin-right: 4px;">${m}</span>`).join('')}
                            </td>
                            <td>${nr.expiryDate || 'N/A'} ${nr.expiryTime || ''}</td>
                            <td style="text-align: center;" title="${isReviewed ? 'Estaciones asignadas' : 'Asignación de estaciones pendiente'}">
                                ${isReviewed ? checkIcon : crossIcon}
                            </td>
                            <td>
                                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                                    <button class="secondary-btn" data-action="go-to-edit" data-nr-id="${nr.id}">Editar</button>
                                    <button class="tertiary-btn" data-action="cancel-nr" data-nr-id="${nr.baseId}">Cancelar</button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
                </tbody>
            </table>
        </div>
        <div class="status-legend">
            <div class="legend-item"><span class="status-dot status-orange"></span> Caduca en este turno</div>
            <div class="legend-item"><span class="status-dot status-yellow"></span> Caduca en las próximas 24h</div>
            <div class="legend-item"><span class="status-dot status-green"></span> Vigente (> 24h)</div>
        </div>`;
    }

    return `
        <div class="salvamento-panel-header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 1.5rem;">
            <div class="filterable-table-header" style="margin-bottom: 0; flex-grow: 1;">
                <input type="search" class="filter-input" placeholder="Filtrar radioavisos vigentes..." value="${state.filterText}" data-action="filter" data-filter-target="nrs">
            </div>
            <div class="salvamento-panel-controls">
                ${state.lastSalvamentoUpdate ? `<span class="last-update-text">${getFormattedDateTime(state.lastSalvamentoUpdate.toISOString())}</span>` : ''}
                <button class="secondary-btn update-btn" data-action="refresh-salvamento" ${state.isSalvamentoLoading ? 'disabled' : ''}>
                    ${state.isSalvamentoLoading ? spinnerIcon : refreshIcon}
                    <span>${state.isSalvamentoLoading ? 'Actualizando...' : 'Actualizar'}</span>
                </button>
            </div>
        </div>
        ${state.salvamentoError ? `<p class="error" style="text-align: center; margin-bottom: 1rem;">${state.salvamentoError}</p>` : ''}
        ${content}
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
        </div>
    `;
}

function renderHistoryView(): string {
    const searchTerm = state.historyFilterText.toLowerCase();
    const filteredHistory = state.appData.history.filter(log => log.nrId.toLowerCase().includes(searchTerm) || log.user.toLowerCase().includes(searchTerm) || log.action.toLowerCase().includes(searchTerm) || log.details.toLowerCase().includes(searchTerm));
    const sortedHistory = [...filteredHistory].sort((a, b) => {
        const { key, direction } = state.historySortConfig;
        const comparison = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true });
        return direction === 'ascending' ? comparison : -comparison;
    });

    if (sortedHistory.length === 0) return `<div class="filterable-table-header"><input type="search" class="filter-input" placeholder="Filtrar historial..." value="${state.historyFilterText}" data-action="filter" data-filter-target="history"></div><p class="drill-placeholder">No hay operaciones en el historial.</p>`;
    
    const renderHeader = (key: keyof HistoryLog, label: string) => `<th class="${state.historySortConfig.key === key ? `sort-${state.historySortConfig.direction}` : ''}" data-sort-key="${key}" data-table="history">${label}</th>`;

    return `
        <div class="filterable-table-header"><input type="search" class="filter-input" placeholder="Filtrar historial..." value="${state.historyFilterText}" data-action="filter" data-filter-target="history"></div>
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead><tr>${renderHeader('nrId', 'NR')}${renderHeader('timestamp', 'F/H Acción')}${renderHeader('user', 'Usuario')}${renderHeader('action', 'Acción')}${renderHeader('details', 'Detalles')}</tr></thead>
                <tbody>${sortedHistory.map(log => `<tr><td>${log.nrId}</td><td>${getFormattedDateTime(log.timestamp)}</td><td>${log.user}</td><td>${log.action}</td><td>${log.details}</td></tr>`).join('')}</tbody>
            </table>
        </div>`;
}

function renderEditNrModal(nr: NR) {
    const modalId = `edit-nr-modal-${nr.id.replace(/[^a-zA-Z0-9]/g, '-')}`;
    if (document.getElementById(modalId)) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = modalId;

    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 800px; text-align: left;">
            <h2 class="modal-title">Editar NR: ${nr.id}</h2>
            <form id="edit-nr-form-${nr.id.replace(/[^a-zA-Z0-9]/g, '-')}">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Fecha Caducidad (UTC)</label>
                        <div style="display:flex; gap: 1rem;">
                            <input type="date" id="modal-edit-expiry-date" class="simulator-input" value="${nr.expiryDate || ''}" />
                            <input type="time" id="modal-edit-expiry-time" class="simulator-input" value="${(nr.expiryTime || '').trim()}" />
                        </div>
                    </div>
                     <div class="form-group">
                         <label style="margin-top: 1.5rem;"><input type="checkbox" id="modal-edit-is-ampliado" ${nr.isAmpliado ? 'checked' : ''} /> NR Ampliado</label>
                    </div>
                </div>
                <h3 class="reference-table-subtitle" style="margin-top: 2rem;">Marque las EECC:</h3>
                <div class="checkbox-group" id="modal-edit-stations-group">
                    ${ALL_STATIONS.map(station => `
                        <div class="checkbox-item">
                            <input type="checkbox" id="modal-edit-${station.replace(/\s/g, '-')}" value="${station}" ${nr.stations.includes(station) ? 'checked' : ''}>
                            <label for="modal-edit-${station.replace(/\s/g, '-')}">${station}</label>
                        </div>
                    `).join('')}
                </div>
            </form>
            <div class="button-container" style="justify-content: flex-end; border-top:none; padding-top: 1rem;">
                <button class="secondary-btn modal-cancel-btn">Cancelar</button>
                <button class="primary-btn modal-save-btn" style="margin-top: 0; width: auto;">Guardar Cambios</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();
    
    modalOverlay.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === modalOverlay || target.closest('.modal-cancel-btn')) {
            closeModal();
        } else if (target.closest('.modal-save-btn')) {
            const form = modalOverlay.querySelector('form');
            if(form) {
                handleEditSubmit(form, nr.id).then(() => {
                    closeModal();
                });
            }
        }
    });
}