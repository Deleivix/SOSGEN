
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

// --- TYPES ---
type UserStat = {
    id: number;
    username: string;
    email: string;
    last_activity: string | null;
    personal_stats: {
        totalDrills: number;
        totalCorrect: number;
        totalQuestions: number;
    };
    assigned_history: {
        status: string;
        score: number;
        max_score: number;
        created_at: string;
        completed_at: string | null;
        drill_type: string;
    }[] | null;
};

// --- STATE ---
let currentTab: 'dashboard' | 'assign' = 'dashboard';
let usersStats: UserStat[] = [];
let dashboardFilter = '';
let dashboardSort = { key: 'username', dir: 'asc' };
let timeRange: '1M' | '1Y' | 'ALL' = '1M';
let selectedUserIds: number[] = [];
let generatedDrillData: any = null;

// --- API ---
async function fetchUsersStats() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const res = await fetch('/api/supervisor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_users_stats', supervisorUsername: user.username })
        });
        if (res.ok) {
            usersStats = await res.json();
            renderContent();
        }
    } catch (e) { 
        console.error(e); 
        showToast("Error al cargar estadísticas", "error");
    }
}

async function generateDrillPreview(type: string) {
    const previewContainer = document.getElementById('drill-preview-area');
    if (previewContainer) {
        previewContainer.innerHTML = `<div class="loader-container"><div class="loader"></div><p style="margin-top:1rem;">Generando con IA...</p></div>`;
    }

    try {
        const res = await fetch('/api/simulacro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
        });
        
        if (res.ok) {
            generatedDrillData = await res.json();
            if (!generatedDrillData.type) generatedDrillData.type = type;
            renderDrillPreview();
        } else {
            showToast("Error al generar simulacro", "error");
            if (previewContainer) previewContainer.innerHTML = '<p class="error">Error en la generación.</p>';
        }
    } catch (e) {
        showToast("Error de conexión", "error");
    }
}

async function assignDrill() {
    const user = getCurrentUser();
    if (!user) return;

    if (selectedUserIds.length === 0) {
        showToast("Seleccione al menos un usuario.", "error");
        return;
    }
    if (!generatedDrillData) {
        showToast("No hay simulacro para asignar.", "error");
        return;
    }

    const btn = document.getElementById('confirm-assign-btn') as HTMLButtonElement;
    if(btn) btn.disabled = true;

    try {
        const res = await fetch('/api/supervisor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'assign_drill',
                supervisorUsername: user.username,
                targetUserIds: selectedUserIds,
                drillType: generatedDrillData.type,
                drillData: generatedDrillData
            })
        });

        if (res.ok) {
            showToast("Simulacros asignados con éxito.", "success");
            selectedUserIds = [];
            generatedDrillData = null;
            renderContent();
        } else {
            showToast("Error al asignar.", "error");
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
    } finally {
        if(btn) btn.disabled = false;
    }
}

function createManualDrill() {
    // Placeholder for manual creation UI
    // For now, let's just generate a simple template
    generatedDrillData = {
        type: 'manual',
        scenario: "Ejercicio Manual: Redactar mensaje de socorro...",
        questions: [
            {
                questionText: "¿Acción correcta?",
                options: ["Opción A", "Opción B"],
                correctAnswerIndex: 0,
                feedback: "Retroalimentación manual."
            }
        ]
    };
    renderDrillPreview();
    showToast("Plantilla manual cargada. (Funcionalidad completa pendiente)", "info");
}

function exportToCSV() {
    if (usersStats.length === 0) return;
    
    const headers = ["ID", "Usuario", "Email", "Última Actividad", "Simulacros Personales", "Simulacros Asignados", "Avg Score Asignado"];
    const rows = usersStats.map(u => {
        const assignedCompleted = u.assigned_history?.filter(h => h.status === 'COMPLETED') || [];
        const avgScore = assignedCompleted.length > 0 
            ? (assignedCompleted.reduce((acc, curr) => acc + (curr.score/curr.max_score), 0) / assignedCompleted.length * 100).toFixed(1) + '%' 
            : 'N/A';
            
        return [
            u.id,
            u.username,
            u.email,
            u.last_activity ? new Date(u.last_activity).toLocaleString() : 'Nunca',
            u.personal_stats.totalDrills,
            assignedCompleted.length,
            avgScore
        ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_usuarios_sosgen.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- RENDER HELPERS ---

function renderDrillPreview() {
    const container = document.getElementById('drill-preview-area');
    if (!container || !generatedDrillData) return;

    container.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <h4>${generatedDrillData.type === 'dsc' ? 'Alerta DSC' : 'Radiotelefonía / Manual'}</h4>
            <p style="white-space: pre-wrap; font-size: 0.9rem; margin-bottom: 1rem;">${generatedDrillData.scenario}</p>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                ${generatedDrillData.questions.length} preguntas generadas.
            </div>
        </div>
        <div style="text-align: right;">
            <button id="confirm-assign-btn" class="primary-btn" style="width: auto;">Confirmar Asignación (${selectedUserIds.length} usuarios)</button>
        </div>
    `;
}

function renderAssignView() {
    const container = document.getElementById('supervisor-content');
    if (!container) return;

    // Filter users list
    let filteredUsers = usersStats;
    if (dashboardFilter) {
        const f = dashboardFilter.toLowerCase();
        filteredUsers = usersStats.filter(u => u.username.toLowerCase().includes(f) || u.email.toLowerCase().includes(f));
    }

    const usersListHtml = filteredUsers.map(u => `
        <label class="user-select-item" style="display: flex; align-items: center; padding: 0.5rem; border-bottom: 1px solid var(--border-color); cursor: pointer;">
            <input type="checkbox" class="user-select-cb" value="${u.id}" ${selectedUserIds.includes(u.id) ? 'checked' : ''} style="margin-right: 10px;">
            <div style="flex-grow: 1;">
                <div style="font-weight: 500;">${u.username}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${u.email}</div>
            </div>
        </label>
    `).join('');

    container.innerHTML = `
        <div class="assign-layout" style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem;">
            <div class="assign-sidebar">
                <h3 class="reference-table-subtitle">1. Seleccionar Usuarios</h3>
                <input type="text" id="dashboard-search" class="filter-input" placeholder="Filtrar usuarios..." value="${dashboardFilter}">
                <div class="users-list-scroll" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 4px;">
                    ${usersListHtml}
                </div>
                <button id="select-all-users-btn" class="secondary-btn" style="margin-top: 0.5rem; width: 100%;">
                    ${selectedUserIds.length === usersStats.length && usersStats.length > 0 ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </button>
            </div>
            
            <div class="assign-main">
                <h3 class="reference-table-subtitle">2. Configurar Simulacro</h3>
                <div class="drill-generation-controls" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                    <button class="gen-drill-btn primary-btn-small" data-type="dsc">Generar DSC (IA)</button>
                    <button class="gen-drill-btn primary-btn-small" data-type="radiotelephony">Generar Voz (IA)</button>
                    <button id="create-manual-btn" class="secondary-btn">Manual</button>
                </div>
                
                <h3 class="reference-table-subtitle">3. Vista Previa y Confirmación</h3>
                <div id="drill-preview-area" style="min-height: 200px; border: 2px dashed var(--border-color); border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    ${generatedDrillData ? '' : '<p class="drill-placeholder">Genere o cree un simulacro para ver la vista previa.</p>'}
                </div>
            </div>
        </div>
    `;
    
    // Re-render preview if data exists
    if (generatedDrillData) renderDrillPreview();
    
    // Attach Select All logic specific to this view
    const selectAllBtn = document.getElementById('select-all-users-btn');
    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            if (selectedUserIds.length === usersStats.length) {
                selectedUserIds = [];
            } else {
                selectedUserIds = usersStats.map(u => u.id);
            }
            renderContent();
        };
    }
}

function renderDashboardView() {
    const container = document.getElementById('supervisor-content');
    if (!container) return;

    // Filter & Sort
    let displayUsers = [...usersStats];
    if (dashboardFilter) {
        const f = dashboardFilter.toLowerCase();
        displayUsers = displayUsers.filter(u => u.username.toLowerCase().includes(f) || u.email.toLowerCase().includes(f));
    }
    
    displayUsers.sort((a, b) => {
        let valA: any = a[dashboardSort.key as keyof UserStat];
        let valB: any = b[dashboardSort.key as keyof UserStat];
        
        if (dashboardSort.key === 'personal_stats') {
            valA = a.personal_stats.totalDrills;
            valB = b.personal_stats.totalDrills;
        }
        
        if (valA < valB) return dashboardSort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return dashboardSort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    const getSortIndicator = (key: string) => {
        if (dashboardSort.key !== key) return '';
        return dashboardSort.dir === 'asc' ? ' ▲' : ' ▼';
    };

    container.innerHTML = `
        <div class="dashboard-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <input type="text" id="dashboard-search" class="filter-input" placeholder="Buscar usuario..." value="${dashboardFilter}" style="width: 300px; margin-bottom: 0;">
            <button id="export-csv-btn" class="secondary-btn">Exportar CSV</button>
        </div>
        <div class="table-wrapper">
            <table class="reference-table">
                <thead>
                    <tr>
                        <th data-sort="id" style="cursor: pointer;">ID${getSortIndicator('id')}</th>
                        <th data-sort="username" style="cursor: pointer;">Usuario${getSortIndicator('username')}</th>
                        <th data-sort="last_activity" style="cursor: pointer;">Último Acceso${getSortIndicator('last_activity')}</th>
                        <th data-sort="personal_stats" style="cursor: pointer; text-align: center;">Simulacros IA${getSortIndicator('personal_stats')}</th>
                        <th style="text-align: center;">Asignados (Comp/Total)</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayUsers.map(u => {
                        const assignedTotal = u.assigned_history?.length || 0;
                        const assignedCompleted = u.assigned_history?.filter(h => h.status === 'COMPLETED').length || 0;
                        const lastActive = u.last_activity ? new Date(u.last_activity).toLocaleDateString() : '-';
                        return `
                            <tr class="user-row-interactive" data-user-id="${u.id}" style="cursor: pointer;">
                                <td>${u.id}</td>
                                <td style="font-weight: 500;">${u.username}</td>
                                <td>${lastActive}</td>
                                <td style="text-align: center;">${u.personal_stats.totalDrills}</td>
                                <td style="text-align: center;">
                                    <span class="category-badge" style="background-color: var(--info-color);">${assignedCompleted} / ${assignedTotal}</span>
                                </td>
                                <td><span class="status-dot status-green"></span> Activo</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderContent() {
    if (currentTab === 'dashboard') renderDashboardView();
    else renderAssignView();
}

function renderUserDetailModal(user: UserStat) {
    const modalId = `user-detail-${user.id}`;
    if (document.getElementById(modalId)) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = modalId;

    const assignedHistoryRows = user.assigned_history?.map(h => `
        <tr>
            <td>${new Date(h.created_at).toLocaleDateString()}</td>
            <td>${h.drill_type}</td>
            <td><span class="category-badge" style="background-color: ${h.status === 'COMPLETED' ? 'var(--success-color)' : 'var(--warning-color)'}">${h.status}</span></td>
            <td>${h.status === 'COMPLETED' ? `${h.score}/${h.max_score}` : '-'}</td>
            <td>${h.completed_at ? new Date(h.completed_at).toLocaleString() : '-'}</td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align: center;">Sin historial de asignaciones.</td></tr>';

    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 800px; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 class="modal-title" style="margin: 0;">Detalle: ${user.username}</h2>
                <button class="secondary-btn modal-close-btn">✕</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                <div class="stat-card">
                    <div class="label">Simulacros IA (Autónomos)</div>
                    <div class="value">${user.personal_stats.totalDrills}</div>
                    <div class="subtext">Preguntas respondidas: ${user.personal_stats.totalQuestions}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Simulacros Asignados</div>
                    <div class="value">${user.assigned_history?.length || 0}</div>
                    <div class="subtext">Completados: ${user.assigned_history?.filter(h => h.status === 'COMPLETED').length || 0}</div>
                </div>
            </div>

            <h3 class="reference-table-subtitle">Historial de Asignaciones</h3>
            <div class="table-wrapper" style="max-height: 300px; overflow-y: auto;">
                <table class="reference-table">
                    <thead>
                        <tr>
                            <th>Fecha Asignación</th>
                            <th>Tipo</th>
                            <th>Estado</th>
                            <th>Puntuación</th>
                            <th>Fecha Completado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assignedHistoryRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    modalOverlay.addEventListener('click', e => {
        if(e.target === modalOverlay || (e.target as HTMLElement).classList.contains('modal-close-btn')) {
            modalOverlay.remove();
        }
    });
}

function attachEditorEvents(container: HTMLElement) {
    // Just a placeholder if any specific editor events need direct attachment not handled by global listener
    // Currently most events are handled by delegated listener in renderSupervisorPage
}

export function renderSupervisorPage(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Panel de Supervisor</h2>
            <div class="info-nav-tabs">
                <button class="info-nav-btn ${currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">Dashboard</button>
                <button class="info-nav-btn ${currentTab === 'assign' ? 'active' : ''}" data-tab="assign">Asignar Simulacros</button>
            </div>
            <div id="supervisor-content"></div>
        </div>
    `;
    
    fetchUsersStats();
    attachEditorEvents(container);

    // Event Delegation
    container.addEventListener('input', e => {
        const target = e.target as HTMLInputElement;
        if (target.id === 'dashboard-search') { 
            dashboardFilter = target.value; 
            renderContent(); 
        }
    });

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        
        // Tabs
        const tabBtn = target.closest('button[data-tab]');
        if (tabBtn) {
            const newTab = tabBtn.getAttribute('data-tab') as any;
            if (newTab) {
                currentTab = newTab;
                container.querySelectorAll('.info-nav-btn').forEach(b => b.classList.remove('active'));
                tabBtn.classList.add('active');
                renderContent();
            }
        }
        
        // Sort
        const sortTh = target.closest('th[data-sort]');
        if (sortTh) {
            const key = sortTh.getAttribute('data-sort')!;
            if (dashboardSort.key === key) dashboardSort.dir = dashboardSort.dir === 'asc' ? 'desc' : 'asc';
            else { dashboardSort.key = key; dashboardSort.dir = 'desc'; }
            renderContent();
        }

        // Time range (if used later)
        const rangeBtn = target.closest('button[data-range]');
        if (rangeBtn) {
            timeRange = rangeBtn.getAttribute('data-range') as any;
            renderContent();
        }

        // User Details
        const userRow = target.closest('.user-row-interactive');
        if (userRow) {
            const uid = parseInt(userRow.getAttribute('data-user-id')!);
            const user = usersStats.find(u => u.id === uid);
            if (user) renderUserDetailModal(user);
        }

        // Actions
        if (target.closest('#export-csv-btn')) exportToCSV();
        
        const genBtn = target.closest('.gen-drill-btn');
        if (genBtn) {
            const type = genBtn.getAttribute('data-type');
            if(type) generateDrillPreview(type);
        }
        
        if (target.closest('#create-manual-btn')) createManualDrill();
        if (target.closest('#confirm-assign-btn')) assignDrill();
    });
    
    container.addEventListener('change', e => {
        const target = e.target as HTMLInputElement;
        if (target.classList.contains('user-select-cb')) {
            const uid = parseInt(target.value);
            if (target.checked) selectedUserIds.push(uid);
            else selectedUserIds = selectedUserIds.filter(id => id !== uid);
            
            const allSelectedBtn = document.getElementById('select-all-users-btn');
            if(allSelectedBtn) {
                const allSelected = usersStats.length > 0 && selectedUserIds.length === usersStats.length;
                allSelectedBtn.textContent = allSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos';
            }
        }
    });
}
