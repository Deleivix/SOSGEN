
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

type UserStat = {
    id: number;
    username: string;
    email: string;
    last_activity: string | null;
    personal_stats: {
        totalDrills?: number;
        totalCorrect?: number;
        totalQuestions?: number;
    };
    assigned_history: {
        status: string;
        score: number;
        max_score: number;
        created_at: string;
    }[] | null;
};

let usersStats: UserStat[] = [];
let selectedUserIds: number[] = [];
let generatedDrillData: any = null;
let isLoading = false;
let currentTab: 'dashboard' | 'assign' | 'history' = 'dashboard';

// --- API ACTIONS ---

async function fetchUsersStats() {
    const user = getCurrentUser();
    if (!user) return;
    isLoading = true;
    renderContent();

    try {
        const response = await fetch('/api/supervisor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_users_stats', supervisorUsername: user.username })
        });
        if (!response.ok) throw new Error('Error fetching stats');
        usersStats = await response.json();
    } catch (e) {
        showToast("Error al cargar datos de usuarios", "error");
    } finally {
        isLoading = false;
        renderContent();
    }
}

async function assignDrill() {
    const user = getCurrentUser();
    if (!user || !generatedDrillData || selectedUserIds.length === 0) {
        showToast("Seleccione usuarios y genere un simulacro.", "error");
        return;
    }

    try {
        const response = await fetch('/api/supervisor', {
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
        if (!response.ok) throw new Error('Failed to assign');
        showToast("Simulacro asignado correctamente.", "success");
        generatedDrillData = null;
        selectedUserIds = [];
        renderContent();
    } catch (e) {
        showToast("Error al asignar simulacro", "error");
    }
}

async function generateDrillPreview(type: string) {
    const container = document.getElementById('drill-preview-area');
    if (!container) return;
    container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;

    try {
        const response = await fetch('/api/simulacro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
        });
        if (!response.ok) throw new Error('Failed to generate');
        generatedDrillData = await response.json();
        renderAssignTab(); // Re-render to show preview
    } catch (e) {
        showToast("Error generando simulacro", "error");
        container.innerHTML = `<p class="error">Error al generar.</p>`;
    }
}

function exportToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Usuario,Email,Ultima Actividad,Total Simulacros Personales,Media Personal,Simulacros Asignados,Media Asignados\n";

    usersStats.forEach(u => {
        const pStats = u.personal_stats || {};
        const pAvg = pStats.totalQuestions ? ((pStats.totalCorrect || 0) / pStats.totalQuestions * 100).toFixed(1) : "0";
        
        const assigned = u.assigned_history || [];
        const completedAssigned = assigned.filter(a => a.status === 'COMPLETED');
        let assignedAvg = "0";
        if (completedAssigned.length > 0) {
            const totalScore = completedAssigned.reduce((acc, curr) => acc + (curr.score || 0), 0);
            const totalMax = completedAssigned.reduce((acc, curr) => acc + (curr.max_score || 0), 0);
            if (totalMax > 0) assignedAvg = ((totalScore / totalMax) * 100).toFixed(1);
        }

        const row = [
            u.username,
            u.email,
            u.last_activity ? new Date(u.last_activity).toLocaleString() : '-',
            pStats.totalDrills || 0,
            pAvg + '%',
            assigned.length,
            assignedAvg + '%'
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_simulacros.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- RENDER FUNCTIONS ---

function renderDashboardTab() {
    const totalDrills = usersStats.reduce((acc, u) => acc + (u.personal_stats?.totalDrills || 0), 0);
    const totalAssigned = usersStats.reduce((acc, u) => acc + (u.assigned_history?.length || 0), 0);
    
    return `
        <div class="supervisor-stats-grid">
            <div class="supervisor-stat-card">
                <div class="supervisor-stat-value">${usersStats.length}</div>
                <div class="supervisor-stat-label">Usuarios Activos</div>
            </div>
            <div class="supervisor-stat-card">
                <div class="supervisor-stat-value">${totalDrills}</div>
                <div class="supervisor-stat-label">Simulacros Personales</div>
            </div>
            <div class="supervisor-stat-card">
                <div class="supervisor-stat-value">${totalAssigned}</div>
                <div class="supervisor-stat-label">Simulacros Asignados</div>
            </div>
        </div>
        <div class="table-wrapper">
            <table class="reference-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Última Actividad</th>
                        <th style="text-align:center;">KPI Personal</th>
                        <th style="text-align:center;">Asignados (Comp/Tot)</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersStats.map(u => {
                        const pAvg = u.personal_stats?.totalQuestions 
                            ? ((u.personal_stats.totalCorrect! / u.personal_stats.totalQuestions!) * 100).toFixed(0) 
                            : '-';
                        const assigned = u.assigned_history || [];
                        const completed = assigned.filter(a => a.status === 'COMPLETED').length;
                        return `
                            <tr>
                                <td>${u.username}</td>
                                <td>${u.email}</td>
                                <td>${u.last_activity ? new Date(u.last_activity).toLocaleDateString() : '-'}</td>
                                <td style="text-align:center;">${pAvg === '-' ? '-' : pAvg + '%'}</td>
                                <td style="text-align:center;">${completed} / ${assigned.length}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top: 2rem; text-align: right;">
            <button id="export-csv-btn" class="secondary-btn">Descargar Informe CSV</button>
        </div>
    `;
}

function renderAssignTab() {
    const userListHtml = usersStats.map(u => `
        <label class="user-table-row" style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem; border-bottom:1px solid var(--border-color);">
            <input type="checkbox" class="user-select-cb" value="${u.id}" ${selectedUserIds.includes(u.id) ? 'checked' : ''}>
            <span>${u.username}</span>
        </label>
    `).join('');

    let previewHtml = '<p class="drill-placeholder">Genere un simulacro para previsualizarlo.</p>';
    if (generatedDrillData) {
        previewHtml = `
            <div style="background:var(--bg-main); padding:1rem; border:1px solid var(--border-color); border-radius:8px; margin-bottom:1rem;">
                <h4>${generatedDrillData.type === 'dsc' ? 'Alerta DSC' : 'Radiotelefonía'}</h4>
                <p style="font-family:var(--font-mono); font-size:0.9rem;">${generatedDrillData.scenario}</p>
                <div style="margin-top:1rem;">
                    <strong>Preguntas:</strong>
                    <ul style="padding-left:1.5rem; margin-top:0.5rem;">
                        ${generatedDrillData.questions.map((q:any) => `<li>${q.questionText}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <button id="confirm-assign-btn" class="primary-btn">Confirmar y Enviar a Seleccionados</button>
        `;
    }

    return `
        <div style="display:grid; grid-template-columns: 300px 1fr; gap:2rem;">
            <div style="border:1px solid var(--border-color); border-radius:8px; height:500px; display:flex; flex-direction:column;">
                <div style="padding:1rem; border-bottom:1px solid var(--border-color); font-weight:bold; background:var(--bg-card);">Seleccionar Usuarios</div>
                <div style="overflow-y:auto; flex-grow:1; background:var(--bg-main);">
                    ${userListHtml}
                </div>
            </div>
            <div>
                <div style="margin-bottom:2rem;">
                    <h3 class="reference-table-subtitle" style="margin-top:0;">Generar Nuevo Simulacro</h3>
                    <div style="display:flex; gap:1rem;">
                        <button class="secondary-btn gen-drill-btn" data-type="dsc">Generar DSC</button>
                        <button class="secondary-btn gen-drill-btn" data-type="radiotelephony">Generar Voz</button>
                    </div>
                </div>
                <div id="drill-preview-area">
                    ${previewHtml}
                </div>
            </div>
        </div>
    `;
}

function renderContent() {
    const container = document.getElementById('supervisor-content');
    if (!container) return;

    if (isLoading) {
        container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        return;
    }

    let html = '';
    if (currentTab === 'dashboard') html = renderDashboardTab();
    else if (currentTab === 'assign') html = renderAssignTab();
    else html = '<p>Historial detallado en desarrollo.</p>';

    container.innerHTML = html;
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

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
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

        if (target.id === 'export-csv-btn') exportToCSV();
        
        if (target.classList.contains('gen-drill-btn')) {
            const type = target.getAttribute('data-type');
            if(type) generateDrillPreview(type);
        }

        if (target.id === 'confirm-assign-btn') assignDrill();
    });

    container.addEventListener('change', e => {
        const target = e.target as HTMLInputElement;
        if (target.classList.contains('user-select-cb')) {
            const uid = parseInt(target.value);
            if (target.checked) selectedUserIds.push(uid);
            else selectedUserIds = selectedUserIds.filter(id => id !== uid);
        }
    });
}
