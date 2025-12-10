
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

type UserStats = {
    id: number;
    username: string;
    email: string;
    last_activity: string;
    personal_stats: any;
    assigned_history: {
        status: string;
        score: number;
        max_score: number;
        created_at: string;
    }[];
};

let usersData: UserStats[] = [];
let isLoading = false;

async function fetchSupervisorData() {
    const user = getCurrentUser();
    if (!user) return;
    
    isLoading = true;
    renderSupervisorContent();

    try {
        const res = await fetch('/api/supervisor', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'get_users_stats', supervisorUsername: user.username })
        });
        if (!res.ok) throw new Error("Failed to load data");
        usersData = await res.json();
    } catch (e) {
        showToast("Error al cargar datos de supervisor", "error");
    } finally {
        isLoading = false;
        renderSupervisorContent();
    }
}

async function handleAssignDrill(targetUserIds: number[], drillType: string) {
    const user = getCurrentUser();
    if (!user) return;

    showToast("Generando simulacro con IA...", "info");

    try {
        // 1. Generate Drill Content
        const drillRes = await fetch('/api/simulacro', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ type: drillType })
        });
        if (!drillRes.ok) throw new Error("Error generando contenido");
        const drillData = await drillRes.json();

        // 2. Assign to Users
        const assignRes = await fetch('/api/supervisor', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'assign_drill',
                supervisorUsername: user.username,
                targetUserIds,
                drillType,
                drillData
            })
        });

        if (assignRes.ok) {
            showToast("Simulacros asignados correctamente", "success");
            fetchSupervisorData();
        } else {
            throw new Error("Error al asignar");
        }

    } catch (e) {
        showToast("Error en el proceso de asignación", "error");
    }
}

function exportData() {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Usuario,Email,Ultima Actividad,Simulacros Personales,Simulacros Asignados Completados,Nota Media Asignados\n"
        + usersData.map(u => {
            const assignedCompleted = u.assigned_history?.filter(h => h.status === 'COMPLETED') || [];
            const avgScore = assignedCompleted.length > 0 
                ? (assignedCompleted.reduce((acc, curr) => acc + (curr.score/curr.max_score), 0) / assignedCompleted.length * 100).toFixed(1)
                : 0;
            return `${u.username},${u.email},${u.last_activity || '-'},${u.personal_stats?.totalDrills || 0},${assignedCompleted.length},${avgScore}%`;
        }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kpi_simulacros_sosgen.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderSupervisorContent() {
    const container = document.getElementById('supervisor-content');
    if (!container) return;

    if (isLoading) {
        container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }

    // KPIs
    const totalUsers = usersData.length;
    const activeUsers = usersData.filter(u => u.last_activity).length;
    const totalAssignedPending = usersData.reduce((acc, u) => acc + (u.assigned_history?.filter(h => h.status === 'PENDING').length || 0), 0);
    const totalAssignedCompleted = usersData.reduce((acc, u) => acc + (u.assigned_history?.filter(h => h.status === 'COMPLETED').length || 0), 0);

    const kpiHtml = `
        <div class="supervisor-stats-grid">
            <div class="supervisor-stat-card">
                <div class="supervisor-stat-value">${totalUsers}</div>
                <div class="supervisor-stat-label">Usuarios Totales</div>
            </div>
            <div class="supervisor-stat-card">
                <div class="supervisor-stat-value">${activeUsers}</div>
                <div class="supervisor-stat-label">Usuarios Activos</div>
            </div>
            <div class="supervisor-stat-card">
                <div class="supervisor-stat-value" style="color: var(--warning-color);">${totalAssignedPending}</div>
                <div class="supervisor-stat-label">Simulacros Pendientes</div>
            </div>
            <div class="supervisor-stat-card">
                <div class="supervisor-stat-value" style="color: var(--success-color);">${totalAssignedCompleted}</div>
                <div class="supervisor-stat-label">Simulacros Completados</div>
            </div>
        </div>
    `;

    // Assignment Panel
    const assignmentHtml = `
        <div class="content-card" style="margin-bottom: 2rem; border-left: 4px solid var(--accent-color);">
            <h3 class="content-card-title">Asignar Nuevo Simulacro</h3>
            <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
                <div style="flex-grow: 1;">
                    <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">Tipo de Simulacro</label>
                    <select id="drill-type-select" class="modern-input">
                        <option value="dsc">DSC (Llamada Selectiva Digital)</option>
                        <option value="radiotelephony">Radiotelefonía (Voz)</option>
                    </select>
                </div>
                <button id="assign-btn" class="primary-btn" style="margin-top: 0;">Generar y Enviar a Seleccionados</button>
            </div>
        </div>
    `;

    // User Table
    const tableHtml = `
        <div class="content-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 class="content-card-title" style="margin: 0;">Rendimiento por Usuario</h3>
                <button id="export-btn" class="secondary-btn">Descargar Excel (CSV)</button>
            </div>
            <div class="table-wrapper">
                <table class="reference-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" id="select-all-users"></th>
                            <th>Usuario</th>
                            <th>Última Actividad</th>
                            <th style="text-align: center;">Personales (Total)</th>
                            <th style="text-align: center;">Auditados (Pend/Comp)</th>
                            <th style="text-align: center;">Nota Media (Auditados)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usersData.map(u => {
                            const pending = u.assigned_history?.filter(h => h.status === 'PENDING').length || 0;
                            const completed = u.assigned_history?.filter(h => h.status === 'COMPLETED') || [];
                            const avg = completed.length > 0 
                                ? (completed.reduce((acc, curr) => acc + (curr.score/curr.max_score), 0) / completed.length * 100).toFixed(0)
                                : '-';
                            
                            return `
                                <tr class="user-table-row" data-user-id="${u.id}">
                                    <td style="text-align: center;"><input type="checkbox" class="user-select-cb" value="${u.id}"></td>
                                    <td>
                                        <div style="font-weight: 500;">${u.username}</div>
                                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${u.email}</div>
                                    </td>
                                    <td>${u.last_activity ? new Date(u.last_activity).toLocaleString() : '-'}</td>
                                    <td style="text-align: center;">${u.personal_stats?.totalDrills || 0}</td>
                                    <td style="text-align: center;">
                                        <span style="color: var(--warning-color); font-weight: bold;">${pending}</span> / 
                                        <span style="color: var(--success-color); font-weight: bold;">${completed.length}</span>
                                    </td>
                                    <td style="text-align: center;">${avg !== '-' ? avg + '%' : '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = kpiHtml + assignmentHtml + tableHtml;

    // Event Listeners
    document.getElementById('export-btn')?.addEventListener('click', exportData);
    
    document.getElementById('select-all-users')?.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        document.querySelectorAll<HTMLInputElement>('.user-select-cb').forEach(cb => cb.checked = checked);
    });

    document.getElementById('assign-btn')?.addEventListener('click', () => {
        const selectedIds = Array.from(document.querySelectorAll<HTMLInputElement>('.user-select-cb:checked'))
            .map(cb => parseInt(cb.value));
        const type = (document.getElementById('drill-type-select') as HTMLSelectElement).value;

        if (selectedIds.length === 0) {
            showToast("Seleccione al menos un usuario.", "error");
            return;
        }
        handleAssignDrill(selectedIds, type);
    });
}

export function renderSupervisorPage(container: HTMLElement) {
    container.innerHTML = `<div id="supervisor-content"></div>`;
    fetchSupervisorData();
}
