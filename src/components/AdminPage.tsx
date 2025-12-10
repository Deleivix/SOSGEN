
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

type PendingUser = {
    id: number;
    username: string;
    email: string;
};

type AuditLog = {
    id: number;
    action: string;
    details: string;
    timestamp: string;
    username: string;
};

let pendingUsers: PendingUser[] = [];
let auditLogs: AuditLog[] = [];
let isLoading = false;
let currentTab: 'requests' | 'audit' = 'requests';

async function fetchRequests() {
    const adminUser = getCurrentUser();
    if (!adminUser) return;

    isLoading = true;
    renderAdminContent();

    try {
        // Updated Endpoint: /api/admin
        const response = await fetch(`/api/admin?adminUsername=${adminUser.username}`);
        if (!response.ok) throw new Error('Failed to fetch requests');
        pendingUsers = await response.json();
    } catch (error) {
        showToast("Error al cargar solicitudes", "error");
        pendingUsers = [];
    } finally {
        isLoading = false;
        renderAdminContent();
    }
}

async function fetchAuditLogs() {
    const adminUser = getCurrentUser();
    if (!adminUser) return;

    isLoading = true;
    renderAdminContent();

    try {
        // Updated Endpoint: /api/admin?type=audit (was /api/audit)
        const response = await fetch(`/api/admin?type=audit&adminUsername=${adminUser.username}`);
        if (!response.ok) throw new Error('Failed to fetch audit logs');
        auditLogs = await response.json();
    } catch (error) {
        showToast("Error al cargar auditoría", "error");
        auditLogs = [];
    } finally {
        isLoading = false;
        renderAdminContent();
    }
}

async function handleRequestAction(userId: number, action: 'approve' | 'reject') {
    const adminUser = getCurrentUser();
    if (!adminUser) return;

    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminUsername: adminUser.username,
                action,
                targetUserId: userId
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Operación fallida');
        
        showToast(result.message, 'success');
        await fetchRequests();

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        showToast(`Error: ${message}`, "error");
    }
}

function renderAdminContent() {
    const container = document.getElementById('admin-page-content');
    if (!container) return;

    const tabsHtml = `
        <div class="info-nav-tabs" style="margin-bottom: 2rem;">
            <button class="info-nav-btn ${currentTab === 'requests' ? 'active' : ''}" data-tab="requests">Solicitudes de Registro</button>
            <button class="info-nav-btn ${currentTab === 'audit' ? 'active' : ''}" data-tab="audit">Historial de Accesos</button>
        </div>
    `;

    if (isLoading) {
        container.innerHTML = `${tabsHtml}<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }

    let contentHtml = '';

    if (currentTab === 'requests') {
        if (pendingUsers.length === 0) {
            contentHtml = '<p class="drill-placeholder">No hay solicitudes de registro pendientes.</p>';
        } else {
            contentHtml = `
                <div class="table-wrapper">
                    <table class="reference-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Usuario</th>
                                <th>Email</th>
                                <th style="text-align: right;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pendingUsers.map(user => `
                                <tr data-user-id="${user.id}">
                                    <td>${user.id}</td>
                                    <td>${user.username}</td>
                                    <td>${user.email}</td>
                                    <td>
                                        <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                                            <button class="primary-btn-small" data-action="approve">Aprobar</button>
                                            <button class="tertiary-btn" data-action="reject">Rechazar</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } else {
        if (auditLogs.length === 0) {
            contentHtml = '<p class="drill-placeholder">No hay registros de auditoría recientes.</p>';
        } else {
            contentHtml = `
                <div class="table-wrapper">
                    <table class="reference-table">
                        <thead>
                            <tr>
                                <th>Fecha/Hora</th>
                                <th>Usuario</th>
                                <th>Acción</th>
                                <th>Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${auditLogs.map(log => `
                                <tr>
                                    <td style="white-space:nowrap;">${new Date(log.timestamp).toLocaleString('es-ES')}</td>
                                    <td>${log.username}</td>
                                    <td><span class="category-badge" style="background-color: ${log.action === 'LOGIN' ? 'var(--success-color)' : 'var(--text-secondary)'}">${log.action}</span></td>
                                    <td style="font-size: 0.9em; color: var(--text-secondary);">${log.details}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    container.innerHTML = `
        <h2 class="content-card-title">Panel de Administración</h2>
        ${tabsHtml}
        ${contentHtml}
    `;
}

export function renderAdminPage(container: HTMLElement) {
    container.innerHTML = `<div class="content-card" id="admin-page-content"></div>`;
    fetchRequests();

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        
        const tabBtn = target.closest('button[data-tab]');
        if (tabBtn) {
            currentTab = tabBtn.getAttribute('data-tab') as 'requests' | 'audit';
            if (currentTab === 'requests') fetchRequests();
            else fetchAuditLogs();
        }

        const actionBtn = target.closest('button[data-action]');
        if (actionBtn) {
            const action = actionBtn.getAttribute('data-action') as 'approve' | 'reject';
            const row = actionBtn.closest('tr');
            const userId = row?.dataset.userId;
            
            if (action && userId) {
                 if (action === 'reject' && !window.confirm(`¿Seguro que quiere rechazar al usuario?`)) return;
                handleRequestAction(parseInt(userId, 10), action);
            }
        }
    });
}
