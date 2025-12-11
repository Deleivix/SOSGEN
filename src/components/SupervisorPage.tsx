
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

// --- TYPES ---
type UserStats = {
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
        status: 'PENDING' | 'COMPLETED';
        score?: number;
        max_score?: number;
        created_at: string;
        completed_at?: string;
        drill_type: string;
    }[] | null;
};

// --- STATE ---
let currentTab: 'dashboard' | 'assign' = 'dashboard';
let usersStats: UserStats[] = [];
let isLoading = false;
let dashboardFilter = '';
let dashboardSort: { key: string; dir: 'asc' | 'desc' } = { key: 'username', dir: 'asc' };
let timeRange: '1M' | '1Y' | 'ALL' = 'ALL';
let selectedUserIds: number[] = [];
let drillPreviewData: any = null;

// --- API ---
async function fetchUsersStats() {
    const user = getCurrentUser();
    if (!user) return;
    
    isLoading = true;
    renderContent(); // Show loader

    try {
        const response = await fetch('/api/supervisor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_users_stats',
                supervisorUsername: user.username
            })
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        usersStats = await response.json();
    } catch (e) {
        showToast("Error al cargar datos de usuarios.", "error");
    } finally {
        isLoading = false;
        renderContent();
    }
}

async function generateDrillPreview(type: string) {
    // Generate a drill using the existing simulation API but just for preview in supervisor
    // We re-use /api/simulacro
    const btn = document.querySelector(`.gen-drill-btn[data-type="${type}"]`) as HTMLButtonElement;
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="width:12px;height:12px;"></span> Generando...`;
    }

    try {
        const response = await fetch('/api/simulacro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
        });
        if (!response.ok) throw new Error('Error generando simulacro');
        drillPreviewData = await response.json();
        // Add type for saving later
        drillPreviewData.type = type; 
        renderDrillPreviewModal();
    } catch (e) {
        showToast("Error al generar vista previa.", "error");
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.textContent = type === 'dsc' ? 'Generar DSC' : 'Generar Voz';
        }
    }
}

async function assignDrill() {
    const user = getCurrentUser();
    if (!user || selectedUserIds.length === 0 || !drillPreviewData) {
        showToast("Seleccione usuarios y genere un simulacro primero.", "error");
        return;
    }

    const confirmBtn = document.getElementById('confirm-assign-btn') as HTMLButtonElement;
    if(confirmBtn) confirmBtn.disabled = true;

    try {
        const response = await fetch('/api/supervisor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'assign_drill',
                supervisorUsername: user.username,
                targetUserIds: selectedUserIds,
                drillType: drillPreviewData.type,
                drillData: drillPreviewData
            })
        });
        if (!response.ok) throw new Error('Error assigning drill');
        showToast("Simulacros asignados correctamente.", "success");
        selectedUserIds = []; // Clear selection
        drillPreviewData = null; // Clear drill
        renderContent(); // Re-render assign tab
    } catch (e) {
        showToast("Error al asignar.", "error");
    }
}

// --- RENDER FUNCTIONS ---

function renderContent() {
    const container = document.getElementById('supervisor-content');
    if (!container) return;

    if (isLoading) {
        container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }

    if (currentTab === 'dashboard') {
        renderDashboard(container);
    } else {
        renderAssign(container);
    }
}

function renderDashboard(container: HTMLElement) {
    let filtered = usersStats.filter(u => 
        u.username.toLowerCase().includes(dashboardFilter.toLowerCase()) || 
        u.email.toLowerCase().includes(dashboardFilter.toLowerCase())
    );

    // Sort
    filtered.sort((a: any, b: any) => {
        let valA = a[dashboardSort.key];
        let valB = b[dashboardSort.key];
        
        // Custom sort keys
        if (dashboardSort.key === 'drill_avg') {
            valA = a.personal_stats.totalQuestions > 0 ? a.personal_stats.totalCorrect / a.personal_stats.totalQuestions : 0;
            valB = b.personal_stats.totalQuestions > 0 ? b.personal_stats.totalCorrect / b.personal_stats.totalQuestions : 0;
        }

        if (valA < valB) return dashboardSort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return dashboardSort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    const rows = filtered.map(u => {
        const pStats = u.personal_stats || { totalDrills: 0, totalCorrect: 0, totalQuestions: 0 };
        const avg = pStats.totalQuestions > 0 ? Math.round((pStats.totalCorrect / pStats.totalQuestions) * 100) : 0;
        const lastActive = u.last_activity ? new Date(u.last_activity).toLocaleDateString() : '-';
        
        // Assigned Stats
        const assigned = u.assigned_history || [];
        const completed = assigned.filter(a => a.status === 'COMPLETED').length;
        const pending = assigned.filter(a => a.status === 'PENDING').length;

        return `
            <tr class="user-row-interactive" data-user-id="${u.id}">
                <td>${u.username}</td>
                <td>${lastActive}</td>
                <td>${pStats.totalDrills} / ${avg}%</td>
                <td><span style="color:var(--success-color); font-weight:bold;">${completed}</span> / <span style="color:var(--warning-color); font-weight:bold;">${pending}</span></td>
                <td><button class="secondary-btn" style="padding:2px 8px; font-size:0.8rem;">Detalles</button></td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="dashboard-controls" style="display:flex; justify-content:space-between; margin-bottom:1rem; align-items:center;">
            <input type="text" id="dashboard-search" class="filter-input" placeholder="Buscar usuario..." value="${dashboardFilter}" style="margin:0; width:250px;">
            <div style="display:flex; gap:0.5rem;">
                <button class="secondary-btn ${timeRange === '1M' ? 'active' : ''}" data-range="1M">1 Mes</button>
                <button class="secondary-btn ${timeRange === 'ALL' ? 'active' : ''}" data-range="ALL">Todo</button>
                <button class="secondary-btn" id="export-csv-btn">Exportar CSV</button>
            </div>
        </div>
        <div class="table-wrapper">
            <table class="reference-table">
                <thead>
                    <tr>
                        <th data-sort="username" style="cursor:pointer;">Usuario ${dashboardSort.key === 'username' ? (dashboardSort.dir === 'asc' ? '↑' : '↓') : ''}</th>
                        <th data-sort="last_activity" style="cursor:pointer;">Último Acceso ${dashboardSort.key === 'last_activity' ? (dashboardSort.dir === 'asc' ? '↑' : '↓') : ''}</th>
                        <th data-sort="drill_avg" style="cursor:pointer;">Personales (Nº / Med) ${dashboardSort.key === 'drill_avg' ? (dashboardSort.dir === 'asc' ? '↑' : '↓') : ''}</th>
                        <th>Asignados (Ok / Pend)</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function renderAssign(container: HTMLElement) {
    const userList = usersStats.map(u => `
        <label class="user-select-item" style="display:flex; align-items:center; padding:0.5rem; border-bottom:1px solid var(--border-color);">
            <input type="checkbox" class="user-select-cb" value="${u.id}" ${selectedUserIds.includes(u.id) ? 'checked' : ''} style="margin-right:10px;">
            <span>${u.username}</span>
        </label>
    `).join('');

    // If drill preview exists, render summary
    let drillPreviewHtml = '<div class="drill-placeholder">Genere un simulacro para asignar.</div>';
    if (drillPreviewData) {
        drillPreviewHtml = `
            <div class="drill-preview-card" style="border:1px solid var(--accent-color); padding:1rem; border-radius:8px; background:var(--bg-card);">
                <h4 style="margin-top:0;">${drillPreviewData.type === 'dsc' ? 'Simulacro DSC' : (drillPreviewData.type === 'radiotelephony' ? 'Simulacro Voz' : 'Simulacro Manual')}</h4>
                <p><strong>Escenario:</strong> ${drillPreviewData.scenario}</p>
                <p><strong>Preguntas:</strong> ${drillPreviewData.questions.length}</p>
                <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                    <button class="primary-btn" id="confirm-assign-btn">Confirmar Asignación (${selectedUserIds.length} usuarios)</button>
                    <button class="secondary-btn" onclick="drillPreviewData=null; renderContent();">Descartar</button>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="assign-layout" style="display:grid; grid-template-columns: 300px 1fr; gap:2rem;">
            <div class="user-selector-panel" style="border-right:1px solid var(--border-color); padding-right:1rem;">
                <h3>Seleccionar Usuarios</h3>
                <button class="secondary-btn" id="select-all-users-btn" style="width:100%; margin-bottom:1rem;">
                    ${selectedUserIds.length === usersStats.length && usersStats.length > 0 ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </button>
                <div class="user-list-scroll" style="max-height:500px; overflow-y:auto;">
                    ${userList}
                </div>
            </div>
            <div class="drill-creator-panel">
                <h3>Configurar Simulacro</h3>
                <div class="drill-actions" style="display:flex; gap:1rem; margin-bottom:2rem;">
                    <button class="secondary-btn gen-drill-btn" data-type="dsc">Generar DSC</button>
                    <button class="secondary-btn gen-drill-btn" data-type="radiotelephony">Generar Voz</button>
                    <button class="secondary-btn" id="create-manual-btn">Crear Manual</button>
                </div>
                ${drillPreviewHtml}
            </div>
        </div>
    `;
}

function renderUserDetailModal(user: UserStats) {
    const modalId = `user-detail-${user.id}`;
    if(document.getElementById(modalId)) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = modalId;
    
    // Sort history
    const history = (user.assigned_history || []).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const historyRows = history.map(h => `
        <tr>
            <td>${new Date(h.created_at).toLocaleDateString()}</td>
            <td>${h.drill_type}</td>
            <td><span class="category-badge" style="background-color:${h.status === 'COMPLETED' ? 'var(--success-color)' : 'var(--warning-color)'}">${h.status}</span></td>
            <td>${h.score !== undefined ? h.score + '/' + h.max_score : '-'}</td>
        </tr>
    `).join('');

    modal.innerHTML = `
        <div class="modal-content" style="max-width:800px; text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h2 class="modal-title" style="margin:0;">${user.username}</h2>
                <button class="secondary-btn modal-close-btn" style="width:auto;">✕</button>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:2rem;">
                <div class="stat-box">
                    <h4>Personales</h4>
                    <p>Total: ${user.personal_stats.totalDrills}</p>
                    <p>Aciertos: ${user.personal_stats.totalCorrect} / ${user.personal_stats.totalQuestions}</p>
                </div>
                <div class="stat-box">
                    <h4>Asignados</h4>
                    <p>Total: ${history.length}</p>
                    <p>Completados: ${history.filter(h => h.status === 'COMPLETED').length}</p>
                </div>
            </div>

            <h3>Historial de Asignaciones</h3>
            <div class="table-wrapper" style="max-height:300px; overflow-y:auto;">
                <table class="reference-table">
                    <thead><tr><th>Fecha</th><th>Tipo</th><th>Estado</th><th>Puntuación</th></tr></thead>
                    <tbody>${historyRows || '<tr><td colspan="4" style="text-align:center;">Sin historial</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
        if(e.target === modal || (e.target as HTMLElement).classList.contains('modal-close-btn')) modal.remove();
    });
}

function renderDrillPreviewModal() {
    // Only used if we want a separate modal, but here we render inline in the assign tab.
    // So we just call renderContent which handles the preview logic.
    renderContent();
}

function attachEditorEvents(container: HTMLElement) {
    // Placeholder if manual editor logic is complex, for now simple buttons in render
}

function createManualDrill() {
    // Basic prompt for now, could be a full modal editor
    const scenario = prompt("Descripción del escenario:");
    if(!scenario) return;
    const q1 = prompt("Pregunta 1:");
    if(!q1) return;
    
    drillPreviewData = {
        type: 'manual',
        scenario: scenario,
        questions: [{
            questionText: q1,
            options: ["Verdadero", "Falso"],
            correctAnswerIndex: 0,
            feedback: "Manual entry"
        }]
    };
    renderContent();
}

function exportToCSV() {
    let csv = "ID,Usuario,Email,Ultimo_Acceso,Simulacros_Personales,Media_Personales,Asignados_Completados,Asignados_Pendientes\n";
    usersStats.forEach(u => {
        const pStats = u.personal_stats || { totalDrills: 0, totalCorrect: 0, totalQuestions: 0 };
        const avg = pStats.totalQuestions > 0 ? Math.round((pStats.totalCorrect / pStats.totalQuestions) * 100) : 0;
        const assigned = u.assigned_history || [];
        const completed = assigned.filter(a => a.status === 'COMPLETED').length;
        const pending = assigned.filter(a => a.status === 'PENDING').length;
        
        csv += `${u.id},${u.username},${u.email},${u.last_activity || ''},${pStats.totalDrills},${avg}%,${completed},${pending}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sosgen_users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

export function renderSupervisorPage(container: HTMLElement) {
    // See prompt for content
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
    container.addEventListener('input', e => {
        const target = e.target as HTMLInputElement;
        if (target.id === 'dashboard-search') { dashboardFilter = target.value; renderContent(); }
    });
    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        
        // Navigation Tabs
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
        
        // Table Sorting
        const sortTh = target.closest('th[data-sort]');
        if (sortTh) {
            const key = sortTh.getAttribute('data-sort')!;
            if (dashboardSort.key === key) dashboardSort.dir = dashboardSort.dir === 'asc' ? 'desc' : 'asc';
            else { dashboardSort.key = key; dashboardSort.dir = 'desc'; }
            renderContent();
        }
        
        // Time Range Filter
        const rangeBtn = target.closest('button[data-range]');
        if (rangeBtn) {
            timeRange = rangeBtn.getAttribute('data-range') as '1M' | '1Y' | 'ALL';
            renderContent();
        }

        // User Detail Modal
        const userRow = target.closest('.user-row-interactive');
        if (userRow) {
            const uid = parseInt(userRow.getAttribute('data-user-id')!);
            const user = usersStats.find(u => u.id === uid);
            if (user) renderUserDetailModal(user);
        }

        // Action Buttons (Using closest to handle inner clicks on icons/text)
        if (target.closest('#export-csv-btn')) exportToCSV();
        
        const genBtn = target.closest('.gen-drill-btn');
        if (genBtn) {
            const type = genBtn.getAttribute('data-type');
            if(type) generateDrillPreview(type);
        }
        
        if (target.closest('#create-manual-btn')) createManualDrill();
        if (target.closest('#confirm-assign-btn')) assignDrill();
        
        if (target.closest('#select-all-users-btn')) {
            if(selectedUserIds.length === usersStats.length && usersStats.length > 0) {
                selectedUserIds = [];
            } else {
                selectedUserIds = usersStats.map(u => u.id);
            }
            renderContent();
        }
    });
    
    container.addEventListener('change', e => {
        const target = e.target as HTMLInputElement;
        if (target.classList.contains('user-select-cb')) {
            const uid = parseInt(target.value);
            if (target.checked) selectedUserIds.push(uid);
            else selectedUserIds = selectedUserIds.filter(id => id !== uid);
            
            // Re-render button text only without full render if possible, or just re-render assign part
            const allSelectedBtn = document.getElementById('select-all-users-btn');
            if(allSelectedBtn) {
                const allSelected = usersStats.length > 0 && selectedUserIds.length === usersStats.length;
                allSelectedBtn.textContent = allSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos';
            }
        }
    });
}
