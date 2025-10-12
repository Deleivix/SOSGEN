import { ALL_STATIONS } from "../data";
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

// --- STATE ---
type NR = {
    id: string;
    baseId: string;
    version: number;
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
};

let appData: { nrs: NR[], history: HistoryLog[] } = { nrs: [], history: [] };
let salvamentoAvisos: SalvamentoAviso[] = [];
let isLoadingNRs = false;
let isLoadingSalvamento = false;

// --- API INTERACTIONS ---
async function fetchData() {
    isLoadingNRs = true;
    isLoadingSalvamento = true;
    renderAll();

    const nrPromise = fetch('/api/radioavisos').then(res => {
        if (!res.ok) throw new Error('Failed to fetch NR data');
        return res.json();
    });

    const salvamentoPromise = fetch('/api/salvamento-avisos').then(res => {
        if (!res.ok) throw new Error('Failed to fetch Salvamento avisos');
        return res.json();
    });

    const [nrResult, salvamentoResult] = await Promise.allSettled([nrPromise, salvamentoPromise]);

    if (nrResult.status === 'fulfilled') {
        appData = nrResult.value;
    } else {
        showToast(nrResult.reason.message, 'error');
        appData = { nrs: [], history: [] };
    }
    isLoadingNRs = false;

    if (salvamentoResult.status === 'fulfilled') {
        salvamentoAvisos = salvamentoResult.value;
    } else {
        showToast(salvamentoResult.reason.message, 'error');
        salvamentoAvisos = [];
    }
    isLoadingSalvamento = false;

    renderAll();
}

async function saveData() {
    try {
        const response = await fetch('/api/radioavisos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
        if (!response.ok) throw new Error('Failed to save data to server');
        showToast('Datos guardados correctamente.', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error al guardar los datos.', 'error');
    }
}

// --- LOGIC ---
function addHistoryLog(action: HistoryLog['action'], nr: NR, details: string) {
    const user = getCurrentUser();
    if (!user) return;
    const newLog: HistoryLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: user.username,
        action,
        nrId: nr.baseId,
        details
    };
    appData.history.unshift(newLog);
    if (appData.history.length > 100) appData.history.pop();
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    renderNRManagement();
    renderHistory();
    renderSalvamentoAvisos();
}

function renderNRManagement() {
    const container = document.getElementById('nr-management-content');
    if (!container) return;

    if (isLoadingNRs) {
        container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }

    const activeNRs = appData.nrs.filter(nr => !nr.isCaducado);
    const expiredNRs = appData.nrs.filter(nr => nr.isCaducado);

    container.innerHTML = `
        <div class="nr-list-section">
            <h3 class="nr-section-title">Radioavisos Activos (${activeNRs.length})</h3>
            <div id="active-nrs-list" class="nr-list">
                ${activeNRs.length > 0 ? activeNRs.map(renderNREntry).join('') : '<p class="drill-placeholder">No hay radioavisos activos.</p>'}
            </div>
        </div>
        <div class="nr-list-section">
            <h3 class="nr-section-title">Radioavisos Caducados/Cancelados (${expiredNRs.length})</h3>
            <div id="expired-nrs-list" class="nr-list">
                 ${expiredNRs.length > 0 ? expiredNRs.map(renderNREntry).join('') : '<p class="drill-placeholder">No hay radioavisos caducados.</p>'}
            </div>
        </div>
    `;
}

function renderNREntry(nr: NR): string {
    const expiryDT = nr.expiryDate && nr.expiryTime ? new Date(`${nr.expiryDate}T${nr.expiryTime}:00Z`).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A';
    const isCancelled = appData.history.some(h => h.nrId === nr.baseId && h.action === 'CANCELADO' && !h.details.includes('versión'));

    let statusClass = '';
    let statusText = '';
    if (nr.isCaducado) {
        statusClass = 'caducado';
        statusText = isCancelled ? 'Cancelado' : 'Caducado';
    } else if (nr.isAmpliado) {
        statusClass = 'ampliado';
        statusText = 'Ampliado';
    }

    return `
        <div class="nr-entry ${statusClass}" data-nr-id="${nr.id}">
            <div class="nr-entry-main">
                <strong class="nr-id">${nr.id.replace('NR-', '')}</strong>
                <span class="nr-stations">${nr.stations.join(', ')}</span>
                <span class="nr-expiry">Caduca: ${expiryDT}</span>
                ${statusText ? `<span class="nr-status">${statusText}</span>` : ''}
            </div>
            <div class="nr-entry-actions">
                ${!nr.isCaducado ? `
                    <button class="tertiary-btn" data-action="edit">Editar</button>
                    <button class="tertiary-btn" data-action="cancel">Cancelar</button>
                ` : ''}
                <button class="tertiary-btn" data-action="delete">Borrar</button>
            </div>
        </div>
    `;
}

function renderHistory() {
    const container = document.getElementById('nr-history-content');
    if (!container) return;

    if (isLoadingNRs) {
        container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }
    
    container.innerHTML = `
        <div class="history-log-list">
            ${appData.history.length > 0 ? appData.history.map(log => `
                <div class="history-log-entry">
                    <span class="log-timestamp">${new Date(log.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                    <span class="log-user">${log.user}</span>
                    <span class="log-action log-action-${log.action.toLowerCase()}">${log.action}</span>
                    <span class="log-details"><strong>${log.nrId}:</strong> ${log.details}</span>
                </div>
            `).join('') : '<p class="drill-placeholder">No hay historial de cambios.</p>'}
        </div>
    `;
}

function renderSalvamentoAvisos() {
    const container = document.getElementById('salvamento-avisos-content');
    if (!container) return;

    if (isLoadingSalvamento) {
        const skeletonRow = `<tr>${Array(5).fill('<td><div class="skeleton skeleton-text"></div></td>').join('')}</tr>`;
        container.innerHTML = `
            <table class="reference-table">
                <thead><tr><th>Número</th><th>Asunto</th><th>Zona</th><th>Tipo</th><th>Emisión</th></tr></thead>
                <tbody>${Array(10).fill(skeletonRow).join('')}</tbody>
            </table>`;
        return;
    }

    if (salvamentoAvisos.length === 0) {
        container.innerHTML = `<p class="drill-placeholder">No se pudieron cargar los avisos de Salvamento Marítimo o no hay ninguno activo.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="reference-table">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Asunto</th>
                    <th>Zona</th>
                    <th>Tipo</th>
                    <th>Emisión</th>
                </tr>
            </thead>
            <tbody>
                ${salvamentoAvisos.map(aviso => `
                    <tr>
                        <td>${aviso.num}</td>
                        <td>${aviso.asunto}</td>
                        <td>${aviso.zona}</td>
                        <td>${aviso.tipo}</td>
                        <td>${aviso.emision}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderNRModal(nr: Partial<NR> | null = null) {
    const modalId = 'nr-modal';
    if (document.getElementById(modalId)) return;

    const isEditing = nr !== null;
    const now = new Date();
    const defaultExpiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const modalTitle = isEditing ? `Editar Radioaviso ${nr!.id}` : 'Añadir Nuevo Radioaviso';
    const baseIdParts = isEditing ? nr!.baseId!.split('/') : [`${(appData.nrs.length + 1).toString().padStart(4, '0')}`, `${now.getFullYear()}`];

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = modalId;
    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <h2 class="modal-title">${modalTitle}</h2>
            <form id="nr-form">
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="nr-num">Número</label>
                        <input type="text" id="nr-num" value="${baseIdParts[0]}" required class="simulator-input">
                    </div>
                    <div class="form-group">
                        <label for="nr-year">Año</label>
                        <input type="text" id="nr-year" value="${baseIdParts[1]}" required class="simulator-input">
                    </div>
                </div>
                <div class="form-group">
                    <label>Estaciones</label>
                    <div id="nr-stations-selector" class="station-selector">
                        <button type="button" class="station-quick-select" data-stations="${ALL_STATIONS.join(',')}">Todas</button>
                        <button type="button" class="station-quick-select" data-stations="">Ninguna</button>
                        ${ALL_STATIONS.map(s => `
                            <label class="station-checkbox">
                                <input type="checkbox" name="station" value="${s}" ${isEditing && nr!.stations!.includes(s) ? 'checked' : ''}>
                                <span>${s}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="nr-expiry-date">Fecha Caducidad (UTC)</label>
                        <input type="date" id="nr-expiry-date" value="${isEditing ? nr!.expiryDate : defaultExpiryDate.toISOString().split('T')[0]}" required class="simulator-input">
                    </div>
                    <div class="form-group">
                        <label for="nr-expiry-time">Hora Caducidad (UTC)</label>
                        <input type="time" id="nr-expiry-time" value="${isEditing ? nr!.expiryTime : '12:00'}" required class="simulator-input">
                    </div>
                </div>
                <div class="form-group">
                    <label class="station-checkbox">
                        <input type="checkbox" id="nr-is-ampliado" ${isEditing && nr!.isAmpliado ? 'checked' : ''}>
                        <span>Ampliación (se emite en OM)</span>
                    </label>
                </div>
                <div class="button-container">
                    <button type="button" class="secondary-btn" id="nr-modal-cancel">Cancelar</button>
                    <button type="submit" class="primary-btn">${isEditing ? 'Guardar Cambios' : 'Añadir Radioaviso'}</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    // Add event listeners
    modalOverlay.querySelector('#nr-modal-cancel')?.addEventListener('click', () => modalOverlay.remove());
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.remove(); });
    modalOverlay.querySelector('#nr-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleNRSave(isEditing ? nr!.id! : null);
        modalOverlay.remove();
    });
    modalOverlay.querySelectorAll('.station-quick-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const stations = (e.currentTarget as HTMLButtonElement).dataset.stations?.split(',') || [];
            modalOverlay.querySelectorAll<HTMLInputElement>('input[name="station"]').forEach(chk => {
                chk.checked = stations.includes(chk.value);
            });
        });
    });
}

function handleNRSave(editingId: string | null) {
    const num = (document.getElementById('nr-num') as HTMLInputElement).value.trim();
    const year = (document.getElementById('nr-year') as HTMLInputElement).value.trim();
    const baseId = `${num}/${year}`;

    const selectedStations: string[] = [];
    document.querySelectorAll<HTMLInputElement>('input[name="station"]:checked').forEach(chk => {
        selectedStations.push(chk.value);
    });

    const expiryDate = (document.getElementById('nr-expiry-date') as HTMLInputElement).value;
    const expiryTime = (document.getElementById('nr-expiry-time') as HTMLInputElement).value;
    const isAmpliado = (document.getElementById('nr-is-ampliado') as HTMLInputElement).checked;

    if (!num || !year || selectedStations.length === 0 || !expiryDate || !expiryTime) {
        showToast('Todos los campos son obligatorios.', 'error');
        return;
    }

    if (editingId) {
        const index = appData.nrs.findIndex(nr => nr.id === editingId);
        if (index > -1) {
            const oldNr = { ...appData.nrs[index] };
            const newNr = { ...oldNr, stations: selectedStations, expiryDate, expiryTime, isAmpliado };
            appData.nrs[index] = newNr;
            addHistoryLog('EDITADO', newNr, `Estaciones/caducidad actualizada.`);
        }
    } else {
        const existingVersions = appData.nrs.filter(nr => nr.baseId === baseId);
        const newVersion = existingVersions.length + 1;
        const newId = newVersion > 1 ? `NR-${baseId}-${newVersion}` : `NR-${baseId}`;

        const newNr: NR = {
            id: newId, baseId, version: newVersion,
            stations: selectedStations, expiryDate, expiryTime,
            isAmpliado, isCaducado: false
        };
        appData.nrs.push(newNr);
        addHistoryLog('AÑADIDO', newNr, `Nuevo radioaviso creado.`);
    }

    saveData();
    renderAll();
}

// --- MAIN RENDER & INITIALIZATION ---
export function renderRadioavisos(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Gestión y Consulta de Radioavisos</h2>
            <div class="info-nav-tabs">
                <button class="info-nav-btn active" data-target="tab-nr-management">Gestión NRs</button>
                <button class="info-nav-btn" data-target="tab-nr-history">Historial</button>
                <button class="info-nav-btn" data-target="tab-salvamento-avisos">Avisos SASEMAR</button>
            </div>
            <main class="info-content">
                <div id="tab-nr-management" class="sub-tab-panel active">
                    <div class="nr-management-header">
                        <h3>Gestión de Radioavisos (NR)</h3>
                        <button id="add-nr-btn" class="primary-btn">Añadir Nuevo NR</button>
                    </div>
                    <div id="nr-management-content"></div>
                </div>
                <div id="tab-nr-history" class="sub-tab-panel">
                    <h3>Historial de Cambios</h3>
                    <div id="nr-history-content"></div>
                </div>
                <div id="tab-salvamento-avisos" class="sub-tab-panel">
                    <h3>Radioavisos de Salvamento Marítimo (Web)</h3>
                    <div id="salvamento-avisos-content"></div>
                </div>
            </main>
        </div>
    `;
    initializeRadioavisos(container);
}

function initializeRadioavisos(container: HTMLElement) {
    container.querySelector('#add-nr-btn')?.addEventListener('click', () => renderNRModal());
    
    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const btn = target.closest<HTMLButtonElement>('.info-nav-btn');
        if (btn) {
            const targetId = btn.dataset.target;
            if (!targetId) return;
            container.querySelectorAll('.info-nav-btn').forEach(b => b.classList.remove('active'));
            container.querySelectorAll('.sub-tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            container.querySelector(`#${targetId}`)?.classList.add('active');
        }

        const actionBtn = target.closest<HTMLButtonElement>('.nr-entry-actions button');
        if (actionBtn) {
            const entryDiv = actionBtn.closest<HTMLDivElement>('.nr-entry');
            const nrId = entryDiv?.dataset.nrId;
            if (!nrId) return;

            const nr = appData.nrs.find(n => n.id === nrId);
            if (!nr) return;

            const action = actionBtn.dataset.action;
            if (action === 'edit') {
                renderNRModal(nr);
            } else if (action === 'cancel') {
                if (confirm(`¿Seguro que quieres CANCELAR el radioaviso ${nr.baseId}? Esta acción no se puede deshacer.`)) {
                    nr.isCaducado = true;
                    addHistoryLog('CANCELADO', nr, 'Radioaviso cancelado manualmente.');
                    saveData();
                    renderAll();
                }
            } else if (action === 'delete') {
                 if (confirm(`¿Seguro que quieres BORRAR el radioaviso ${nr.id}? Esta acción no se puede deshacer.`)) {
                    appData.nrs = appData.nrs.filter(n => n.id !== nrId);
                    addHistoryLog('BORRADO', nr, `Radioaviso ${nr.id} borrado del sistema.`);
                    saveData();
                    renderAll();
                }
            }
        }
    });

    fetchData();
}
