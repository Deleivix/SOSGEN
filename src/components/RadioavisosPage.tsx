import { ALL_STATIONS, STATIONS_VHF, STATIONS_MF } from "../data";
import { showToast } from "../utils/helpers";

// =================================================================================
// --- DATA TYPES & STATE MANAGEMENT ---
// =================================================================================

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

// --- Component-level State ---
let user: string | null = null;
let appData: AppData = { nrs: [], history: [] };
let currentView: View = 'INICIO';
let componentContainer: HTMLElement | null = null;

// =================================================================================
// --- API LAYER ---
// Abstraction for server communication.
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
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
};

// =================================================================================
// --- CORE RENDERING LOGIC ---
// =================================================================================

async function reRender() {
    if (!componentContainer) return;
    const activeElementId = document.activeElement?.id; // Save focus
    
    componentContainer.innerHTML = await renderPageContent();

    // Restore focus to the previously active element if it still exists
    const activeElement = activeElementId ? document.getElementById(activeElementId) : null;
    if (activeElement instanceof HTMLElement) {
        activeElement.focus();
    }
}

export async function renderRadioavisos(container: HTMLElement) {
    componentContainer = container;
    user = localStorage.getItem('nr_manager_user');
    
    // Attach event listeners only once per component lifetime
    if (!(container as any).__radioavisosListenersAttached) {
        attachEventListeners(container);
        (container as any).__radioavisosListenersAttached = true;
    }
    
    await reRender();
}

async function renderPageContent(): Promise<string> {
    if (!user) {
        return renderUserPrompt();
    }
    
    // Load data from server if the local state is empty
    if (appData.nrs.length === 0 && appData.history.length === 0) {
        try {
            appData = await api.getData();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            return `<div class="content-card"><p class="error">${message}</p></div>`;
        }
    }

    const views: { id: View, name: string }[] = [
        { id: 'INICIO', name: 'Inicio' }, { id: 'AÑADIR', name: 'Añadir' },
        { id: 'EDITAR', name: 'Editar' }, { id: 'BORRAR', name: 'Borrar/Cancelar' },
        { id: 'BD', name: 'Base de Datos' }, { id: 'HISTORIAL', name: 'Historial' }
    ];

    return `
        <div class="content-card" style="max-width: 1400px;">
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                <h2 class="content-card-title" style="margin: 0; padding: 0; border: none;">Gestor de Radioavisos (NR)</h2>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <button class="secondary-btn" data-action="import">Importar</button>
                    <input type="file" accept=".json" class="file-input-hidden" style="display: none;" />
                    <button class="secondary-btn" data-action="export">Exportar</button>
                    <div style="font-size: 0.9rem; background-color: var(--bg-main); padding: 0.5rem 1rem; border-radius: 6px;">
                        <strong>Usuario:</strong> ${user}
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
// --- VIEW-SPECIFIC RENDERERS ---
// Each function returns the HTML string for a specific tab.
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

// =================================================================================
// --- EVENT HANDLING ---
// =================================================================================

function attachEventListeners(container: HTMLElement) {
    // Main event delegation for clicks and form submissions
    container.addEventListener('click', handleDelegatedClick);
    container.addEventListener('submit', handleDelegatedSubmit);
    
    // Delegated change listeners for specific interactive elements
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

async function handleDelegatedSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (form.id === 'user-prompt-form') await handleUserSet(form);
}

async function handleDelegatedClick(e: Event) {
    const target = e.target as HTMLElement;
    // Find the closest element with a data-action attribute
    const actionElement = target.closest<HTMLElement>('[data-action]');
    if (!actionElement) return;

    const action = actionElement.dataset.action;

    switch(action) {
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

// --- Action Implementations ---

async function handleUserSet(form: HTMLFormElement) {
    const input = form.querySelector('#username-input') as HTMLInputElement;
    const username = input.value.trim().toUpperCase();
    if (username) {
        user = username;
        localStorage.setItem('nr_manager_user', user);
        appData = { nrs: [], history: [] }; // Reset data to force fetch from server
        await reRender();
    }
}

async function handleAddSubmit() {
    if (!componentContainer) return;
    const nrNum = (componentContainer.querySelector('#add-nr-num') as HTMLInputElement).value.trim();
    const nrYear = (componentContainer.querySelector('#add-nr-year') as HTMLInputElement).value.trim();
    if (!nrNum || !nrYear) { return showToast("El número y el año del NR son obligatorios.", "error"); }
    const nrId = `${nrNum}/${nrYear}`;

    const stations = Array.from(componentContainer.querySelectorAll<HTMLInputElement>('#add-stations-group input:checked')).map(cb => cb.value);
    if (stations.length === 0) { return showToast("Debe seleccionar al menos una estación.", "error"); }

    const versionadoCheckbox = componentContainer.querySelector('#add-is-versionado') as HTMLInputElement;
    const versionedFrom = versionadoCheckbox.checked ? (componentContainer.querySelector('#add-versioned-id') as HTMLInputElement).value.trim() : undefined;
    
    if (appData.nrs.some(nr => nr.id === nrId && !nr.isCaducado && !versionedFrom)) {
        return showToast(`Error: El NR-${nrId} ya existe y está vigente. Para crear una nueva versión, marque la casilla 'Versionado'.`, "error");
    }

    let version = 1;
    let nrsToUpdate = [...appData.nrs];
    if (versionedFrom) {
        const previousVersions = nrsToUpdate.filter(nr => nr.id === versionedFrom);
        if (previousVersions.length > 0) {
            version = Math.max(...previousVersions.map(nr => nr.version)) + 1;
            nrsToUpdate = nrsToUpdate.map(nr => nr.id === versionedFrom ? { ...nr, isCaducado: true } : nr);
            appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user!, action: 'CANCELADO', nrId: versionedFrom, details: `Versionado a NR-${nrId}-${version}`});
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

    appData.nrs = [...nrsToUpdate, newNR];
    appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user!, action: 'AÑADIDO', nrId, details: `Añadida versión ${version} a ${stations.length} estaciones.`});
    
    try {
        await api.saveData(appData);
        showToast(`NR-${nrId}-${version} añadido.`, 'success');
        currentView = 'INICIO';
        await reRender();
    } catch (error) { showToast("Error al guardar.", "error"); }
}

async function handleEditSearch() {
    if (!componentContainer) return;
    const searchInput = componentContainer.querySelector('#edit-search-id') as HTMLInputElement;
    const formContainer = componentContainer.querySelector('#edit-form-container') as HTMLElement;
    const searchId = searchInput.value.trim();
    const foundNRs = appData.nrs.filter(nr => nr.id === searchId && !nr.isCaducado);
    
    if (foundNRs.length > 0) {
        const latestVersion = foundNRs.sort((a, b) => b.version - a.version)[0];
        formContainer.dataset.fullId = latestVersion.fullId; // Store for saving
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
}

async function handleEditSave() {
    if (!componentContainer) return;
    const formContainer = componentContainer.querySelector('#edit-form-container') as HTMLElement;
    const fullId = formContainer.dataset.fullId;
    if (!fullId) return;

    const nrToUpdate = appData.nrs.find(nr => nr.fullId === fullId);
    if (!nrToUpdate) return;

    const updatedStations = Array.from(componentContainer.querySelectorAll<HTMLInputElement>('#edit-stations-group input:checked')).map(cb => cb.value);
    appData.nrs = appData.nrs.map(nr => nr.fullId === fullId ? {
        ...nr,
        expiryDate: (componentContainer.querySelector('#edit-expiry-date') as HTMLInputElement).value,
        expiryTime: (componentContainer.querySelector('#edit-expiry-time') as HTMLInputElement).value,
        isAmpliado: (componentContainer.querySelector('#edit-is-ampliado') as HTMLInputElement).checked,
        stations: updatedStations,
    } : nr);
    appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user!, action: 'EDITADO', nrId: nrToUpdate.id, details: `Editada versión ${nrToUpdate.version}.`});

    try {
        await api.saveData(appData);
        showToast(`NR-${nrToUpdate.id} actualizado.`, 'success');
        currentView = 'INICIO';
        await reRender();
    } catch (error) { showToast("Error al guardar.", "error"); }
}

async function handleDeleteNR() {
    if (!componentContainer) return;
    const nrId = (componentContainer.querySelector('#delete-nr-id') as HTMLInputElement).value.trim();
    if (!nrId) return;
    if (!appData.nrs.some(nr => nr.id === nrId)) { return showToast(`El NR-${nrId} no existe.`, "error"); }
    
    if (window.confirm(`¡ADVERTENCIA!\n\nEstá a punto de ELIMINAR permanentemente el NR-${nrId} y todas sus versiones.\nEsta acción no se puede deshacer. ¿Continuar?`)) {
        appData.nrs = appData.nrs.filter(nr => nr.id !== nrId);
        appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user!, action: 'BORRADO', nrId: nrId, details: `Eliminado permanentemente.`});
        await api.saveData(appData);
        showToast(`NR-${nrId} ha sido eliminado.`, 'info');
        currentView = 'INICIO';
        await reRender();
    }
}

async function handleCancelNR() {
    if (!componentContainer) return;
    const nrId = (componentContainer.querySelector('#delete-nr-id') as HTMLInputElement).value.trim();
    if (!nrId) return;
    if (!appData.nrs.some(nr => nr.id === nrId && !nr.isCaducado)) { return showToast(`El NR-${nrId} no existe o ya está cancelado.`, "error"); }
    
    if (window.confirm(`¿Está seguro de que desea CANCELAR todas las versiones vigentes del NR-${nrId}?`)) {
        appData.nrs = appData.nrs.map(nr => nr.id === nrId ? {...nr, isCaducado: true} : nr);
        appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user!, action: 'CANCELADO', nrId: nrId, details: `Marcado como caducado.`});
        await api.saveData(appData);
        showToast(`NR-${nrId} ha sido cancelado.`, 'info');
        currentView = 'INICIO';
        await reRender();
    }
}

// --- Import/Export ---
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
            
            await api.saveData(parsedData);
            appData = parsedData; // Sync local state
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

function renderUserPrompt(): string {
    return `
        <div class="user-prompt-overlay">
            <div class="user-prompt-box">
                <h2>Identificación de Usuario</h2>
                <p>Por favor, introduce tu nombre o identificador.</p>
                <form id="user-prompt-form" style="margin-top: 1rem;">
                    <input class="simulator-input" type="text" id="username-input" placeholder="Ej: ASANDECA" required autofocus />
                    <button type="submit" class="primary-btn">Guardar</button>
                </form>
            </div>
        </div>
    `;
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
    const activeNRs = appData.nrs.filter(nr => !nr.isCaducado).sort((a, b) => a.id.localeCompare(b.id));
    if (activeNRs.length === 0) return `<p class="drill-placeholder">No hay radioavisos vigentes.</p>`;
    return `
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead>
                    <tr><th>NR</th><th>Versión</th><th>Fecha/Hora Cad. (UTC)</th>
                    ${STATIONS_VHF.map(s => `<th>${s.replace(' VHF', '')}</th>`).join('')}
                    ${STATIONS_MF.map(s => `<th>${s.replace(' MF', '')}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${activeNRs.map(nr => `
                        <tr>
                            <td>NR-${nr.id}</td><td>v${nr.version}</td><td>${nr.expiryDate || 'N/A'} ${nr.expiryTime || ''}</td>
                            ${ALL_STATIONS.map(s => `<td class="${nr.stations.includes(s) ? 'true-cell' : 'false-cell'}">${nr.stations.includes(s) ? '✔' : '✖'}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderHistoryView(): string {
    const sortedHistory = [...appData.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (sortedHistory.length === 0) return `<p class="drill-placeholder">No hay operaciones registradas.</p>`;
    return `
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead><tr><th>NR</th><th>F/H Acción</th><th>Usuario</th><th>Acción</th><th>Detalles</th></tr></thead>
                <tbody>
                    ${sortedHistory.map(log => `
                        <tr><td>NR-${log.nrId}</td><td>${getFormattedDateTime(log.timestamp)}</td><td>${log.user}</td><td>${log.action}</td><td>${log.details}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}