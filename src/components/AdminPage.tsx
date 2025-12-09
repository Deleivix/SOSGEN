import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

type PendingUser = {
    id: number;
    username: string;
    email: string;
};

let pendingUsers: PendingUser[] = [];
let isLoading = false;

async function fetchRequests() {
    const adminUser = getCurrentUser();
    if (!adminUser) return;

    isLoading = true;
    renderAdminContent();

    try {
        const response = await fetch(`/api/admin?adminUsername=${adminUser.username}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch requests');
        }
        pendingUsers = await response.json();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        showToast(`Error al cargar solicitudes: ${message}`, "error");
        pendingUsers = [];
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
        if (!response.ok) {
            throw new Error(result.error || 'La operación falló');
        }
        
        showToast(result.message, 'success');
        await fetchRequests(); // Refresh the list

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        showToast(`Error: ${message}`, "error");
    }
}

function renderAdminContent() {
    const container = document.getElementById('admin-page-content');
    if (!container) return;

    if (isLoading) {
        container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }

    let listHtml = '';
    if (pendingUsers.length === 0) {
        listHtml = '<p class="drill-placeholder">No hay solicitudes de registro pendientes.</p>';
    } else {
        listHtml = `
            <div class="table-wrapper">
                <table class="reference-table">
                    <thead>
                        <tr>
                            <th>ID de Usuario</th>
                            <th>Nombre de Usuario</th>
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

    container.innerHTML = `
        <h2 class="content-card-title">Gestionar Solicitudes de Registro</h2>
        ${listHtml}
    `;
}

export function renderAdminPage(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card" id="admin-page-content">
            <!-- Content will be rendered by JS -->
        </div>
    `;
    fetchRequests();

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const button = target.closest('button[data-action]');
        if (button) {
            const action = button.getAttribute('data-action') as 'approve' | 'reject';
            const row = button.closest('tr');
            const userId = row?.dataset.userId;
            
            if (action && userId) {
                 if (action === 'reject' && !window.confirm(`¿Seguro que quiere rechazar y eliminar al usuario ${row.cells[1].textContent}?`)) {
                    return;
                }
                handleRequestAction(parseInt(userId, 10), action);
            }
        }
    });
}