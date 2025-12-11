
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

type PendingUser = { id: number; username: string; email: string; };
type AuditLog = { id: number; action: string; details: string; timestamp: string; username: string; };
type ActivityLog = { id: string; timestamp: string; user: string; action: string; nrId: string; details: string; };

let pendingUsers: PendingUser[] = [];
let auditLogs: AuditLog[] = [];
let activityLogs: ActivityLog[] = [];
let isEcoMode = false;
let isLoading = false;
let currentTab: 'requests' | 'audit' | 'activity' | 'resources' = 'requests';

async function fetchEcoStatus() {
    const adminUser = getCurrentUser();
    if (!adminUser) return;
    try {
        const response = await fetch(`/api/admin?type=eco_status&adminUsername=${adminUser.username}`);
        if(response.ok) {
            const data = await response.json();
            isEcoMode = data.isEco;
            renderAdminContent();
        }
    } catch(e) { console.error("Failed to fetch ECO status"); }
}

async function toggleEcoMode(active: boolean) {
    const adminUser = getCurrentUser();
    if (!adminUser) return;
    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminUsername: adminUser.username, action: 'set_eco', ecoValue: active })
        });
        if(response.ok) {
            isEcoMode = active;
            showToast(`Modo Bajo Consumo ${active ? 'ACTIVADO' : 'DESACTIVADO'}`, "info");
            renderAdminContent();
        }
    } catch(e) { showToast("Error al cambiar modo", "error"); }
}

async function fetchRequests() {
    // ... existing fetchRequests ...
    const adminUser = getCurrentUser();
    if (!adminUser) return;
    isLoading = true; renderAdminContent();
    try {
        const response = await fetch(`/api/admin?adminUsername=${adminUser.username}`);
        if (!response.ok) throw new Error('Failed');
        pendingUsers = await response.json();
    } catch (e) { pendingUsers = []; } finally { isLoading = false; renderAdminContent(); }
}

async function fetchAuditLogs() {
    // ... existing fetchAuditLogs ...
    const adminUser = getCurrentUser();
    if (!adminUser) return;
    isLoading = true; renderAdminContent();
    try {
        const response = await fetch(`/api/admin?type=audit&adminUsername=${adminUser.username}`);
        if (!response.ok) throw new Error('Failed');
        auditLogs = await response.json();
    } catch (e) { auditLogs = []; } finally { isLoading = false; renderAdminContent(); }
}

async function fetchActivityLogs() {
    // ... existing fetchActivityLogs ...
    const adminUser = getCurrentUser();
    if (!adminUser) return;
    isLoading = true; renderAdminContent();
    try {
        const response = await fetch(`/api/admin?type=activity&adminUsername=${adminUser.username}`);
        if (!response.ok) throw new Error('Failed');
        activityLogs = await response.json();
    } catch (e) { activityLogs = []; } finally { isLoading = false; renderAdminContent(); }
}

async function handleRequestAction(userId: number, action: 'approve' | 'reject') {
    // ... existing handleRequestAction ...
    const adminUser = getCurrentUser();
    if (!adminUser) return;
    try {
        const response = await fetch('/api/admin', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminUsername: adminUser.username, action, targetUserId: userId })
        });
        if (!response.ok) throw new Error('Failed');
        showToast("Operación exitosa", "success");
        await fetchRequests();
    } catch (e) { showToast("Error", "error"); }
}

function renderAdminContent() {
    const container = document.getElementById('admin-page-content');
    if (!container) return;

    const tabsHtml = `
        <div class="info-nav-tabs" style="margin-bottom: 2rem;">
            <button class="info-nav-btn ${currentTab === 'requests' ? 'active' : ''}" data-tab="requests">Solicitudes</button>
            <button class="info-nav-btn ${currentTab === 'activity' ? 'active' : ''}" data-tab="activity">Actividad</button>
            <button class="info-nav-btn ${currentTab === 'audit' ? 'active' : ''}" data-tab="audit">Auditoría</button>
            <button class="info-nav-btn ${currentTab === 'resources' ? 'active' : ''}" data-tab="resources" style="color:var(--accent-color-dark);">Gestión Recursos</button>
        </div>
    `;

    if (isLoading) {
        container.innerHTML = `${tabsHtml}<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }

    let contentHtml = '';

    if (currentTab === 'resources') {
        contentHtml = `
            <div style="background:var(--bg-card); padding:2rem; border:1px solid var(--border-color); border-radius:12px; max-width:600px; margin:0 auto;">
                <div style="text-align:center; margin-bottom:2rem;">
                    <h3 style="margin-bottom:0.5rem; color:var(--text-primary);">Control de Consumo IA</h3>
                    <p style="color:var(--text-secondary); font-size:0.9rem;">
                        El Modo Bajo Consumo (ECO) desactiva la generación por IA y utiliza algoritmos deterministas y caché.
                        <br>Se activa automáticamente tras 10 errores de cuota en 5 minutos.
                    </p>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid ${isEcoMode ? 'var(--warning-color)' : 'var(--border-color)'}; background:${isEcoMode ? 'var(--warning-color-bg)' : 'var(--bg-main)'}; border-radius:8px;">
                    <div>
                        <div style="font-weight:bold; font-size:1.1rem; color:var(--text-primary);">Estado Actual: ${isEcoMode ? '<span style="color:var(--warning-color);">ECO ACTIVO</span>' : '<span style="color:var(--success-color);">NORMAL</span>'}</div>
                        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.25rem;">
                            ${isEcoMode ? 'Funcionalidades limitadas. Sin coste de tokens.' : 'Funcionalidad completa con IA.'}
                        </div>
                    </div>
                    <label class="theme-switcher-toggle" style="width:60px; height:34px; border-radius:34px; position:relative; cursor:pointer; background-color:${isEcoMode ? 'var(--warning-color)' : 'var(--text-secondary)'};">
                        <input type="checkbox" id="eco-mode-toggle" ${isEcoMode ? 'checked' : ''} style="display:none;">
                        <span style="position:absolute; top:4px; left:${isEcoMode ? '30px' : '4px'}; width:26px; height:26px; border-radius:50%; background:white; transition:all 0.3s ease;"></span>
                    </label>
                </div>
            </div>
        `;
    } else if (currentTab === 'requests') {
        if (pendingUsers.length === 0) contentHtml = '<p class="drill-placeholder">No hay solicitudes.</p>';
        else contentHtml = `
            <div class="table-wrapper"><table class="reference-table"><thead><tr><th>ID</th><th>Usuario</th><th>Email</th><th>Acciones</th></tr></thead><tbody>
            ${pendingUsers.map(u => `<tr data-user-id="${u.id}"><td>${u.id}</td><td>${u.username}</td><td>${u.email}</td><td><div style="display:flex; gap:0.5rem;"><button class="primary-btn-small" data-action="approve">Apr</button><button class="tertiary-btn" data-action="reject">Rech</button></div></td></tr>`).join('')}
            </tbody></table></div>`;
    } else if (currentTab === 'activity') {
        // ... Render Activity ...
        if (activityLogs.length === 0) contentHtml = '<p class="drill-placeholder">Sin actividad.</p>';
        else contentHtml = `<div class="table-wrapper"><table class="reference-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>NR</th></tr></thead><tbody>${activityLogs.map(l => `<tr><td>${new Date(l.timestamp).toLocaleString()}</td><td>${l.user}</td><td>${l.action}</td><td>${l.nrId}</td></tr>`).join('')}</tbody></table></div>`;
    } else {
        // ... Render Audit ...
        if (auditLogs.length === 0) contentHtml = '<p class="drill-placeholder">Sin auditoría.</p>';
        else contentHtml = `<div class="table-wrapper"><table class="reference-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalles</th></tr></thead><tbody>${auditLogs.map(l => `<tr><td>${new Date(l.timestamp).toLocaleString()}</td><td>${l.username}</td><td>${l.action}</td><td>${l.details}</td></tr>`).join('')}</tbody></table></div>`;
    }

    container.innerHTML = `<h2 class="content-card-title">Panel de Administración</h2>${tabsHtml}${contentHtml}`;
    
    // Bind toggle
    if (currentTab === 'resources') {
        const toggle = document.getElementById('eco-mode-toggle');
        toggle?.addEventListener('change', (e) => toggleEcoMode((e.target as HTMLInputElement).checked));
    }
}

export function renderAdminPage(container: HTMLElement) {
    container.innerHTML = `<div class="content-card" id="admin-page-content"></div>`;
    fetchRequests();
    // Fetch Eco status immediately if entering admin page
    fetchEcoStatus();

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const tabBtn = target.closest('button[data-tab]');
        if (tabBtn) {
            currentTab = tabBtn.getAttribute('data-tab') as any;
            if (currentTab === 'requests') fetchRequests();
            else if (currentTab === 'activity') fetchActivityLogs();
            else if (currentTab === 'audit') fetchAuditLogs();
            else if (currentTab === 'resources') fetchEcoStatus();
        }
        // ... action buttons logic ...
        const actionBtn = target.closest('button[data-action]');
        if (actionBtn && !actionBtn.closest('.info-nav-tabs')) {
             const action = actionBtn.getAttribute('data-action') as 'approve' | 'reject';
             const row = actionBtn.closest('tr');
             if(row) handleRequestAction(parseInt(row.dataset.userId!, 10), action);
        }
    });
}
