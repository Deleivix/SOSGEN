import { getCurrentUser, User } from "../utils/auth";
import { ALL_STATIONS } from "../data";
import { initializeInfoTabs, showToast } from "../utils/helpers";

// --- DATA TYPES ---
type NR = {
    id: string; // YY-NNNN
    version: number;
    fullId: string; // YY-NNNN-V
    stations: string[];
    expiryDate: string;
    expiryTime: string;
    isAmpliado: boolean;
    isCaducado: boolean;
    // Client-side only properties for synchronization
    asunto?: string;
    zona?: string;
};

type HistoryLog = {
    id: string;
    timestamp: string;
    user: string;
    action: 'AÑADIDO' | 'EDITADO' | 'BORRADO' | 'CANCELADO';
    nrId: string;
    details: string;
};

type SalvamentoAviso = {
    num: string; // Corresponds to NR.id
    emision: string;
    asunto: string;
    zona: string;
    prioridad: string;
    caducidad: string;
};

type AppData = {
    nrs: NR[];
    history: HistoryLog[];
};


// --- COMPONENT STATE ---
let appData: AppData = { nrs: [], history: [] };
let salvamentoAvisos: SalvamentoAviso[] = [];
let isLoading = false;
let isSaving = false;
let isSasemarLoading = false;
let lastServerState: AppData = { nrs: [], history: [] };
let sortConfig: { key: keyof SalvamentoAviso; direction: 'ascending' | 'descending' } | null = { key: 'emision', direction: 'descending' };


// --- CORE DATA HANDLING ---

async function loadInitialData() {
    if (isLoading) return;
    isLoading = true;
    renderSalvamentoPanelHTML(); // Render all panels with loading state

    try {
        const response = await fetch('/api/radioavisos');
        if (!response.ok) throw new Error('Failed to fetch radioavisos data');
        const data: AppData = await response.json();
        appData = {
            nrs: data.nrs || [],
            history: data.history || [],
        };
        lastServerState = JSON.parse(JSON.stringify(appData));
        
        await synchronizeWithSalvamento(); // Synchronize after loading local data

    } catch (error) {
        showToast("Error al cargar los datos de Radioavisos.", "error");
        console.error(error);
    } finally {
        isLoading = false;
        renderSalvamentoPanelHTML();
        renderHistoryPanelHTML();
    }
}

async function synchronizeWithSalvamento() {
    const user = getCurrentUser();
    if (!user) return; // Cannot synchronize without a user

    try {
        const salvamentoResponse = await fetch('/api/salvamento-avisos');
        if (!salvamentoResponse.ok) throw new Error('Failed to fetch SASEMAR data for sync');
        const externalAvisos: SalvamentoAviso[] = await salvamentoResponse.json();

        let newNrsAdded = 0;
        const currentNrIds = new Set(appData.nrs.map(nr => nr.id));

        for (const aviso of externalAvisos) {
            const nrId = aviso.num.replace('/', '-');
            if (!currentNrIds.has(nrId)) {
                const caducidadParts = aviso.caducidad.split(' ');
                const dateParts = caducidadParts[0].split('/');
                const expiryDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                const expiryTime = caducidadParts[1];

                const newNr: NR = {
                    id: nrId,
                    version: 1,
                    fullId: `${nrId}-1`,
                    stations: [], // Empty stations as per requirement
                    expiryDate: expiryDate,
                    expiryTime: expiryTime,
                    isAmpliado: false,
                    isCaducado: false,
                    asunto: aviso.asunto, // Temporary data for display
                    zona: aviso.zona,
                };
                appData.nrs.push(newNr);
                addHistoryLog(user, 'AÑADIDO', newNr.fullId, `Sincronizado desde SASEMAR. Asunto: ${aviso.asunto}`);
                newNrsAdded++;
            }
        }

        if (newNrsAdded > 0) {
            showToast(`Sincronizados ${newNrsAdded} nuevos avisos desde SASEMAR.`, "info");
            await saveData(); // Save the newly added NRs to the database
        }

    } catch (error) {
        showToast("Error durante la sincronización con SASEMAR.", "error");
        console.error(error);
    }
}


async function saveData() {
    if (isSaving) return;
    isSaving = true;
    showToast("Guardando cambios...", "info");

    try {
        const response = await fetch('/api/radioavisos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
        if (!response.ok) throw new Error('Failed to save radioavisos data');
        lastServerState = JSON.parse(JSON.stringify(appData));
        showToast("Cambios guardados con éxito.", "success");
    } catch (error) {
        showToast("Error al guardar. Revirtiendo cambios locales.", "error");
        console.error(error);
        appData = lastServerState;
    } finally {
        isSaving = false;
        renderSalvamentoPanelHTML();
        renderHistoryPanelHTML();
    }
}

function addHistoryLog(user: User, action: HistoryLog['action'], nrId: string, details: string) {
    const newLog: HistoryLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: user.username,
        action,
        nrId,
        details
    };
    appData.history.unshift(newLog);
    if (appData.history.length > 200) appData.history.pop();
}

// --- RENDER FUNCTIONS ---

function getMedioTags(zona: string): string {
    const zonaUpper = zona.toUpperCase();
    const hasCoruna = zonaUpper.includes('CORUÑA');
    const hasOtherCoastal = zonaUpper.includes('ESPAÑA COSTA');

    let tags = '';
    if (hasCoruna && hasOtherCoastal) {
        tags += `<span class="category-badge navtex">NAVTEX</span>`;
        tags += `<span class="category-badge fonia">FONÍA</span>`;
    } else if (hasCoruna) {
        tags += `<span class="category-badge navtex">NAVTEX</span>`;
    } else {
        tags += `<span class="category-badge fonia">FONÍA</span>`;
    }
    return tags;
}


function renderSalvamentoPanelHTML() {
    const container = document.getElementById('salvamento-panel-container');
    if (!container) return;

    if (isLoading) {
        container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }

    const activeNrs = appData.nrs.filter(nr => !nr.isCaducado);

    if (activeNrs.length === 0) {
        container.innerHTML = `<p class="drill-placeholder">No hay radioavisos en vigor.</p>`;
        return;
    }
    
    // Sort by fullId for consistent display
    activeNrs.sort((a, b) => a.fullId.localeCompare(b.fullId));

    container.innerHTML = `
        <table class="radioavisos-table">
            <thead>
                <tr>
                    <th>NR</th>
                    <th>Asunto / Zona</th>
                    <th>Estaciones</th>
                    <th>Caducidad</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${activeNrs.map(nr => {
                    const isPending = nr.stations.length === 0;
                    return `
                    <tr class="${nr.isAmpliado ? 'ampliado' : ''} ${isPending ? 'pending' : ''}">
                        <td><strong>${nr.fullId}</strong></td>
                        <td>
                           ${nr.asunto ? `<div>${nr.asunto}</div><div class="zone-info">${nr.zona || ''}</div>` : ''}
                        </td>
                        <td><div class="station-list">${nr.stations.join(', ')}</div></td>
                        <td>${nr.expiryDate || 'N/A'} ${nr.expiryTime || ''}</td>
                        <td class="status-cell">
                            ${isPending ? '<span class="category-badge pendiente">PENDIENTE</span>' : ''}
                            ${nr.isAmpliado ? 'AMPLIADO' : 'EN VIGOR'}
                        </td>
                        <td class="nr-actions">
                             <button class="icon-btn" title="Editar" data-action="edit" data-id="${nr.fullId}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M13.44 2.56a1.9 1.9 0 0 0-2.69 0l-.56.56-8 8-.01.01-2.05 2.05a.75.75 0 0 0 1.06 1.06l2.05-2.05.01-.01 8-8 .56-.56a1.9 1.9 0 0 0 0-2.69ZM12.38 3.62 9.25 6.75l-1.5-1.5 3.13-3.13a.4.4 0 0 1 .57 0l1.5 1.5a.4.4 0 0 1 0 .57Z"/></svg></button>
                            <button class="icon-btn" title="Ampliar" data-action="amplify" data-id="${nr.fullId}" ${isPending ? 'disabled' : ''}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M8.75 3.5a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5V3.5Z"/></svg></button>
                            <button class="icon-btn" title="Cancelar" data-action="cancel" data-id="${nr.fullId}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-1-5.293a1 1 0 0 0 1.414 1.414l1.293-1.293 1.293 1.293a1 1 0 1 0 1.414-1.414L9.414 8l1.293-1.293a1 1 0 1 0-1.414-1.414L8 6.586 6.707 5.293a1 1 0 0 0-1.414 1.414L6.586 8 5.293 9.293a1 1 0 0 0 0 1.414Z"/></svg></button>
                            <button class="icon-btn danger" title="Borrar" data-action="delete" data-id="${nr.fullId}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M5 3.25A2.25 2.25 0 0 1 7.25 1h1.5A2.25 2.25 0 0 1 11 3.25V4h2.75a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1 0-1.5H5V3.25ZM5.75 6a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0V6Zm4.5 0a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0V6Z" clip-rule="evenodd" /></svg></button>
                        </td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
    `;
}

// ... the rest of the file remains the same ...
// [Existing code for renderHistoryPanelHTML, renderSasemarPanelHTML, renderNrModal, handlers etc.]
function renderHistoryPanelHTML() {
    const historyContainer = document.getElementById('history-panel-container');
    if (!historyContainer) return;
    
    if (isLoading) {
        historyContainer.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }
    
    if (appData.history.length === 0) {
        historyContainer.innerHTML = `<p class="drill-placeholder">No hay historial de cambios.</p>`;
        return;
    }

    historyContainer.innerHTML = `
        <div class="history-log-list">
        ${appData.history.map(log => `
            <div class="history-log-item">
                <span class="history-log-ts">${new Date(log.timestamp).toLocaleString('es-ES')}</span>
                <span class="history-log-user">${log.user}</span>
                <span class="history-log-action ${log.action.toLowerCase()}">${log.action}</span>
                <span class="history-log-nrid">${log.nrId}</span>
                <span class="history-log-details">${log.details}</span>
            </div>
        `).join('')}
        </div>
    `;
}

function renderSasemarPanelHTML() {
    const listContainer = document.getElementById('sasemar-panel-container');
    if (!listContainer) return;

    if (isSasemarLoading) {
        listContainer.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }
    
    if (salvamentoAvisos.length === 0) {
        listContainer.innerHTML = `<p class="drill-placeholder">No se encontraron avisos de SASEMAR en este momento.</p>`;
        return;
    }
    
    const sortArrow = (key: keyof SalvamentoAviso) => {
        if (sortConfig?.key === key) {
            return sortConfig.direction === 'ascending' ? '▲' : '▼';
        }
        return '↕';
    };

    const sortedAvisos = [...salvamentoAvisos].sort((a, b) => {
        if (!sortConfig) return 0;
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Special date sort for 'emision'
        if (sortConfig.key === 'emision' || sortConfig.key === 'caducidad') {
             const dateA = new Date(aValue.split(' ')[0].split('/').reverse().join('-') + 'T' + aValue.split(' ')[1]);
             const dateB = new Date(bValue.split(' ')[0].split('/').reverse().join('-') + 'T' + bValue.split(' ')[1]);
             return sortConfig.direction === 'ascending' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });

    listContainer.innerHTML = `
        <table class="radioavisos-table">
            <thead>
                <tr>
                    <th data-sort="num">Num. ${sortArrow('num')}</th>
                    <th data-sort="emision">Emisión ${sortArrow('emision')}</th>
                    <th data-sort="asunto">Asunto ${sortArrow('asunto')}</th>
                    <th data-sort="zona">Zona ${sortArrow('zona')}</th>
                    <th>Prioridad</th>
                    <th>Medio</th>
                    <th data-sort="caducidad">Caducidad ${sortArrow('caducidad')}</th>
                </tr>
            </thead>
            <tbody>
                ${sortedAvisos.map(aviso => `
                    <tr>
                        <td><strong>${aviso.num}</strong></td>
                        <td>${aviso.emision}</td>
                        <td>${aviso.asunto}</td>
                        <td>${aviso.zona}</td>
                        <td><span class="category-badge importante">${aviso.prioridad}</span></td>
                        <td>${getMedioTags(aviso.zona)}</td>
                        <td>${aviso.caducidad}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderNrModal(nrToEdit?: NR) {
    const isNew = !nrToEdit;
    const modalId = `nr-modal-${Date.now()}`;
    if (document.getElementById(modalId)) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = modalId;
    
    const nextNrId = isNew ? (() => {
        const year = new Date().getFullYear().toString().slice(-2);
        const existingNrs = appData.nrs.filter(nr => nr.id.startsWith(year)).map(nr => parseInt(nr.id.slice(3), 10));
        const nextNum = existingNrs.length > 0 ? Math.max(...existingNrs) + 1 : 1;
        return `${year}-${String(nextNum).padStart(4, '0')}`;
    })() : nrToEdit.id;

    const now = new Date();
    const defaultExpiryDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const defaultExpiryTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <h2 class="modal-title">${isNew ? 'Añadir Nuevo Radioaviso' : `Editar Radioaviso ${nrToEdit.fullId}`}</h2>
            <form id="nr-form">
                <div class="form-grid">
                    <div class="form-group" style="grid-column: 1 / 3;">
                        <label for="nr-id">Número de NR (formato YY-NNNN)</label>
                        <input type="text" id="nr-id" class="simulator-input" value="${isNew ? nextNrId : nrToEdit.id}" required ${!isNew ? 'disabled' : ''}>
                    </div>
                    <div class="form-group">
                        <label for="nr-expiry-date">Fecha Caducidad</label>
                        <input type="date" id="nr-expiry-date" class="simulator-input" value="${nrToEdit?.expiryDate || defaultExpiryDate}">
                    </div>
                    <div class="form-group">
                        <label for="nr-expiry-time">Hora Caducidad (UTC)</label>
                        <input type="time" id="nr-expiry-time" class="simulator-input" value="${nrToEdit?.expiryTime || defaultExpiryTime}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Estaciones (seleccionar una o más)</label>
                    <div class="station-checkbox-grid">
                        ${ALL_STATIONS.map(station => `
                            <label class="checkbox-label">
                                <input type="checkbox" name="nr-stations" value="${station}" ${nrToEdit?.stations.includes(station) ? 'checked' : ''}>
                                <span>${station}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="button-container">
                    <button type="button" class="secondary-btn modal-cancel-btn">Cancelar</button>
                    <button type="submit" class="primary-btn modal-save-btn">Guardar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    const form = modalOverlay.querySelector('#nr-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => handleSaveNr(e, nrToEdit, modalOverlay));
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay || (e.target as HTMLElement).closest('.modal-cancel-btn')) {
            modalOverlay.remove();
        }
    });
}

// --- EVENT HANDLERS ---
async function loadAndRenderSasemar() {
    if (isSasemarLoading) return;
    isSasemarLoading = true;
    renderSasemarPanelHTML(); 

    try {
        const response = await fetch('/api/salvamento-avisos');
        if (!response.ok) throw new Error('Failed to fetch SASEMAR data');
        salvamentoAvisos = await response.json();
    } catch (error) {
        showToast("Error al cargar los avisos de SASEMAR.", "error");
        console.error(error);
    } finally {
        isSasemarLoading = false;
        renderSasemarPanelHTML();
    }
}


async function handleSaveNr(e: Event, nrToEdit: NR | undefined, modal: HTMLElement) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) {
        showToast("Debe iniciar sesión para guardar cambios.", "error");
        return;
    }

    const form = e.target as HTMLFormElement;
    const id = (form.querySelector('#nr-id') as HTMLInputElement).value.trim();
    const expiryDate = (form.querySelector('#nr-expiry-date') as HTMLInputElement).value;
    const expiryTime = (form.querySelector('#nr-expiry-time') as HTMLInputElement).value;
    const selectedStations = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="nr-stations"]:checked')).map(cb => cb.value);

    if (!/^\d{2}-\d{4}$/.test(id)) {
        showToast("El formato del NR debe ser YY-NNNN (ej. 24-0001).", "error");
        return;
    }
    if (selectedStations.length === 0) {
        showToast("Debe seleccionar al menos una estación.", "error");
        return;
    }

    if (nrToEdit) { // Editing existing NR
        const index = appData.nrs.findIndex(nr => nr.fullId === nrToEdit.fullId);
        if (index > -1) {
            const oldNr = appData.nrs[index];
            const changes = [];
            if (oldNr.expiryDate !== expiryDate || oldNr.expiryTime !== expiryTime) changes.push(`caducidad cambiada a ${expiryDate} ${expiryTime}`);
            if (JSON.stringify(oldNr.stations.sort()) !== JSON.stringify(selectedStations.sort())) changes.push(`estaciones cambiadas a ${selectedStations.join(', ')}`);
            
            if (changes.length > 0) {
                appData.nrs[index] = { ...oldNr, stations: selectedStations, expiryDate, expiryTime, asunto: undefined, zona: undefined };
                addHistoryLog(user, 'EDITADO', appData.nrs[index].fullId, `Editado: ${changes.join('; ')}.`);
                await saveData();
            }
        }
    } else { // Creating new NR
        if (appData.nrs.some(nr => nr.id === id && nr.version === 1)) {
            showToast(`El Radioaviso ${id} ya existe.`, "error");
            return;
        }
        const newNr: NR = {
            id,
            version: 1,
            fullId: `${id}-1`,
            stations: selectedStations,
            expiryDate,
            expiryTime,
            isAmpliado: false,
            isCaducado: false,
        };
        appData.nrs.push(newNr);
        addHistoryLog(user, 'AÑADIDO', newNr.fullId, `Añadido con estaciones: ${selectedStations.join(', ')}.`);
        await saveData();
    }
    modal.remove();
}

async function handleDeleteNr(fullId: string) {
    const user = getCurrentUser();
    if (!user) return;
    if (!window.confirm(`¿BORRAR PERMANENTEMENTE el NR ${fullId} y todas sus versiones?`)) return;

    const baseId = fullId.split('-')[0];
    const versionsDeleted = appData.nrs.filter(nr => nr.id === baseId).length;
    appData.nrs = appData.nrs.filter(nr => nr.id !== baseId);

    addHistoryLog(user, 'BORRADO', baseId, `Borrado permanente del NR y sus ${versionsDeleted} versiones.`);
    await saveData();
}

async function handleCancelNr(fullId: string) {
    const user = getCurrentUser();
    if (!user) return;
    if (!window.confirm(`¿CANCELAR (marcar como caducado) el radioaviso ${fullId}?`)) return;

    const index = appData.nrs.findIndex(nr => nr.fullId === fullId);
    if (index > -1) {
        appData.nrs[index].isCaducado = true;
        addHistoryLog(user, 'CANCELADO', fullId, `NR cancelado manualmente.`);
        await saveData();
    }
}

async function handleAmplifyNr(fullId: string) {
    const user = getCurrentUser();
    if (!user) return;

    const originalNr = appData.nrs.find(nr => nr.fullId === fullId);
    if (!originalNr) return;

    const newVersion = originalNr.version + 1;
    const newFullId = `${originalNr.id}-${newVersion}`;

    if (appData.nrs.some(nr => nr.fullId === newFullId)) {
        showToast(`La versión ${newVersion} de este NR ya existe.`, "error");
        return;
    }
    const { asunto, zona, ...restOfOriginalNr } = originalNr;
    const newNr: NR = {
        ...restOfOriginalNr,
        version: newVersion,
        fullId: newFullId,
        isAmpliado: true,
        isCaducado: false
    };

    appData.nrs.push(newNr);
    addHistoryLog(user, 'EDITADO', newFullId, `NR ampliado desde la versión ${originalNr.version}.`);
    await saveData();
}

function handleSort(key: keyof SalvamentoAviso) {
    if (sortConfig && sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    } else {
        sortConfig = { key, direction: 'descending' };
    }
    renderSasemarPanelHTML();
}

// --- INITIALIZATION ---

export function renderRadioavisos(container: HTMLElement) {
    container.innerHTML = `
        <div id="radioavisos-page-container">
            <div class="content-card" style="max-width: none;">
                <h2 class="content-card-title">Gestión de Radioavisos</h2>
                <div class="info-nav-tabs">
                    <button class="info-nav-btn active" data-action="switch-tab" data-tab="nrs" data-target="radioavisos-tab-nrs">Gestor de NRs</button>
                    <button class="info-nav-btn" data-action="switch-tab" data-tab="sasemar" data-target="radioavisos-tab-sasemar">Avisos SASEMAR</button>
                    <button class="info-nav-btn" data-action="switch-tab" data-tab="history" data-target="radioavisos-tab-history">Historial de Cambios</button>
                </div>

                <div id="radioavisos-tab-nrs" class="sub-tab-panel active">
                    <div class="nr-header">
                        <p class="translator-desc">Gestione los radioavisos costeros (NR) en vigor. Los avisos de SASEMAR se sincronizan automáticamente; los que aparecen como "PENDIENTE" requieren que les asigne estaciones.</p>
                        <button class="primary-btn" data-action="add-nr">Añadir NR Manual</button>
                    </div>
                    <div id="salvamento-panel-container" class="radioavisos-list"></div>
                </div>

                <div id="radioavisos-tab-sasemar" class="sub-tab-panel">
                     <p class="translator-desc">Listado de los últimos radioavisos publicados por Salvamento Marítimo. Esta información es de solo lectura y se actualiza periódicamente. Haga clic en las cabeceras para ordenar.</p>
                     <div id="sasemar-panel-container" class="radioavisos-list"></div>
                </div>

                <div id="radioavisos-tab-history" class="sub-tab-panel">
                     <p class="translator-desc">Historial de todas las acciones realizadas en el sistema de radioavisos.</p>
                     <div id="history-panel-container" class="radioavisos-list"></div>
                </div>
            </div>
        </div>
    `;

    initializeInfoTabs(container); // For tab switching
    
    loadInitialData();
    
    const pageContainer = document.getElementById('radioavisos-page-container');
    if (!pageContainer) return;

    pageContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Sorting handler for SASEMAR table
        const th = target.closest<HTMLTableCellElement>('th[data-sort]');
        if (th) {
            handleSort(th.dataset.sort as keyof SalvamentoAviso);
            return;
        }

        const button = target.closest<HTMLButtonElement>('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        
        if (action === 'add-nr') renderNrModal();
        if (action === 'edit' && id) renderNrModal(appData.nrs.find(nr => nr.fullId === id));
        if (action === 'delete' && id) handleDeleteNr(id);
        if (action === 'cancel' && id) handleCancelNr(id);
        if (action === 'amplify' && id) handleAmplifyNr(id);
        
        if (action === 'switch-tab' && button.dataset.tab === 'sasemar' && salvamentoAvisos.length === 0) {
            loadAndRenderSasemar();
        }
    });
}