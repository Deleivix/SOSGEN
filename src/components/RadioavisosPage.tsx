import { ALL_STATIONS, STATIONS_VHF, STATIONS_MF } from "../data";
import { showToast } from "../utils/helpers";

// --- Data Types ---
type NR = {
    id: string; // e.g., "2013"
    version: number; // Starts at 1
    fullId: string; // e.g., "NR-2013-1"
    stations: string[];
    expiryDate: string; // YYYY-MM-DD
    expiryTime: string; // HH:MM
    isAmpliado: boolean;
    isCaducado: boolean;
};
type HistoryLog = {
    id: string;
    timestamp: string;
    user: string;
    action: 'AÑADIDO' | 'EDITADO' | 'BORRADO' | 'CANCELADO';
    nrId: string;
    details: string;
};
type AppData = {
    nrs: NR[];
    history: HistoryLog[];
};
type View = 'INICIO' | 'AÑADIR' | 'EDITAR' | 'BORRAR' | 'BD' | 'HISTORIAL';

// --- State and API Layer ---
let user: string | null = null;
let data: AppData = { nrs: [], history: [] };
let currentView: View = 'INICIO';
let fileInput: HTMLInputElement | null = null;

const api = {
    getData: (): AppData => {
        try {
            const nrs = JSON.parse(localStorage.getItem('nr_manager_data') || '[]');
            const history = JSON.parse(localStorage.getItem('nr_manager_history') || '[]');
            return { nrs, history };
        } catch (error) {
            console.error("Failed to fetch data from localStorage", error);
            return { nrs: [], history: [] };
        }
    },
    saveData: (appData: AppData): void => {
        try {
            localStorage.setItem('nr_manager_data', JSON.stringify(appData.nrs));
            localStorage.setItem('nr_manager_history', JSON.stringify(appData.history));
        } catch (error) {
            console.error("Failed to save data to localStorage", error);
            alert("Error: No se pudieron guardar los datos.");
        }
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
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} UTC`;
};

// --- History Logic ---
function addHistory(action: HistoryLog['action'], nrId: string, details: string) {
    if (!user) return;
    const newLog: HistoryLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user,
        action,
        nrId,
        details
    };
    data.history = [newLog, ...data.history];
}

// --- Data Handlers ---
function handleAddNR(nrData: Omit<NR, 'fullId' | 'version'> & { versionedFrom?: string }) {
    let currentNrs = [...data.nrs];
    let version = 1;

    if (currentNrs.some(nr => nr.id === nrData.id)) {
        alert(`Error: El NR-${nrData.id} ya existe. Para modificarlo, use la opción Editar/Versionar.`);
        return;
    }

    if (nrData.versionedFrom) {
        const previousVersions = currentNrs.filter(nr => nr.id === nrData.versionedFrom);
        if (previousVersions.length > 0) {
            version = Math.max(...previousVersions.map(nr => nr.version)) + 1;
            currentNrs = currentNrs.map(nr => nr.id === nrData.versionedFrom ? { ...nr, isCaducado: true } : nr);
            addHistory('CANCELADO', nrData.versionedFrom, `Versionado a NR-${nrData.id}-${version}`);
        }
    }
    
    const newNR: NR = { ...nrData, version, fullId: `NR-${nrData.id}-${version}` };
    data.nrs = [...currentNrs, newNR];
    addHistory('AÑADIDO', newNR.id, `Añadido a ${nrData.stations.length} estaciones.`);
    
    api.saveData(data);
    showToast(`NR-${nrData.id} añadido correctamente.`, 'success');
}

function handleEditNR(nrId: string, nrData: Partial<NR>) {
    data.nrs = data.nrs.map(nr => nr.id === nrId ? { ...nr, ...nrData } : nr);
    addHistory('EDITADO', nrId, `Datos actualizados.`);
    api.saveData(data);
    showToast(`NR-${nrId} actualizado.`, 'success');
}

function handleDeleteNR(nrId: string) {
    data.nrs = data.nrs.filter(nr => nr.id !== nrId);
    addHistory('BORRADO', nrId, `Eliminado permanentemente.`);
    api.saveData(data);
    showToast(`NR-${nrId} ha sido eliminado.`, 'info');
}

function handleCancelNR(nrId: string) {
    data.nrs = data.nrs.map(nr => nr.id === nrId ? { ...nr, isCaducado: true } : nr);
    addHistory('CANCELADO', nrId, `Marcado como caducado.`);
    api.saveData(data);
    showToast(`NR-${nrId} ha sido cancelado.`, 'info');
}

function handleExport() {
    const dataStr = JSON.stringify(data, null, 2);
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

    if (!window.confirm("¡ADVERTENCIA!\n\nImportar un archivo reemplazará TODOS los datos actuales.\n¿Está seguro de que desea continuar?")) {
        if (fileInput) fileInput.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File content is not readable");
            const parsedData = JSON.parse(text);
            if (Array.isArray(parsedData.nrs) && Array.isArray(parsedData.history)) {
                data = { nrs: parsedData.nrs, history: parsedData.history };
                api.saveData(data);
                showToast("Datos importados correctamente.", 'success');
                renderView(document.querySelector('.radioavisos-content-container')!);
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

// --- View Renderers ---
function renderView(container: HTMLElement) {
    switch(currentView) {
        case 'INICIO': container.innerHTML = renderMainView(); break;
        case 'AÑADIR': container.innerHTML = renderAddView(); break;
        case 'EDITAR': container.innerHTML = renderEditView(); break;
        case 'BORRAR': container.innerHTML = renderDeleteView(); break;
        case 'BD': container.innerHTML = renderDbView(); break;
        case 'HISTORIAL': container.innerHTML = renderHistoryView(); break;
    }
    attachViewListeners(container);
}

function renderMainView(): string {
    const lastAction = (action: HistoryLog['action']) => data.history.find(h => h.action === action);
    const lastAdded = lastAction('AÑADIDO');
    const lastEdited = lastAction('EDITADO');
    const lastDeleted = lastAction('BORRADO');
    const lastCancelled = lastAction('CANCELADO');
    const activeNRs = data.nrs.filter(nr => !nr.isCaducado);

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
        <div class="main-grid">
            <div class="station-tables">
                <div class="station-table-container">
                    <h3>Estaciones VHF</h3>
                    <div class="table-wrapper">
                        <table class="station-table horizontal-table">
                            <thead><tr>${STATIONS_VHF.map(s => `<th>${s.replace(' VHF', '')}</th>`).join('')}</tr></thead>
                            <tbody>
                                ${maxVhfNrs === 0 ? `<tr><td colspan="${STATIONS_VHF.length}">No hay NRs vigentes en estaciones VHF.</td></tr>` : 
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
                        <table class="station-table horizontal-table">
                             <thead><tr>${STATIONS_MF.map(s => `<th>${s.replace(' MF', '')}</th>`).join('')}</tr></thead>
                             <tbody>
                                ${maxMfNrs === 0 ? `<tr><td colspan="${STATIONS_MF.length}">No hay NRs vigentes en estaciones MF.</td></tr>` :
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
                <div class="stat-card"><div class="label">Último NR añadido:</div><div class="value">${lastAdded ? `NR-${lastAdded.nrId.split('-')[0]}` : '-'}</div><small>Por: ${lastAdded?.user || '-'}</small></div>
                <div class="stat-card"><div class="label">Último NR editado:</div><div class="value">${lastEdited ? `NR-${lastEdited.nrId.split('-')[0]}` : '-'}</div><small>Por: ${lastEdited?.user || '-'}</small></div>
                <div class="stat-card"><div class="label">Último NR borrado:</div><div class="value red">${lastDeleted ? `NR-${lastDeleted.nrId.split('-')[0]}` : '-'}</div><small>Por: ${lastDeleted?.user || '-'}</small></div>
                <div class="stat-card"><div class="label">F/H registros:</div><div class="value">${lastAdded ? getFormattedDateTime(lastAdded.timestamp) : '-'}</div></div>
                <div class="stat-card"><div class="label">F/H edición:</div><div class="value">${lastEdited ? getFormattedDateTime(lastEdited.timestamp) : '-'}</div></div>
                <div class="stat-card"><div class="label">F/H borrado:</div><div class="value">${lastDeleted ? getFormattedDateTime(lastDeleted.timestamp) : '-'}</div></div>
                <div class="stat-card"><div class="label">F/H caducidad:</div><div class="value">${lastCancelled ? getFormattedDateTime(lastCancelled.timestamp) : '-'}</div></div>
            </div>
        </div>
    `;
}

function renderAddView(): string {
    return `
        <div class="view-header"><h2>Añadir Nuevo Radioaviso</h2></div>
        <div class="form-grid">
            <div class="form-group"><label>NR-</label><input type="text" id="add-nr-id" placeholder="2013" /></div>
            <div class="form-group"><label><input type="checkbox" id="add-is-versionado" /> Versionado</label><input type="text" id="add-versioned-id" style="display:none;" placeholder="NR-XXXX a versionar" /></div>
            <div class="form-group"><label><input type="checkbox" id="add-has-expiry" checked /> Fecha Caducidad</label><div id="add-expiry-inputs"><input type="date" id="add-expiry-date" /><input type="time" id="add-expiry-time" /></div></div>
            <div class="form-group"><label><input type="checkbox" id="add-is-ampliado" /> NR Ampliado</label></div>
        </div>
        <h3>Marque las EECC:</h3>
        <div class="checkbox-group" id="add-stations-group">
            ${ALL_STATIONS.map(station => `
                <div class="checkbox-item"><input type="checkbox" id="add-${station}" value="${station}"><label for="add-${station}">${station}</label></div>
            `).join('')}
        </div>
        <div class="button-container">
            <button class="primary-btn" id="add-submit-btn">GUARDAR</button>
            <button class="secondary-btn" id="add-clear-btn">LIMPIAR</button>
        </div>
    `;
}

function renderEditView(): string {
     return `
        <div class="view-header"><h2>Editar/Versionar un Radioaviso</h2></div>
        <div class="form-group" style="display: flex; align-items: flex-end; gap: 10px;">
            <div style="flex-grow: 1;"><label>NR-</label><input type="text" id="edit-search-id" placeholder="Número del NR, sin versión"/></div>
            <button class="primary-btn" id="edit-search-btn" style="margin-top:0;">BUSCAR</button>
        </div>
        <div id="edit-form-container" style="display:none;">
            <hr style="margin: 24px 0;" />
            <div class="form-group"><label>Fecha Caducidad</label><div style="display: flex; gap: 10px;"><input type="date" id="edit-expiry-date" /><input type="time" id="edit-expiry-time" /></div></div>
            <div class="form-group"><label><input type="checkbox" id="edit-is-ampliado" /> NR Ampliado</label></div>
            <h3>Marque las EECC:</h3>
            <div class="checkbox-group" id="edit-stations-group">
                ${ALL_STATIONS.map(station => `
                    <div class="checkbox-item"><input type="checkbox" id="edit-${station}" value="${station}"><label for="edit-${station}">${station}</label></div>
                `).join('')}
            </div>
            <div class="button-container">
                <button class="primary-btn" id="edit-save-btn">GUARDAR CAMBIOS</button>
            </div>
        </div>
    `;
}

function renderDeleteView(): string {
    return `
        <div class="view-header"><h2>Borrar/Cancelar un Radioaviso</h2></div>
        <div class="form-group"><label>NR-</label><input type="text" id="delete-nr-id" placeholder="Número del NR, sin versión" /></div>
        <div class="warning-box">
            <h3>¡¡¡ADVERTENCIA!!!</h3>
            <p><b>ELIMINAR:</b> Borra el NR permanentemente del sistema. No se podrá recuperar.</p>
            <p><b>CANCELAR:</b> Marca el NR como caducado, pero mantiene su registro. Es la opción recomendada.</p>
        </div>
        <div class="button-container">
            <button class="tertiary-btn" id="delete-btn">ELIMINAR</button>
            <button class="secondary-btn" id="cancel-btn" style="color: #d46b08; border-color: #d46b08;">CANCELAR</button>
        </div>
    `;
}

function renderDbView(): string {
    const activeNRs = data.nrs.filter(nr => !nr.isCaducado);
    return `
        <div class="view-header"><h2>Base de Datos de Radioavisos Vigentes</h2></div>
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead>
                    <tr>
                        <th>NR</th><th>Fecha Caducidad</th><th>Hora UTC</th><th>Cancelado</th>
                        ${ALL_STATIONS.map(s => `<th key=${s}>${s}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${activeNRs.map(nr => `
                        <tr key=${nr.fullId}>
                            <td>${`NR-${nr.id}`}</td><td>${nr.expiryDate || 'N/A'}</td><td>${nr.expiryTime || 'N/A'}</td>
                            <td class="${nr.isCaducado ? 'true-cell' : 'false-cell'}">${nr.isCaducado ? 'SI' : 'NO'}</td>
                            ${ALL_STATIONS.map(station => `
                                <td class="${nr.stations.includes(station) ? 'true-cell' : 'false-cell'}">
                                    ${nr.stations.includes(station) ? 'SI' : 'NO'}
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
    const sortedHistory = [...data.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return `
        <div class="view-header"><h2>Historial de Operaciones</h2></div>
        <div class="table-wrapper">
             <table class="reference-table data-table">
                <thead><tr><th>NR</th><th>F/H Acción</th><th>OM/Usuario</th><th>Acción</th><th>Detalles</th></tr></thead>
                <tbody>
                    ${sortedHistory.map(log => `
                        <tr key=${log.id}>
                            <td>${`NR-${log.nrId.split('-')[0]}`}</td><td>${getFormattedDateTime(log.timestamp)}</td>
                            <td>${log.user}</td><td>${log.action}</td><td>${log.details}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}


// --- Main Controller ---
export function renderRadioavisos(container: HTMLElement) {
    container.innerHTML = `<div class="radioavisos-manager"></div>`;
    const managerContainer = container.querySelector('.radioavisos-manager') as HTMLElement;
    
    user = localStorage.getItem('nr_manager_user');
    data = api.getData();

    if (!user) {
        renderUserPrompt(managerContainer);
    } else {
        renderAppLayout(managerContainer);
    }
}

function renderUserPrompt(container: HTMLElement) {
    container.innerHTML = `
        <div class="user-prompt-overlay">
            <div class="user-prompt-box">
                <h2>Identificación de Usuario</h2>
                <p>Por favor, introduce tu nombre o identificador para registrar las operaciones.</p>
                <form id="user-prompt-form">
                    <div class="form-group">
                        <input class="styled-textarea" type="text" id="username-input" placeholder="Ej: ILOPEZTE" required />
                    </div>
                    <button type="submit" class="primary-btn">Guardar</button>
                </form>
            </div>
        </div>
    `;
    const form = container.querySelector('#user-prompt-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = container.querySelector('#username-input') as HTMLInputElement;
        const username = input.value.trim().toUpperCase();
        if (username) {
            user = username;
            localStorage.setItem('nr_manager_user', user);
            renderAppLayout(container);
        }
    });
}

function renderAppLayout(container: HTMLElement) {
    container.innerHTML = `
        <header class="radioavisos-header">
            <h2>Gestor de Radioavisos (NR)</h2>
            <div class="header-controls">
                <button id="import-btn" class="header-btn" title="Importar Datos"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M4 19h16v-7h2v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8h2v7zM13 9h3l-4-5-4 5h3v6h2V9z"/></svg>Importar</button>
                <input type="file" accept=".json" id="file-input" style="display: none;" />
                <button id="export-btn" class="header-btn" title="Exportar Datos"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M4 19h16v-7h2v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8h2v7zm7-11v6h2V8h3l-4-5-4 5h3z"/></svg>Exportar</button>
                <div class="user-info"><strong>Usuario:</strong> ${user}</div>
            </div>
        </header>
        <nav class="radioavisos-nav"></nav>
        <main class="radioavisos-content-container"></main>
    `;

    const navContainer = container.querySelector('.radioavisos-nav') as HTMLElement;
    const contentContainer = container.querySelector('.radioavisos-content-container') as HTMLElement;
    
    fileInput = container.querySelector('#file-input');
    container.querySelector('#import-btn')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', handleFileChange);
    container.querySelector('#export-btn')?.addEventListener('click', handleExport);

    const views: View[] = ['INICIO', 'AÑADIR', 'EDITAR', 'BORRAR', 'BD', 'HISTORIAL'];
    views.forEach(view => {
        const btn = document.createElement('button');
        btn.className = `radioavisos-nav-btn ${currentView === view ? 'active' : ''}`;
        btn.textContent = view.charAt(0) + view.slice(1).toLowerCase();
        btn.dataset.view = view;
        navContainer.appendChild(btn);
    });

    navContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON') {
            currentView = target.dataset.view as View;
            navContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            target.classList.add('active');
            renderView(contentContainer);
        }
    });

    renderView(contentContainer);
}

// --- View-specific Listeners ---
function attachViewListeners(container: HTMLElement) {
    if (currentView === 'AÑADIR') {
        const versionadoCheckbox = container.querySelector('#add-is-versionado') as HTMLInputElement;
        const versionedIdInput = container.querySelector('#add-versioned-id') as HTMLInputElement;
        versionadoCheckbox?.addEventListener('change', () => { versionedIdInput.style.display = versionadoCheckbox.checked ? 'block' : 'none'; });

        const expiryCheckbox = container.querySelector('#add-has-expiry') as HTMLInputElement;
        const expiryInputs = container.querySelector('#add-expiry-inputs') as HTMLDivElement;
        expiryCheckbox?.addEventListener('change', () => { expiryInputs.style.display = expiryCheckbox.checked ? 'block' : 'none'; });

        container.querySelector('#add-submit-btn')?.addEventListener('click', () => {
            const nrId = (container.querySelector('#add-nr-id') as HTMLInputElement).value;
            const stations = Array.from(container.querySelectorAll<HTMLInputElement>('#add-stations-group input:checked')).map(cb => cb.value);
            handleAddNR({
                id: nrId.trim(),
                stations,
                expiryDate: (container.querySelector('#add-expiry-date') as HTMLInputElement).value,
                expiryTime: (container.querySelector('#add-expiry-time') as HTMLInputElement).value,
                isAmpliado: (container.querySelector('#add-is-ampliado') as HTMLInputElement).checked,
                isCaducado: false,
                versionedFrom: (container.querySelector('#add-is-versionado') as HTMLInputElement).checked ? (container.querySelector('#add-versioned-id') as HTMLInputElement).value.trim() : undefined
            });
            currentView = 'INICIO';
            renderAppLayout(document.querySelector('.radioavisos-manager')!);
        });
        container.querySelector('#add-clear-btn')?.addEventListener('click', () => renderView(container));
    } else if (currentView === 'EDITAR') {
        const searchBtn = container.querySelector('#edit-search-btn');
        const searchInput = container.querySelector('#edit-search-id') as HTMLInputElement;
        const formContainer = container.querySelector('#edit-form-container') as HTMLElement;
        let foundNR: NR | null = null;
        
        searchBtn?.addEventListener('click', () => {
            const nrToEdit = data.nrs.find(nr => nr.id === searchInput.value.trim() && !nr.isCaducado);
            if(nrToEdit) {
                foundNR = nrToEdit;
                (container.querySelector('#edit-expiry-date') as HTMLInputElement).value = nrToEdit.expiryDate;
                (container.querySelector('#edit-expiry-time') as HTMLInputElement).value = nrToEdit.expiryTime;
                (container.querySelector('#edit-is-ampliado') as HTMLInputElement).checked = nrToEdit.isAmpliado;
                container.querySelectorAll<HTMLInputElement>('#edit-stations-group input').forEach(cb => {
                    cb.checked = nrToEdit.stations.includes(cb.value);
                });
                formContainer.style.display = 'block';
            } else {
                alert(`NR-${searchInput.value} no encontrado o está cancelado.`);
                formContainer.style.display = 'none';
            }
        });

        container.querySelector('#edit-save-btn')?.addEventListener('click', () => {
            if (!foundNR) return;
            const stations = Array.from(container.querySelectorAll<HTMLInputElement>('#edit-stations-group input:checked')).map(cb => cb.value);
            handleEditNR(foundNR.id, {
                expiryDate: (container.querySelector('#edit-expiry-date') as HTMLInputElement).value,
                expiryTime: (container.querySelector('#edit-expiry-time') as HTMLInputElement).value,
                isAmpliado: (container.querySelector('#edit-is-ampliado') as HTMLInputElement).checked,
                stations: stations,
            });
            currentView = 'INICIO';
            renderAppLayout(document.querySelector('.radioavisos-manager')!);
        });

    } else if (currentView === 'BORRAR') {
        const nrIdInput = container.querySelector('#delete-nr-id') as HTMLInputElement;
        container.querySelector('#delete-btn')?.addEventListener('click', () => {
            if (!nrIdInput.value.trim()) return;
            const nrExists = data.nrs.some(nr => nr.id === nrIdInput.value.trim());
            if (!nrExists) { alert(`El NR-${nrIdInput.value} no existe.`); return; }
            if (window.confirm(`!!!ADVERTENCIA!!!\n\nEstá a punto de ELIMINAR permanentemente el NR-${nrIdInput.value}.\nEsta acción no se puede deshacer. ¿Continuar?`)) {
                handleDeleteNR(nrIdInput.value.trim());
                currentView = 'INICIO';
                renderAppLayout(document.querySelector('.radioavisos-manager')!);
            }
        });
        container.querySelector('#cancel-btn')?.addEventListener('click', () => {
            if (!nrIdInput.value.trim()) return;
            const nrExists = data.nrs.some(nr => nr.id === nrIdInput.value.trim() && !nr.isCaducado);
            if (!nrExists) { alert(`El NR-${nrIdInput.value} no existe o ya está cancelado.`); return; }
            if (window.confirm(`¿Está seguro de que desea CANCELAR el NR-${nrIdInput.value}?`)) {
                handleCancelNR(nrIdInput.value.trim());
                currentView = 'INICIO';
                renderAppLayout(document.querySelector('.radioavisos-manager')!);
            }
        });
    }
}