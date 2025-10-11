import { getCurrentUser, User } from "../utils/auth";
import { ALL_STATIONS } from "../data";
import { initializeInfoTabs, showToast } from "../utils/helpers";

// --- DATA TYPES (from api/radioavisos.ts & api/salvamento-avisos.ts) ---
type NR = {
    id: string;
    version: number;
    fullId: string;
    stations: string[];
    expiryDate: string;
    expiryTime: string;
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

type SalvamentoAviso = {
    num: string;
    emision: string;
    asunto: string;
    zona: string;
    tipo: string;
    subtipo: string;
    prioridad: string;
    caducidad: string;
    eventTarget: string;
};

// --- COMPONENT STATE ---
let nrs: NR[] = [];
let history: HistoryLog[] = [];
let salvamentoAvisos: SalvamentoAviso[] = [];
let isLoading = false;
let isSaving = false;
let isSasemarLoading = false;
let lastServerState: { nrs: NR[], history: HistoryLog[] } = { nrs: [], history: [] };

// --- CORE DATA HANDLING ---

async function loadData() {
    if (isLoading) return;
    isLoading = true;
    renderNrList(); // Show loading state

    try {
        const response = await fetch('/api/radioavisos');
        if (!response.ok) throw new Error('Failed to fetch radioavisos data');
        const data = await response.json();
        nrs = data.nrs || [];
        history = data.history || [];
        lastServerState = { nrs: JSON.parse(JSON.stringify(nrs)), history: JSON.parse(JSON.stringify(history)) };
    } catch (error) {
        showToast("Error al cargar los datos de Radioavisos.", "error");
        console.error(error);
    } finally {
        isLoading = false;
        renderNrList();
        renderHistoryList();
    }
}

async function loadSasemarData() {
    if (isSasemarLoading) return;
    isSasemarLoading = true;
    renderSasemarList(); // Show loading state

    try {
        const response = await fetch('/api/salvamento-avisos');
        if (!response.ok) throw new Error('Failed to fetch SASEMAR data');
        salvamentoAvisos = await response.json();
    } catch (error) {
        showToast("Error al cargar los avisos de SASEMAR.", "error");
        console.error(error);
    } finally {
        isSasemarLoading = false;
        renderSasemarList();
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
            body: JSON.stringify({ nrs, history })
        });
        if (!response.ok) throw new Error('Failed to save radioavisos data');
        lastServerState = { nrs: JSON.parse(JSON.stringify(nrs)), history: JSON.parse(JSON.stringify(history)) };
        showToast("Cambios guardados con éxito.", "success");
    } catch (error) {
        showToast("Error al guardar los datos. Revirtiendo cambios locales.", "error");
        console.error(error);
        // Revert to last known good state from server
        nrs = lastServerState.nrs;
        history = lastServerState.history;
        renderNrList();
        renderHistoryList();
    } finally {
        isSaving = false;
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
    history.unshift(newLog);
    if (history.length > 100) history.pop();
}

// --- RENDER FUNCTIONS ---

function renderNrList() {
    const listContainer = document.getElementById('nr-list-container');
    if (!listContainer) return;

    if (isLoading) {
        listContainer.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }

    const activeNrs = nrs.filter(nr => !nr.isCaducado);

    if (activeNrs.length === 0) {
        listContainer.innerHTML = `<p class="drill-placeholder">No hay radioavisos en vigor.</p>`;
        return;
    }

    listContainer.innerHTML = `
        <table class="radioavisos-table">
            <thead>
                <tr>
                    <th>NR</th>
                    <th>Estaciones</th>
                    <th>Caducidad</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${activeNrs.sort((a, b) => a.id.localeCompare(b.id) || a.version - b.version).map(nr => `
                    <tr class="${nr.isAmpliado ? 'ampliado' : ''}">
                        <td><strong>${nr.fullId}</strong></td>
                        <td><div class="station-list">${nr.stations.join(', ')}</div></td>
                        <td>${nr.expiryDate || 'N/A'} ${nr.expiryTime || ''}</td>
                        <td>${nr.isAmpliado ? 'AMPLIADO' : 'EN VIGOR'}</td>
                        <td class="nr-actions">
                            <button class="icon-btn" title="Editar" data-action="edit" data-id="${nr.fullId}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M13.44 2.56a1.9 1.9 0 0 0-2.69 0l-.56.56-8 8-.01.01-2.05 2.05a.75.75 0 0 0 1.06 1.06l2.05-2.05.01-.01 8-8 .56-.56a1.9 1.9 0 0 0 0-2.69ZM12.38 3.62 9.25 6.75l-1.5-1.5 3.13-3.13a.4.4 0 0 1 .57 0l1.5 1.5a.4.4 0 0 1 0 .57Z"/></svg></button>
                            <button class="icon-btn" title="Ampliar" data-action="amplify" data-id="${nr.fullId}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M8.75 3.5a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5V3.5Z"/></svg></button>
                            <button class="icon-btn" title="Cancelar" data-action="cancel" data-id="${nr.fullId}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-1-5.293a1 1 0 0 0 1.414 1.414l1.293-1.293 1.293 1.293a1 1 0 1 0 1.414-1.414L9.414 8l1.293-1.293a1 1 0 1 0-1.414-1.414L8 6.586 6.707 5.293a1 1 0 0 0-1.414 1.414L6.586 8 5.293 9.293a1 1 0 0 0 0 1.414Z"/></svg></button>
                            <button class="icon-btn danger" title="Borrar" data-action="delete" data-id="${nr.fullId}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M5 3.25A2.25 2.25 0 0 1 7.25 1h1.5A2.25 2.25 0 0 1 11 3.25V4h2.75a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1 0-1.5H5V3.25ZM5.75 6a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0V6Zm4.5 0a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0V6Z" clip-rule="evenodd" /></svg></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderHistoryList() {
    const historyContainer = document.getElementById('nr-history-list');
    if (!historyContainer) return;
    
    if (isLoading) { // Re-use main loading flag
        historyContainer.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }
    
    if (history.length === 0) {
        historyContainer.innerHTML = `<p class="drill-placeholder">No hay historial de cambios.</p>`;
        return;
    }

    historyContainer.innerHTML = `
        <div class="history-log-list">
        ${history.map(log => `
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

function renderSasemarList() {
    const listContainer = document.getElementById('sasemar-list-container');
    if (!listContainer) return;

    if (isSasemarLoading) {
        listContainer.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }
    
    if (salvamentoAvisos.length === 0) {
        listContainer.innerHTML = `<p class="drill-placeholder">No se encontraron avisos de SASEMAR en este momento.</p>`;
        return;
    }
    
    listContainer.innerHTML = `
        <table class="radioavisos-table">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Asunto</th>
                    <th>Zona</th>
                    <th>Emisión</th>
                    <th>Caducidad</th>
                </tr>
            </thead>
            <tbody>
                ${salvamentoAvisos.map(aviso => `
                    <tr>
                        <td><strong>${aviso.num}</strong></td>
                        <td>${aviso.asunto}</td>
                        <td>${aviso.zona}</td>
                        <td>${aviso.emision}</td>
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
        const existingNrs = nrs.filter(nr => nr.id.startsWith(year)).map(nr => parseInt(nr.id.slice(3), 10));
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
        const index = nrs.findIndex(nr => nr.fullId === nrToEdit.fullId);
        if (index > -1) {
            const oldNr = nrs[index];
            const changes = [];
            if (oldNr.expiryDate !== expiryDate || oldNr.expiryTime !== expiryTime) changes.push(`caducidad cambiada a ${expiryDate} ${expiryTime}`);
            if (JSON.stringify(oldNr.stations.sort()) !== JSON.stringify(selectedStations.sort())) changes.push(`estaciones cambiadas a ${selectedStations.join(', ')}`);
            
            if (changes.length > 0) {
                nrs[index] = { ...oldNr, stations: selectedStations, expiryDate, expiryTime };
                addHistoryLog(user, 'EDITADO', nrs[index].fullId, `Editado: ${changes.join('; ')}.`);
                await saveData();
            }
        }
    } else { // Creating new NR
        if (nrs.some(nr => nr.id === id && nr.version === 1)) {
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
        nrs.push(newNr);
        addHistoryLog(user, 'AÑADIDO', newNr.fullId, `Añadido con estaciones: ${selectedStations.join(', ')}.`);
        await saveData();
    }
    modal.remove();
    renderNrList();
    renderHistoryList();
}

async function handleDeleteNr(fullId: string) {
    const user = getCurrentUser();
    if (!user) {
        showToast("Debe iniciar sesión para borrar.", "error");
        return;
    }
    if (!window.confirm(`¿Está seguro de que quiere BORRAR PERMANENTEMENTE el radioaviso ${fullId} y todas sus versiones? Esta acción no se puede deshacer.`)) return;

    const baseId = fullId.split('-')[0];
    const nrsToDelete = nrs.filter(nr => nr.id === baseId);
    nrs = nrs.filter(nr => nr.id !== baseId);

    addHistoryLog(user, 'BORRADO', baseId, `Borrado permanente del NR y sus ${nrsToDelete.length} versiones.`);
    await saveData();
    renderNrList();
    renderHistoryList();
}

async function handleCancelNr(fullId: string) {
    const user = getCurrentUser();
    if (!user) {
        showToast("Debe iniciar sesión para cancelar.", "error");
        return;
    }
    if (!window.confirm(`¿Está seguro de que quiere CANCELAR (marcar como caducado) el radioaviso ${fullId}?`)) return;

    const index = nrs.findIndex(nr => nr.fullId === fullId);
    if (index > -1) {
        nrs[index].isCaducado = true;
        addHistoryLog(user, 'CANCELADO', fullId, `NR cancelado manualmente.`);
        await saveData();
        renderNrList();
        renderHistoryList();
    }
}

async function handleAmplifyNr(fullId: string) {
    const user = getCurrentUser();
    if (!user) {
        showToast("Debe iniciar sesión para ampliar.", "error");
        return;
    }

    const originalNr = nrs.find(nr => nr.fullId === fullId);
    if (!originalNr) return;

    const newVersion = originalNr.version + 1;
    const newFullId = `${originalNr.id}-${newVersion}`;

    if (nrs.some(nr => nr.fullId === newFullId)) {
        showToast(`La versión ${newVersion} de este NR ya existe.`, "error");
        return;
    }

    const newNr: NR = {
        ...originalNr,
        version: newVersion,
        fullId: newFullId,
        isAmpliado: true,
        isCaducado: false
    };

    nrs.push(newNr);
    addHistoryLog(user, 'EDITADO', newFullId, `NR ampliado desde la versión ${originalNr.version}.`);
    await saveData();
    renderNrList();
    renderHistoryList();
}


function initializeRadioavisos() {
    loadData();
    
    const pageContainer = document.getElementById('radioavisos-page-container');
    if (!pageContainer) return;

    pageContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest<HTMLButtonElement>('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === 'add-nr') renderNrModal();
        if (action === 'edit' && id) renderNrModal(nrs.find(nr => nr.fullId === id));
        if (action === 'delete' && id) handleDeleteNr(id);
        if (action === 'cancel' && id) handleCancelNr(id);
        if (action === 'amplify' && id) handleAmplifyNr(id);
        
        if (action === 'switch-tab') {
            const tab = button.dataset.tab;
            if (tab === 'sasemar' && salvamentoAvisos.length === 0) {
                loadSasemarData();
            }
        }
    });
}

export function renderRadioavisos(container: HTMLElement) {
    container.innerHTML = `
        <div id="radioavisos-page-container">
            <div class="content-card">
                <h2 class="content-card-title">Gestión de Radioavisos (NR)</h2>
                <div class="info-nav-tabs">
                    <button class="info-nav-btn active" data-action="switch-tab" data-tab="nrs" data-target="radioavisos-tab-nrs">NR en Vigor</button>
                    <button class="info-nav-btn" data-action="switch-tab" data-tab="history" data-target="radioavisos-tab-history">Historial</button>
                    <button class="info-nav-btn" data-action="switch-tab" data-tab="sasemar" data-target="radioavisos-tab-sasemar">Avisos SASEMAR</button>
                </div>

                <div id="radioavisos-tab-nrs" class="sub-tab-panel active">
                    <div class="nr-header">
                        <p class="translator-desc">Gestione los radioavisos costeros (NR) actualmente en vigor.</p>
                        <button class="primary-btn" data-action="add-nr">Añadir NR</button>
                    </div>
                    <div id="nr-list-container" class="radioavisos-list"></div>
                </div>

                <div id="radioavisos-tab-history" class="sub-tab-panel">
                     <p class="translator-desc">Historial de todas las acciones realizadas en el sistema de radioavisos.</p>
                     <div id="nr-history-list" class="radioavisos-list"></div>
                </div>
                
                <div id="radioavisos-tab-sasemar" class="sub-tab-panel">
                     <p class="translator-desc">Listado de los últimos radioavisos publicados por Salvamento Marítimo. Esta información es de solo lectura y se actualiza periódicamente.</p>
                     <div id="sasemar-list-container" class="radioavisos-list"></div>
                </div>
            </div>
        </div>
    `;

    initializeInfoTabs(container);
    initializeRadioavisos();
}
