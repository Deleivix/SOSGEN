
import { getCurrentUser } from "../utils/auth";
import { showToast, initializeInfoTabs } from "../utils/helpers";

let pendingUsers: any[] = [];
let accessLogs: any[] = [];
let activityLogs: any[] = [];
let isLoading = false;

async function fetchData(type: string) {
    const adminUser = getCurrentUser();
    if (!adminUser) return;

    isLoading = true;
    renderAdminContent();

    try {
        const response = await fetch(`/api/admin?adminUsername=${adminUser.username}&type=${type}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        
        if (type === 'users') pendingUsers = data;
        if (type === 'access_logs') accessLogs = data;
        if (type === 'activity_logs') activityLogs = data;

    } catch (error) {
        showToast("Error al cargar datos", "error");
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
        if (!response.ok) throw new Error(result.error);
        
        showToast(result.message, 'success');
        await fetchData('users'); 

    } catch (error) {
        showToast("Error en la operación", "error");
    }
}

function renderAdminContent() {
    const container = document.getElementById('admin-page-content');
    if (!container) return;

    // We only update the active panel content to avoid redrawing tabs constantly if not needed
    const activeTab = container.querySelector('.info-nav-btn.active')?.getAttribute('data-target');
    
    // Render Tabs if container is empty or just started
    if (!container.querySelector('.info-nav-tabs')) {
        container.innerHTML = `
            <div class="info-nav-tabs">
                <button class="info-nav-btn active" data-target="tab-users">Usuarios Pendientes</button>
                <button class="info-nav-btn" data-target="tab-access">Historial Accesos</button>
                <button class="info-nav-btn" data-target="tab-activity">Historial Actividad</button>
            </div>
            <div id="tab-users" class="sub-tab-panel active"></div>
            <div id="tab-access" class="sub-tab-panel"></div>
            <div id="tab-activity" class="sub-tab-panel"></div>
        `;
        initializeInfoTabs(container);
        
        // Add click listeners for data fetching on tab switch
        container.querySelector('[data-target="tab-users"]')?.addEventListener('click', () => fetchData('users'));
        container.querySelector('[data-target="tab-access"]')?.addEventListener('click', () => fetchData('access_logs'));
        container.querySelector('[data-target="tab-activity"]')?.addEventListener('click', () => fetchData('activity_logs'));
        
        // Initial fetch
        fetchData('users');
        return; 
    }

    if (isLoading) {
        const loader = `<div class="loader-container"><div class="loader"></div></div>`;
        if (activeTab) {
            const panel = container.querySelector(`#${activeTab}`);
            if(panel) panel.innerHTML = loader;
        }
        return;
    }

    // Render Users
    const usersPanel = container.querySelector('#tab-users');
    if (usersPanel) {
        usersPanel.innerHTML = pendingUsers.length === 0 ? '<p class="drill-placeholder">No hay solicitudes.</p>' : `
            <div class="table-wrapper">
                <table class="reference-table">
                    <thead><tr><th>Usuario</th><th>Email</th><th>Acciones</th></tr></thead>
                    <tbody>${pendingUsers.map(u => `
                        <tr data-user-id="${u.id}">
                            <td>${u.username}</td><td>${u.email}</td>
                            <td><button class="primary-btn-small" data-action="approve">Aprobar</button> <button class="tertiary-btn" data-action="reject">Rechazar</button></td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>`;
    }

    // Render Access Logs
    const accessPanel = container.querySelector('#tab-access');
    if (accessPanel) {
        accessPanel.innerHTML = `
            <div class="table-wrapper">
                <table class="reference-table">
                    <thead><tr><th>Fecha</th><th>Usuario</th><th>IP</th></tr></thead>
                    <tbody>${accessLogs.map(l => `
                        <tr>
                            <td>${new Date(l.timestamp).toLocaleString()}</td>
                            <td>${l.username}</td>
                            <td>${l.ip}</td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>`;
    }

    // Render Activity Logs
    const activityPanel = container.querySelector('#tab-activity');
    if (activityPanel) {
        activityPanel.innerHTML = `
            <div class="table-wrapper">
                <table class="reference-table">
                    <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalles</th></tr></thead>
                    <tbody>${activityLogs.map(l => `
                        <tr>
                            <td>${new Date(l.timestamp).toLocaleString()}</td>
                            <td>${l.username}</td>
                            <td>${l.action_type}</td>
                            <td>${l.details}</td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>`;
    }
}

export function renderAdminPage(container: HTMLElement) {
    container.innerHTML = `<div class="content-card" id="admin-page-content"></div>`;
    renderAdminContent();

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const button = target.closest('button[data-action]');
        if (button) {
            const action = button.getAttribute('data-action') as 'approve' | 'reject';
            const row = button.closest('tr');
            const userId = row?.dataset.userId;
            if (action && userId) {
                 if (action === 'reject' && !window.confirm(`¿Rechazar usuario?`)) return;
                handleRequestAction(parseInt(userId, 10), action);
            }
        }
    });
}
