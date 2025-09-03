import { ALL_STATIONS, STATIONS_VHF, STATIONS_MF } from "../data";
import { showToast } from "../utils/helpers";

// --- Data Types ---
type NR = {
    id: string; // e.g., "2013/2024"
    version: number; // Starts at 1
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
    nrId: string; // This is the base ID, e.g., "2013/2024"
    details: string;
};
type AppData = {
    nrs: NR[];
    history: HistoryLog[];
};
type View = 'INICIO' | 'AÑADIR' | 'EDITAR' | 'BORRAR' | 'BD' | 'HISTORIAL';

// --- State ---
let user: string | null = null;
let appData: AppData = { nrs: [], history: [] };
let currentView: View = 'INICIO';
let isLoading = true;
let fileInput: HTMLInputElement | null = null;

// --- API Layer ---
const api = {
    getData: async (): Promise<AppData> => {
        const response = await fetch('/api/radioavisos');
        if (!response.ok) throw new Error('Failed to fetch data from server.');
        return response.json();
    },
    saveData: async (data: AppData): Promise<void> => {
        const response = await fetch('/api/radioavisos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to save data to server.');
    },
};

// --- Helper ---
const getFormattedDateTime = (isoString?: string) => {
    const date = isoString ? new Date(isoString) : new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes} UTC`;
};

// --- Main Controller ---
export async function renderRadioavisos(container: HTMLElement) {
    container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
    user = localStorage.getItem('nr_manager_user');

    if (!user) {
        container.innerHTML = renderUserPrompt();
        attachUserPromptListener(container);
    } else {
        try {
            appData = await api.getData();
            isLoading = false;
            container.innerHTML = renderAppLayout();
            attachAppListeners(container);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            container.innerHTML = `<p class="error">${message}</p>`;
        }
    }
}

// --- User Identification ---
function renderUserPrompt(): string {
    return `
        <div class="user-prompt-overlay">
            <div class="user-prompt-box">
                <h2>Identificación de Usuario</h2>
                <p>Por favor, introduce tu nombre o identificador para registrar las operaciones.</p>
                <form id="user-prompt-form" style="margin-top: 1rem;">
                    <div class="form-group">
                        <input class="simulator-input" type="text" id="username-input" placeholder="Ej: ASANDECA" required />
                    </div>
                    <button type="submit" class="primary-btn">Guardar</button>
                </form>
            </div>
        </div>
    `;
}

function attachUserPromptListener(container: HTMLElement) {
    const form = container.querySelector('#user-prompt-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = container.querySelector('#username-input') as HTMLInputElement;
        const username = input.value.trim().toUpperCase();
        if (username) {
            user = username;
            localStorage.setItem('nr_manager_user', user);
            renderRadioavisos(container); // Re-initialize the app
        }
    });
}

// --- App Layout & Main Listeners ---
function renderAppLayout(): string {
    const views: { id: View, name: string }[] = [
        { id: 'INICIO', name: 'Inicio' },
        { id: 'AÑADIR', name: 'Añadir' },
        { id: 'EDITAR', name: 'Editar' },
        { id: 'BORRAR', name: 'Borrar/Cancelar' },
        { id: 'BD', name: 'Base de Datos' },
        { id: 'HISTORIAL', name: 'Historial' },
    ];

    return `
        <div class="content-card radioavisos-manager" style="max-width: 1400px;">
            <header class="radioavisos-header">
                 <h2>Gestor de Radioavisos (NR)</h2>
                 <div class="header-controls">
                     <button id="import-btn" class="secondary-btn" title="Importar Datos">Importar</button>
                     <input type="file" accept=".json" id="file-input" style="display: none;" />
                     <button id="export-btn" class="secondary-btn" title="Exportar Datos">Exportar</button>
                     <div class="user-info"><strong>Usuario:</strong> ${user}</div>
                 </div>
            </header>

            <div class="info-nav-tabs" style="margin-top: 1rem;">
                ${views.map(v => `<button class="info-nav-btn ${currentView === v.id ? 'active' : ''}" data-view="${v.id}">${v.name}</button>`).join('')}
            </div>

            <main id="radioavisos-content-container" style="margin-top: 1.5rem;">
                ${renderCurrentView()}
            </main>
        </div>
    `;
}

function attachAppListeners(container: HTMLElement) {
    const contentContainer = container.querySelector('#radioavisos-content-container') as HTMLElement;
    
    // Header controls
    fileInput = container.querySelector('#file-input');
    container.querySelector('#import-btn')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', handleFileChange);
    container.querySelector('#export-btn')?.addEventListener('click', handleExport);
    
    // Tab navigation
    container.querySelector('.info-nav-tabs')?.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const btn = target.closest<HTMLButtonElement>('.info-nav-btn');
        if (btn && btn.dataset.view) {
            currentView = btn.dataset.view as View;
            container.querySelectorAll('.info-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            contentContainer.innerHTML = renderCurrentView();
            attachViewListeners(contentContainer);
        }
    });

    // Initial view listeners
    attachViewListeners(contentContainer);
}

// --- View Rendering & Logic ---
function renderCurrentView(): string {
    switch(currentView) {
        case 'INICIO': return renderMainView();
        case 'AÑADIR': return renderAddView();
        case 'EDITAR': return renderEditView();
        case 'BORRAR': return renderDeleteView();
        case 'BD': return renderDbView();
        case 'HISTORIAL': return renderHistoryView();
        default: return `<p>Vista no encontrada</p>`;
    }
}

function attachViewListeners(container: HTMLElement) {
    if (currentView === 'AÑADIR') attachAddViewListeners(container);
    if (currentView === 'EDITAR') attachEditViewListeners(container);
    if (currentView === 'BORRAR') attachDeleteViewListeners(container);
}

// ... (Rest of the rendering functions and listeners)
function renderMainView(): string {
    const lastAction = (action: HistoryLog['action']) => appData.history.find(h => h.action === action);
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
                            ${maxVhfNrs === 0 ? `<tr><td colspan="${STATIONS_VHF.length}" class="drill-placeholder" style="padding: 1rem;">No hay NRs vigentes en estaciones VHF.</td></tr>` : 
                            Array.from({ length: maxVhfNrs }).map((_, rowIndex) => `
                                <tr>${STATIONS_VHF.map(station => `<td>${(vhfNrsByStation as any)[station]?.[rowIndex] || ''}</td>`).join('')}</tr>
                            `).join('')}
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
                            ${maxMfNrs === 0 ? `<tr><td colspan="${STATIONS_MF.length}" class="drill-placeholder" style="padding: 1rem;">No hay NRs vigentes en estaciones MF.</td></tr>` :
                            Array.from({ length: maxMfNrs }).map((_, rowIndex) => `
                                <tr>${STATIONS_MF.map(station => `<td>${(mfNrsByStation as any)[station]?.[rowIndex] || ''}</td>`).join('')}</tr>
                            `).join('')}
                         </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="label">Total NRs vigentes:</div><div class="value green">${activeNRs.length}</div></div>
            <div class="stat-card"><div class="label">Último NR añadido:</div><div class="value">${lastAdded ? `NR-${lastAdded.nrId}` : '-'}</div><small>Por: ${lastAdded?.user || '-'}</small></div>
            <div class="stat-card"><div class="label">F/H registro:</div><div class="value" style="font-size: 1rem;">${lastAdded ? getFormattedDateTime(lastAdded.timestamp) : '-'}</div></div>
            <div class="stat-card"><div class="label">Último NR borrado:</div><div class="value red">${lastDeleted ? `NR-${lastDeleted.nrId}` : '-'}</div><small>Por: ${lastDeleted?.user || '-'}</small></div>
        </div>
    `;
}

function renderAddView(): string {
    const currentYear = new Date().getFullYear();
    return `
        <div class="view-header"><h2>Añadir Nuevo Radioaviso</h2></div>
        <div class="form-grid">
            <div class="form-group" style="flex-direction: row; gap: 1rem; align-items: flex-end;">
                <div style="flex:1;"><label>NR (Número)</label><input type="text" id="add-nr-num" placeholder="2013" class="simulator-input" /></div>
                <span style="font-size: 1.5rem;">/</span>
                <div style="flex:1;"><label>Año</label><input type="text" id="add-nr-year" value="${currentYear}" class="simulator-input" /></div>
            </div>
            <div class="form-group"><label><input type="checkbox" id="add-is-versionado" /> Versionado de un NR anterior</label><input type="text" id="add-versioned-id" style="display:none;" placeholder="ID anterior (ej: 1550/2024)" class="simulator-input"/></div>
            <div class="form-group"><label><input type="checkbox" id="add-has-expiry" checked /> Fecha Caducidad (UTC)</label><div id="add-expiry-inputs" style="display:flex; gap: 1rem;"><input type="date" id="add-expiry-date" class="simulator-input" /><input type="time" id="add-expiry-time" class="simulator-input" /></div></div>
            <div class="form-group"><label><input type="checkbox" id="add-is-ampliado" /> NR Ampliado</label></div>
        </div>
        <h3 class="reference-table-subtitle" style="margin-top: 2rem;">Marque las EECC:</h3>
        <div class="checkbox-group" id="add-stations-group">
            ${ALL_STATIONS.map(station => `
                <div class="checkbox-item"><input type="checkbox" id="add-${station}" value="${station}"><label for="add-${station}">${station}</label></div>
            `).join('')}
        </div>
        <div class="button-container">
            <button class="primary-btn" id="add-submit-btn" style="margin-top:0;">GUARDAR</button>
            <button class="secondary-btn" id="add-clear-btn">LIMPIAR</button>
        </div>
    `;
}

function renderEditView(): string {
     return `
        <div class="view-header"><h2>Editar Radioaviso</h2></div>
        <div class="form-group" style="display: flex; align-items: flex-end; gap: 10px;">
            <div style="flex-grow: 1;"><label>Buscar NR por ID (ej: 2013/2024)</label><input type="text" id="edit-search-id" placeholder="ID del NR, sin versión" class="simulator-input"/></div>
            <button class="primary-btn" id="edit-search-btn" style="margin-top:0;">BUSCAR</button>
        </div>
        <div id="edit-form-container" style="display:none;">
            <div class="info-divider" style="width: 100%; margin: 2rem 0;"></div>
            <div class="form-group"><label>Fecha Caducidad (UTC)</label><div style="display: flex; gap: 10px;"><input type="date" id="edit-expiry-date" class="simulator-input" /><input type="time" id="edit-expiry-time" class="simulator-input" /></div></div>
            <div class="form-group"><label><input type="checkbox" id="edit-is-ampliado" /> NR Ampliado</label></div>
            <h3 class="reference-table-subtitle" style="margin-top: 2rem;">Marque las EECC:</h3>
            <div class="checkbox-group" id="edit-stations-group">
                ${ALL_STATIONS.map(station => `
                    <div class="checkbox-item"><input type="checkbox" id="edit-${station}" value="${station}"><label for="edit-${station}">${station}</label></div>
                `).join('')}
            </div>
            <div class="button-container">
                <button class="primary-btn" id="edit-save-btn" style="margin-top:0;">GUARDAR CAMBIOS</button>
            </div>
        </div>
    `;
}

function renderDeleteView(): string {
    return `
        <div class="view-header"><h2>Borrar o Cancelar Radioaviso</h2></div>
        <div class="form-group"><label>ID del NR (ej: 2013/2024)</label><input type="text" id="delete-nr-id" placeholder="ID del NR, sin versión" class="simulator-input"/></div>
        <div class="warning-box">
            <h3>¡ADVERTENCIA!</h3>
            <p><b>ELIMINAR:</b> Borra el NR y todas sus versiones permanentemente del sistema. No se podrá recuperar.</p>
            <p><b>CANCELAR:</b> Marca el NR como caducado, pero mantiene su registro. Es la opción recomendada.</p>
        </div>
        <div class="button-container">
            <button class="tertiary-btn" id="delete-btn">ELIMINAR</button>
            <button class="secondary-btn" id="cancel-btn" style="color: #d46b08; border-color: #d46b08;">CANCELAR</button>
        </div>
    `;
}

function renderDbView(): string {
    const activeNRs = appData.nrs.filter(nr => !nr.isCaducado).sort((a,b) => a.id.localeCompare(b.id));
    if (activeNRs.length === 0) return `<p class="drill-placeholder">No hay radioavisos vigentes en la base de datos.</p>`;
    return `
        <div class="view-header"><h2>Base de Datos de Radioavisos Vigentes</h2></div>
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead>
                    <tr>
                        <th>NR</th><th>Fecha Cad. (UTC)</th><th>Hora Cad. (UTC)</th>
                        ${STATIONS_VHF.map(s => `<th>${s.replace(' VHF','')}</th>`).join('')}
                        ${STATIONS_MF.map(s => `<th>${s.replace(' MF','')}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${activeNRs.map(nr => `
                        <tr>
                            <td>NR-${nr.fullId.split('-')[1]}</td><td>${nr.expiryDate || 'N/A'}</td><td>${nr.expiryTime || 'N/A'}</td>
                            ${ALL_STATIONS.map(station => `
                                <td class="${nr.stations.includes(station) ? 'true-cell' : 'false-cell'}">
                                    ${nr.stations.includes(station) ? '✔' : '✖'}
                                </td>
                            `).join('')}
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
        <div class="view-header"><h2>Historial de Operaciones</h2></div>
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead><tr><th>NR</th><th>F/H Acción (UTC)</th><th>Usuario</th><th>Acción</th><th>Detalles</th></tr></thead>
                <tbody>
                    ${sortedHistory.map(log => `
                        <tr>
                            <td>NR-${log.nrId}</td><td>${getFormattedDateTime(log.timestamp)}</td>
                            <td>${log.user}</td><td>${log.action}</td><td>${log.details}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Attach listeners for specific views
function attachAddViewListeners(container: HTMLElement) {
    const versionadoCheckbox = container.querySelector('#add-is-versionado') as HTMLInputElement;
    const versionedIdInput = container.querySelector('#add-versioned-id') as HTMLInputElement;
    versionadoCheckbox?.addEventListener('change', () => { versionedIdInput.style.display = versionadoCheckbox.checked ? 'block' : 'none'; });

    const expiryCheckbox = container.querySelector('#add-has-expiry') as HTMLInputElement;
    const expiryInputs = container.querySelector('#add-expiry-inputs') as HTMLDivElement;
    expiryCheckbox?.addEventListener('change', () => { expiryInputs.style.display = expiryCheckbox.checked ? 'flex' : 'none'; });

    container.querySelector('#add-submit-btn')?.addEventListener('click', async () => {
        const nrNum = (container.querySelector('#add-nr-num') as HTMLInputElement).value.trim();
        const nrYear = (container.querySelector('#add-nr-year') as HTMLInputElement).value.trim();
        if (!nrNum || !nrYear) {
            showToast("El número y el año del NR son obligatorios.", "error");
            return;
        }
        const nrId = `${nrNum}/${nrYear}`;

        const stations = Array.from(container.querySelectorAll<HTMLInputElement>('#add-stations-group input:checked')).map(cb => cb.value);
        if (stations.length === 0) {
            showToast("Debe seleccionar al menos una estación.", "error");
            return;
        }
        
        let version = 1;
        let nrsToUpdate = [...appData.nrs];
        const versionedFrom = versionadoCheckbox.checked ? (container.querySelector('#add-versioned-id') as HTMLInputElement).value.trim() : undefined;

        // Check if exact ID with version 1 already exists
        if (nrsToUpdate.some(nr => nr.id === nrId && !versionedFrom)) {
            showToast(`Error: El NR-${nrId} ya existe. Para crear una nueva versión, marque la casilla 'Versionado'.`, "error");
            return;
        }

        if (versionedFrom) {
            const previousVersions = nrsToUpdate.filter(nr => nr.id === versionedFrom);
            if (previousVersions.length > 0) {
                 version = Math.max(...previousVersions.map(nr => nr.version)) + 1;
                 // Cancel all previous versions of this ID
                 nrsToUpdate = nrsToUpdate.map(nr => nr.id === versionedFrom ? { ...nr, isCaducado: true } : nr);
                 appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user!, action: 'CANCELADO', nrId: versionedFrom, details: `Versionado a NR-${nrId}-${version}`});
            }
        }
        
        const newNR: NR = {
            id: nrId,
            version,
            fullId: `NR-${nrId}-${version}`,
            stations,
            expiryDate: expiryCheckbox.checked ? (container.querySelector('#add-expiry-date') as HTMLInputElement).value : '',
            expiryTime: expiryCheckbox.checked ? (container.querySelector('#add-expiry-time') as HTMLInputElement).value : '',
            isAmpliado: (container.querySelector('#add-is-ampliado') as HTMLInputElement).checked,
            isCaducado: false
        };

        appData.nrs = [...nrsToUpdate, newNR];
        appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user!, action: 'AÑADIDO', nrId, details: `Añadida versión ${version} a ${stations.length} estaciones.`});
        
        try {
            await api.saveData(appData);
            showToast(`NR-${nrId}-${version} añadido correctamente.`, 'success');
            currentView = 'INICIO';
            const managerContainer = document.querySelector('.radioavisos-manager')?.parentElement;
            if (managerContainer) renderRadioavisos(managerContainer as HTMLElement);
        } catch (error) {
            showToast("Error al guardar los datos.", "error");
        }
    });
    container.querySelector('#add-clear-btn')?.addEventListener('click', () => {
        container.innerHTML = renderAddView();
        attachAddViewListeners(container);
    });
}

function attachEditViewListeners(container: HTMLElement) {
    const searchBtn = container.querySelector('#edit-search-btn');
    const searchInput = container.querySelector('#edit-search-id') as HTMLInputElement;
    const formContainer = container.querySelector('#edit-form-container') as HTMLElement;
    let foundNRs: NR[] = [];
    
    searchBtn?.addEventListener('click', () => {
        const searchId = searchInput.value.trim();
        foundNRs = appData.nrs.filter(nr => nr.id === searchId && !nr.isCaducado);
        
        if(foundNRs.length > 0) {
            const latestVersion = foundNRs.sort((a, b) => b.version - a.version)[0];
            (container.querySelector('#edit-expiry-date') as HTMLInputElement).value = latestVersion.expiryDate;
            (container.querySelector('#edit-expiry-time') as HTMLInputElement).value = latestVersion.expiryTime;
            (container.querySelector('#edit-is-ampliado') as HTMLInputElement).checked = latestVersion.isAmpliado;
            container.querySelectorAll<HTMLInputElement>('#edit-stations-group input').forEach(cb => {
                cb.checked = latestVersion.stations.includes(cb.value);
            });
            formContainer.style.display = 'block';
        } else {
            showToast(`NR-${searchInput.value} no encontrado o está cancelado.`, 'info');
            formContainer.style.display = 'none';
        }
    });

    container.querySelector('#edit-save-btn')?.addEventListener('click', async () => {
        if (foundNRs.length === 0) return;
        
        const latestVersion = foundNRs.sort((a, b) => b.version - a.version)[0];
        const updatedStations = Array.from(container.querySelectorAll<HTMLInputElement>('#edit-stations-group input:checked')).map(cb => cb.value);
        
        appData.nrs = appData.nrs.map(nr => 
            nr.fullId === latestVersion.fullId 
            ? { ...nr, 
                expiryDate: (container.querySelector('#edit-expiry-date') as HTMLInputElement).value,
                expiryTime: (container.querySelector('#edit-expiry-time') as HTMLInputElement).value,
                isAmpliado: (container.querySelector('#edit-is-ampliado') as HTMLInputElement).checked,
                stations: updatedStations,
              } 
            : nr
        );
        appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user!, action: 'EDITADO', nrId: latestVersion.id, details: `Editada versión ${latestVersion.version}.`});

        try {
            await api.saveData(appData);
            showToast(`NR-${latestVersion.id} actualizado.`, 'success');
            currentView = 'INICIO';
            const managerContainer = document.querySelector('.radioavisos-manager')?.parentElement;
            if (managerContainer) renderRadioavisos(managerContainer as HTMLElement);
        } catch (error) {
            showToast("Error al guardar los datos.", "error");
        }
    });
}

function attachDeleteViewListeners(container: HTMLElement) {
    const nrIdInput = container.querySelector('#delete-nr-id') as HTMLInputElement;
    const handleDelete = async () => {
        const nrId = nrIdInput.value.trim();
        if (!nrId) return;
        const nrExists = appData.nrs.some(nr => nr.id === nrId);
        if (!nrExists) { showToast(`El NR-${nrId} no existe.`, "error"); return; }
        if (window.confirm(`¡ADVERTENCIA!\n\nEstá a punto de ELIMINAR permanentemente el NR-${nrId} y todas sus versiones.\nEsta acción no se puede deshacer. ¿Continuar?`)) {
            appData.nrs = appData.nrs.filter(nr => nr.id !== nrId);
            appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user!, action: 'BORRADO', nrId: nrId, details: `Eliminado permanentemente.`});
            await api.saveData(appData);
            showToast(`NR-${nrId} ha sido eliminado.`, 'info');
            currentView = 'INICIO';
            const managerContainer = document.querySelector('.radioavisos-manager')?.parentElement;
            if (managerContainer) renderRadioavisos(managerContainer as HTMLElement);
        }
    };
    const handleCancel = async () => {
        const nrId = nrIdInput.value.trim();
        if (!nrId) return;
        const nrExists = appData.nrs.some(nr => nr.id === nrId && !nr.isCaducado);
        if (!nrExists) { showToast(`El NR-${nrId} no existe o ya está cancelado.`, "error"); return; }
        if (window.confirm(`¿Está seguro de que desea CANCELAR todas las versiones vigentes del NR-${nrId}?`)) {
            appData.nrs = appData.nrs.map(nr => nr.id === nrId ? {...nr, isCaducado: true} : nr);
            appData.history.unshift({id: Date.now().toString(), timestamp: new Date().toISOString(), user: user!, action: 'CANCELADO', nrId: nrId, details: `Marcado como caducado.`});
            await api.saveData(appData);
            showToast(`NR-${nrId} ha sido cancelado.`, 'info');
            currentView = 'INICIO';
            const managerContainer = document.querySelector('.radioavisos-manager')?.parentElement;
            if (managerContainer) renderRadioavisos(managerContainer as HTMLElement);
        }
    };
    container.querySelector('#delete-btn')?.addEventListener('click', handleDelete);
    container.querySelector('#cancel-btn')?.addEventListener('click', handleCancel);
}

// --- Import/Export ---
function handleExport() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.download = `radioavisos_backup_${date}.json`;
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

    if (!window.confirm("¡ADVERTENCIA!\n\nImportar un archivo reemplazará TODOS los datos actuales en el servidor.\n¿Está seguro de que desea continuar?")) {
        if (fileInput) fileInput.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File content is not readable");
            const parsedData = JSON.parse(text);
            if (Array.isArray(parsedData.nrs) && Array.isArray(parsedData.history)) {
                await api.saveData(parsedData);
                appData = parsedData; // Update local state
                showToast("Datos importados y guardados en el servidor.", 'success');
                const managerContainer = document.querySelector('.radioavisos-manager')?.parentElement;
                if (managerContainer) renderRadioavisos(managerContainer as HTMLElement);
            } else {
                throw new Error("El archivo no tiene el formato correcto.");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            showToast(`Error al importar: ${message}`, 'error');
        } finally {
            if (fileInput) fileInput.value = "";
        }
    };
    reader.readAsText(file);
}