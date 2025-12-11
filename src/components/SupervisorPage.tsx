
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
        dsc?: { taken: number; correct: number; questions: number; };
        radiotelephony?: { taken: number; correct: number; questions: number; };
        manual?: { taken: number; correct: number; questions: number; };
        history?: { timestamp: string; score: number; total: number; }[];
    };
    assigned_history: {
        status: string;
        score: number;
        max_score: number;
        created_at: string;
        completed_at?: string;
        drill_type?: string;
    }[] | null;
};

let usersStats: UserStat[] = [];
let selectedUserIds: number[] = [];
let generatedDrillData: any = null;
let isLoading = false;
let currentTab: 'dashboard' | 'assign' = 'dashboard';

// --- DASHBOARD STATE ---
let dashboardFilter = "";
let dashboardSort: { key: string, dir: 'asc' | 'desc' } = { key: 'last_activity', dir: 'desc' };
let timeRange: '1M' | '1Y' | 'ALL' = 'ALL'; 

function isDateInRange(dateStr: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    if (timeRange === '1M') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return date >= oneMonthAgo;
    }
    if (timeRange === '1Y') {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        return date >= oneYearAgo;
    }
    return true; 
}

function getLast6MonthsLabels() {
    const months = [];
    const date = new Date();
    date.setDate(1); 
    for (let i = 5; i >= 0; i--) {
        const d = new Date(date);
        d.setMonth(date.getMonth() - i);
        months.push({ label: d.toLocaleString('es-ES', { month: 'short' }).toUpperCase(), key: `${d.getFullYear()}-${d.getMonth()}`, obj: d });
    }
    return months;
}

function getMonthlyAssignmentStats() {
    const months = getLast6MonthsLabels();
    const stats = months.map(m => ({ label: m.label, key: m.key, assigned: 0, completed: 0 }));
    usersStats.forEach(u => {
        if (!u.assigned_history) return;
        u.assigned_history.forEach(h => {
            const createdDate = new Date(h.created_at);
            const createdKey = `${createdDate.getFullYear()}-${createdDate.getMonth()}`;
            const assignIdx = stats.findIndex(m => m.key === createdKey);
            if (assignIdx > -1) stats[assignIdx].assigned++;
            if (h.status === 'COMPLETED' && h.completed_at) {
                const completedDate = new Date(h.completed_at);
                const completedKey = `${completedDate.getFullYear()}-${completedDate.getMonth()}`;
                const completeIdx = stats.findIndex(m => m.key === completedKey);
                if (completeIdx > -1) stats[completeIdx].completed++;
            }
        });
    });
    return stats;
}

function getPerformanceTrend() {
    const months = getLast6MonthsLabels();
    const stats = months.map(m => ({ label: m.label, key: m.key, totalScore: 0, totalMax: 0 }));
    usersStats.forEach(u => {
        if (u.assigned_history) {
            u.assigned_history.forEach(h => {
                if (h.status === 'COMPLETED' && h.completed_at) {
                    const date = new Date(h.completed_at);
                    const key = `${date.getFullYear()}-${date.getMonth()}`;
                    const idx = stats.findIndex(m => m.key === key);
                    if (idx > -1) { stats[idx].totalScore += h.score; stats[idx].totalMax += h.max_score; }
                }
            });
        }
    });
    return stats.map(s => ({ label: s.label, value: s.totalMax > 0 ? Math.round((s.totalScore / s.totalMax) * 100) : 0 }));
}

function renderLineChartSVG(data: { label: string, value: number }[]) {
    const width = 300, height = 150, padding = 20, maxVal = 100;
    const xStep = (width - padding * 2) / (data.length - 1);
    const points = data.map((d, i) => `${padding + i * xStep},${height - padding - (d.value / maxVal) * (height - padding * 2)}`).join(' ');
    const labels = data.map((d, i) => `<text x="${padding + i * xStep}" y="${height - 5}" font-size="10" text-anchor="middle" fill="var(--text-secondary)">${d.label}</text>`).join('');
    const dots = data.map((d, i) => {
        const x = padding + i * xStep;
        const y = height - padding - (d.value / maxVal) * (height - padding * 2);
        return `<circle cx="${x}" cy="${y}" r="4" fill="var(--accent-color)" stroke="var(--bg-card)" stroke-width="2" /><text x="${x}" y="${y - 10}" font-size="10" text-anchor="middle" fill="var(--text-primary)" font-weight="bold">${d.value}%</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%;"><line x1="${padding}" y1="${padding}" x2="${width-padding}" y2="${padding}" stroke="var(--border-color)" stroke-dasharray="4" /><line x1="${padding}" y1="${height/2}" x2="${width-padding}" y2="${height/2}" stroke="var(--border-color)" stroke-dasharray="4" /><line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="var(--border-color)" /><polyline points="${points}" fill="none" stroke="var(--accent-color)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />${dots}${labels}</svg>`;
}

function renderGroupedBarChartSVG(data: { label: string, assigned: number, completed: number }[]) {
    const width = 300, height = 150, padding = 20;
    const maxVal = Math.max(...data.map(d => Math.max(d.assigned, d.completed)), 5);
    const xStep = (width - padding * 2) / data.length;
    const barWidth = (xStep * 0.35); const gap = 2;
    const bars = data.map((d, i) => {
        const xStart = padding + i * xStep + (xStep - (barWidth * 2 + gap)) / 2;
        const hAssigned = (d.assigned / maxVal) * (height - padding * 2);
        const yAssigned = height - padding - hAssigned;
        const hCompleted = (d.completed / maxVal) * (height - padding * 2);
        const yCompleted = height - padding - hCompleted;
        return `${d.assigned > 0 ? `<rect x="${xStart}" y="${yAssigned}" width="${barWidth}" height="${hAssigned}" fill="var(--info-color)" rx="2" />` : ''}${d.completed > 0 ? `<rect x="${xStart + barWidth + gap}" y="${yCompleted}" width="${barWidth}" height="${hCompleted}" fill="var(--accent-color)" rx="2" />` : ''}<text x="${xStart + barWidth + gap / 2}" y="${height - 5}" font-size="10" text-anchor="middle" fill="var(--text-secondary)">${d.label}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%;"><line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="var(--border-color)" />${bars}</svg>`;
}

async function fetchUsersStats() {
    const user = getCurrentUser();
    if (!user) return;
    isLoading = true;
    renderContent();
    try {
        const response = await fetch('/api/supervisor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_users_stats', supervisorUsername: user.username }) });
        if (!response.ok) throw new Error('Error fetching stats');
        usersStats = await response.json();
    } catch (e) { showToast("Error al cargar datos de usuarios", "error"); } finally { isLoading = false; renderContent(); }
}

function scrapeDrillDataFromEditor() {
    const editor = document.getElementById('drill-editor');
    if (!editor) return null;
    const scenarioInput = document.getElementById('editor-scenario') as HTMLTextAreaElement;
    const typeSelect = document.getElementById('editor-drill-type') as HTMLSelectElement;
    if (!scenarioInput.value.trim()) { showToast("El escenario no puede estar vacío", "error"); return null; }
    const questions: any[] = [];
    const questionBlocks = editor.querySelectorAll('.editor-question-block');
    let isValid = true;
    questionBlocks.forEach((block) => {
        const qText = (block.querySelector('.q-text-input') as HTMLTextAreaElement).value.trim();
        const qType = (block.querySelector('.q-type-select') as HTMLSelectElement).value;
        const optionsInputs = block.querySelectorAll('.q-option-input');
        if (!qText) { isValid = false; return; }
        const options: string[] = [];
        let correctAnswerIndex = 0;
        optionsInputs.forEach((input) => { const val = (input as HTMLInputElement).value.trim(); if (val) options.push(val); });
        if (options.length < 2) { showToast("Cada pregunta debe tener al menos 2 opciones.", "error"); isValid = false; return; }
        if (qType === 'choice') {
            const checkedRadio = block.querySelector('input[type="radio"]:checked') as HTMLInputElement;
            if (!checkedRadio) { showToast("Marque la respuesta correcta en las preguntas tipo Test.", "error"); isValid = false; return; }
            correctAnswerIndex = parseInt(checkedRadio.value);
        }
        questions.push({ type: qType, questionText: qText, options: options, correctAnswerIndex: qType === 'choice' ? correctAnswerIndex : undefined });
    });
    if (!isValid) return null;
    if (questions.length === 0) { showToast("Añada al menos una pregunta.", "error"); return null; }
    return { type: typeSelect ? typeSelect.value : 'manual', scenario: scenarioInput.value.trim(), questions: questions };
}

async function assignDrill() {
    const user = getCurrentUser();
    const finalDrillData = scrapeDrillDataFromEditor();
    if (!user || !finalDrillData || selectedUserIds.length === 0) { if (selectedUserIds.length === 0) showToast("Seleccione al menos un usuario.", "error"); return; }
    try {
        const response = await fetch('/api/supervisor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assign_drill', supervisorUsername: user.username, targetUserIds: selectedUserIds, drillType: finalDrillData.type, drillData: finalDrillData }) });
        if (!response.ok) throw new Error('Failed to assign');
        showToast("Simulacro asignado correctamente.", "success");
        generatedDrillData = null; selectedUserIds = []; renderContent();
    } catch (e) { showToast("Error al asignar simulacro", "error"); }
}

async function generateDrillPreview(type: string) {
    isLoading = true;
    renderContent();
    try {
        const response = await fetch('/api/simulacro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
        });
        
        if (!response.ok) throw new Error('API error');
        
        const data = await response.json();
        
        generatedDrillData = {
            type: data.type || type,
            scenario: data.scenario || '',
            questions: data.questions || []
        };
        showToast("Simulacro generado. Revise y edite si es necesario.", "success");
    } catch (e) {
        console.error(e);
        showToast("No se pudo generar el simulacro.", "error");
    } finally {
        isLoading = false;
        renderContent();
    }
}

function createManualDrill() {
    generatedDrillData = { type: 'manual', scenario: 'Escriba aquí el escenario del simulacro...', questions: [{ type: 'choice', questionText: 'Pregunta 1...', options: ['Opción A', 'Opción B'], correctAnswerIndex: 0 }] };
    renderContent();
}

function exportToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Usuario,Email,Ultima Actividad,Simulacros Asignados,Simulacros Completados,Nota Media Auditada\n";
    usersStats.forEach(u => {
        const assigned = u.assigned_history || [];
        const completedAssigned = assigned.filter(a => a.status === 'COMPLETED');
        let assignedAvg = "0";
        if (completedAssigned.length > 0) {
            const totalScore = completedAssigned.reduce((acc, curr) => acc + (curr.score || 0), 0);
            const totalMax = completedAssigned.reduce((acc, curr) => acc + (curr.max_score || 0), 0);
            if (totalMax > 0) assignedAvg = ((totalScore / totalMax) * 100).toFixed(1);
        }
        csvContent += [u.username, u.email, u.last_activity ? new Date(u.last_activity).toLocaleString() : '-', assigned.length, completedAssigned.length, assignedAvg + '%'].join(",") + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "reporte_auditoria.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function getFilteredUserStats(u: UserStat) {
    let totalScore = 0, totalMax = 0, totalAssigned = 0, totalCompleted = 0;
    if (u.assigned_history) {
        const rangeAssigned = u.assigned_history.filter(h => isDateInRange(h.created_at));
        totalAssigned = rangeAssigned.length;
        const rangeCompleted = u.assigned_history.filter(h => h.status === 'COMPLETED' && h.completed_at && isDateInRange(h.completed_at));
        totalCompleted = rangeCompleted.length;
        rangeCompleted.forEach(h => { totalScore += h.score; totalMax += h.max_score; });
    }
    const kpi = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    return { kpi, hasData: totalMax > 0, totalAssigned, totalCompleted };
}

function renderUserDetailModal(user: UserStat) {
    const modalId = `user-detail-modal-${user.id}`;
    if (document.getElementById(modalId)) return;
    const modalOverlay = document.createElement('div'); modalOverlay.className = 'modal-overlay'; modalOverlay.id = modalId;
    const stats = getFilteredUserStats(user);
    const rangeText = timeRange === '1M' ? 'Último Mes' : (timeRange === '1Y' ? 'Último Año' : 'Todo el Historial');
    const history = user.assigned_history || [];
    const filteredHistory = history.filter(h => isDateInRange(h.created_at));
    const historyHtml = filteredHistory.length > 0 ? filteredHistory.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map(h => { 
            const isCompleted = h.status === 'COMPLETED';
            return `<tr style="font-size: 0.9rem;"><td>${new Date(h.created_at).toLocaleDateString()}</td><td>${h.drill_type === 'dsc' ? 'DSC' : (h.drill_type === 'radiotelephony' ? 'Voz' : 'Manual')}</td><td><span style="color:${isCompleted ? 'var(--success-color)' : 'var(--warning-color)'}; font-weight:700;">${h.status}</span></td><td style="text-align:right;">${isCompleted ? `${h.score}/${h.max_score}` : '-'}</td></tr>`;
        }).join('') : '<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--text-secondary);">Sin simulacros asignados en este periodo.</td></tr>';

    modalOverlay.innerHTML = `<div class="modal-content" style="max-width: 600px; text-align: left; padding: 2rem;"><div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--border-color);"><div><h2 class="modal-title" style="margin:0; font-size:1.5rem;">${user.username}</h2><p style="margin:0; font-size:0.9rem; color:var(--text-secondary);">${user.email}</p></div><button class="secondary-btn modal-close-btn" style="padding:0.4rem 0.8rem;">✕</button></div><div style="background:var(--bg-main); padding:0.5rem 1rem; border-radius:4px; margin-bottom:1rem; font-size:0.85rem; color:var(--accent-color-dark); font-weight:bold; text-align:center;">Mostrando datos: ${rangeText}</div><div class="user-detail-stats"><div class="user-detail-stat-item"><div class="user-detail-stat-val" style="color:var(--accent-color-dark);">${stats.hasData ? stats.kpi.toFixed(0) + '%' : '-'}</div><div class="user-detail-stat-lbl">Rendimiento Auditado</div></div><div class="user-detail-stat-item"><div class="user-detail-stat-val">${stats.totalCompleted}</div><div class="user-detail-stat-lbl">Completados</div></div><div class="user-detail-stat-item"><div class="user-detail-stat-val">${stats.totalAssigned}</div><div class="user-detail-stat-lbl">Asignados</div></div></div><h3 class="reference-table-subtitle" style="margin-top:0;">Asignaciones Recientes (${rangeText})</h3><div class="table-wrapper" style="margin-bottom:2rem;"><table class="reference-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Estado</th><th style="text-align:right;">Nota</th></tr></thead><tbody>${historyHtml}</tbody></table></div><div style="text-align:right;"><button class="primary-btn quick-assign-btn" data-user-id="${user.id}">Asignar Nuevo Simulacro</button></div></div>`;
    document.body.appendChild(modalOverlay);
    modalOverlay.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === modalOverlay || target.closest('.modal-close-btn')) modalOverlay.remove();
        const assignBtn = target.closest('.quick-assign-btn');
        if (assignBtn) { modalOverlay.remove(); const uid = parseInt(assignBtn.getAttribute('data-user-id')!); selectedUserIds = [uid]; currentTab = 'assign'; renderContent(); const tabBtn = document.querySelector('button[data-tab="assign"]'); if(tabBtn) (tabBtn as HTMLElement).click(); }
    });
}

function renderAnalyticsSection() {
    const monthlyStats = getMonthlyAssignmentStats();
    const trendStats = getPerformanceTrend();
    return `<div class="supervisor-charts-row"><div class="chart-card"><div class="chart-title" style="display:flex; justify-content:space-between; align-items:center;"><span>Rendimiento (Solo Auditados)</span><span style="font-size:0.7rem; font-weight:normal; color:var(--accent-color);">Media Mensual</span></div><div class="donut-chart-container" style="width:100%; height:150px;">${renderLineChartSVG(trendStats)}</div><div style="margin-top:1rem; font-size:0.8rem; color:var(--text-secondary); text-align:center;">Últimos 6 meses</div></div><div class="chart-card"><div class="chart-title" style="display:flex; justify-content:space-between; align-items:center;"><span>Asignaciones Mensuales</span><div style="display:flex; gap:10px; font-size:0.7rem; font-weight:normal;"><span style="color:var(--info-color);">■ Asignados</span><span style="color:var(--accent-color);">■ Completados</span></div></div><div class="bar-chart-container" style="height:150px; display:block;">${renderGroupedBarChartSVG(monthlyStats)}</div><div style="margin-top:1rem; font-size:0.8rem; color:var(--text-secondary); text-align:center;">Progreso mensual de auditoría</div></div></div>`;
}

function renderDashboardTab() {
    let filteredUsers = usersStats;
    if (dashboardFilter) { const term = dashboardFilter.toLowerCase(); filteredUsers = usersStats.filter(u => u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)); }
    filteredUsers.sort((a, b) => {
        let valA: any, valB: any;
        switch(dashboardSort.key) {
            case 'kpi': valA = getFilteredUserStats(a).kpi; valB = getFilteredUserStats(b).kpi; break;
            case 'assigned': valA = getFilteredUserStats(a).totalCompleted; valB = getFilteredUserStats(b).totalCompleted; break;
            case 'last_activity': valA = a.last_activity ? new Date(a.last_activity).getTime() : 0; valB = b.last_activity ? new Date(b.last_activity).getTime() : 0; break;
            default: valA = (a as any)[dashboardSort.key] || ''; valB = (b as any)[dashboardSort.key] || '';
        }
        return dashboardSort.dir === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });
    const totalAssigned = usersStats.reduce((acc, u) => acc + (u.assigned_history?.length || 0), 0);
    const totalCompleted = usersStats.reduce((acc, u) => acc + (u.assigned_history?.filter(h => h.status === 'COMPLETED').length || 0), 0);
    const sortIcon = (key: string) => { if (dashboardSort.key !== key) return '<span style="opacity:0.3; margin-left:5px;">↕</span>'; return dashboardSort.dir === 'asc' ? '<span style="color:var(--accent-color); margin-left:5px;">↑</span>' : '<span style="color:var(--accent-color); margin-left:5px;">↓</span>'; };

    return `${renderAnalyticsSection()}<div class="supervisor-stats-grid"><div class="supervisor-stat-card"><div class="supervisor-stat-value">${usersStats.length}</div><div class="supervisor-stat-label">Usuarios Activos</div></div><div class="supervisor-stat-card"><div class="supervisor-stat-value">${totalCompleted}</div><div class="supervisor-stat-label">Simulacros Completados</div></div><div class="supervisor-stat-card"><div class="supervisor-stat-value">${totalAssigned}</div><div class="supervisor-stat-label">Simulacros Asignados</div></div></div><div style="margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center;"><div style="display:flex; align-items:center; gap: 1rem;"><input type="text" id="dashboard-search" class="filter-input" placeholder="Filtrar por nombre o email..." value="${dashboardFilter}" style="width: 250px; margin-bottom: 0;"><div class="buoy-selector-group" id="time-range-selector"><button class="buoy-selector-btn ${timeRange === '1M' ? 'active' : ''}" data-range="1M" style="padding:0.4rem 0.8rem; font-size:0.8rem;">1 Mes</button><button class="buoy-selector-btn ${timeRange === '1Y' ? 'active' : ''}" data-range="1Y" style="padding:0.4rem 0.8rem; font-size:0.8rem;">1 Año</button><button class="buoy-selector-btn ${timeRange === 'ALL' ? 'active' : ''}" data-range="ALL" style="padding:0.4rem 0.8rem; font-size:0.8rem;">Todo</button></div></div><div style="font-size: 0.85rem; color: var(--text-secondary);">${filteredUsers.length} resultados</div></div><div class="table-wrapper"><table class="reference-table"><thead><tr><th style="cursor:pointer;" data-sort="username">Usuario ${sortIcon('username')}</th><th style="cursor:pointer;" data-sort="email">Email ${sortIcon('email')}</th><th style="cursor:pointer;" data-sort="last_activity">Última Actividad ${sortIcon('last_activity')}</th><th style="cursor:pointer; text-align:center;" data-sort="kpi">KPI Auditado (${timeRange}) ${sortIcon('kpi')}</th><th style="cursor:pointer; text-align:center;" data-sort="assigned">Asignados (Comp/Tot) ${sortIcon('assigned')}</th></tr></thead><tbody>${filteredUsers.map(u => { const stats = getFilteredUserStats(u); const kpiColor = stats.hasData ? (stats.kpi >= 70 ? 'var(--accent-color)' : (stats.kpi >= 50 ? 'var(--warning-color)' : 'var(--danger-color)')) : 'var(--text-secondary)'; const lastActDate = u.last_activity ? new Date(u.last_activity) : null; const daysInactive = lastActDate ? Math.floor((Date.now() - lastActDate.getTime()) / (1000 * 60 * 60 * 24)) : 999; const inactiveWarning = daysInactive > 15 ? `<span title="Inactivo > 15 días" style="color:var(--danger-color); font-weight:bold; margin-left:0.5rem;">⚠</span>` : ''; return `<tr class="user-row-interactive" data-user-id="${u.id}" style="cursor: pointer;"><td>${u.username}</td><td>${u.email}</td><td>${u.last_activity ? new Date(u.last_activity).toLocaleDateString() : '-'}${inactiveWarning}</td><td style="text-align:center;">${stats.hasData ? `<span style="font-weight:700; color:${kpiColor};">${stats.kpi.toFixed(0)}%</span>` : '-'}</td><td style="text-align:center;">${stats.totalCompleted} / ${stats.totalAssigned}</td></tr>`; }).join('')}</tbody></table></div><div style="margin-top: 2rem; text-align: right;"><button id="export-csv-btn" class="secondary-btn">Descargar Informe CSV</button></div>`;
}

function renderAssignTab() {
    const userListHtml = usersStats.map(u => `
        <label class="user-table-row" style="display:flex; align-items:center; gap:1rem; padding:0.75rem 1rem; border-bottom:1px solid var(--border-color); cursor:pointer; transition: background-color 0.2s;">
            <div style="flex-shrink: 0; display: flex; align-items: center;"><input type="checkbox" class="user-select-cb" value="${u.id}" ${selectedUserIds.includes(u.id) ? 'checked' : ''} style="cursor:pointer; width:1.25rem; height:1.25rem; accent-color:var(--accent-color);"></div><div style="width: 40px; height: 40px; background-color: var(--accent-color); color: white; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 1.1rem; flex-shrink: 0;">${u.username.charAt(0).toUpperCase()}</div><div style="display:flex; flex-direction:column; min-width: 0; flex: 1;"><span style="font-weight:600; color:var(--text-primary); font-size:0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.username}</span><span style="font-size:0.85rem; color:var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.email}</span></div>
        </label>
    `).join('');

    let editorHtml = `<div class="drill-placeholder" style="padding: 3rem 2rem; background: var(--bg-card); border-radius: 8px; border: 1px dashed var(--border-color);"><div style="font-size: 2rem; color: var(--text-secondary); margin-bottom: 1rem;">✎</div>Genera un simulacro con IA o crea uno manualmente para comenzar.</div>`;
    
    if (generatedDrillData) {
        editorHtml = `
            <div id="drill-editor" style="display: flex; flex-direction: column; gap: 2rem;">
                <div style="background:var(--bg-card); padding:1.5rem 2rem; border:1px solid var(--border-color); border-radius:12px; box-shadow: 0 2px 8px var(--shadow-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;"><h3 class="reference-table-subtitle" style="margin:0; border-bottom: none; padding-bottom: 0;">Configuración del Simulacro</h3><div style="display:flex; align-items:center; gap: 0.5rem;"><label class="modern-label" style="margin:0;">Tipo:</label><select id="editor-drill-type" class="modern-input" style="width: auto; padding: 0.3rem 2rem 0.3rem 0.5rem; font-size: 0.9rem;"><option value="dsc" ${generatedDrillData.type === 'dsc' ? 'selected' : ''}>Alerta DSC</option><option value="radiotelephony" ${generatedDrillData.type === 'radiotelephony' ? 'selected' : ''}>Radiotelefonía</option><option value="manual" ${generatedDrillData.type === 'manual' ? 'selected' : ''}>Manual / Otro</option></select></div></div>
                    <div><label class="modern-label" style="margin-bottom: 0.5rem;">Escenario</label><textarea id="editor-scenario" class="styled-textarea" style="min-height: 100px; font-size: 1rem;">${generatedDrillData.scenario}</textarea></div>
                </div>
                <div><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;"><label class="modern-label" style="margin:0; font-size: 1rem;">Preguntas (${generatedDrillData.questions.length})</label><button id="add-question-btn" class="secondary-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">+ Añadir Pregunta</button></div><div id="editor-questions-container" style="display:flex; flex-direction:column; gap:1.5rem;">${generatedDrillData.questions.map((q: any, idx: number) => renderQuestionBlock(q, idx)).join('')}</div></div>
                <div style="padding-top: 1.5rem; border-top: 1px solid var(--border-color); text-align: right;"><button id="confirm-assign-btn" class="primary-btn" style="width: auto; padding: 0.8rem 2rem; font-size: 1rem;">Confirmar y Enviar a ${selectedUserIds.length} Usuario(s)</button></div>
            </div>`;
    }

    const allSelected = usersStats.length > 0 && selectedUserIds.length === usersStats.length;
    return `<div style="display:grid; grid-template-columns: 320px 1fr; gap:2rem; height: calc(100vh - 180px); min-height: 600px;"><div style="border:1px solid var(--border-color); border-radius:12px; display:flex; flex-direction:column; background:var(--bg-card); overflow:hidden; box-shadow: 0 2px 8px var(--shadow-color);"><div style="padding:1rem; border-bottom:1px solid var(--border-color); background:var(--bg-main);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;"><span style="font-weight:bold; color:var(--text-primary);">Usuarios</span><span style="font-size:0.8rem; color:var(--accent-color-dark); font-weight:bold;">${selectedUserIds.length} seleccionados</span></div><button id="select-all-users-btn" class="secondary-btn" style="width:100%; padding: 0.5rem; font-size: 0.9rem;">${allSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos'}</button></div><div style="overflow-y:auto; flex-grow:1; background:var(--bg-card);">${userListHtml}</div></div><div style="overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column;"><div style="margin-bottom:2rem; background: var(--bg-card); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 2px 8px var(--shadow-color);"><h3 class="reference-table-subtitle" style="margin-top:0; border-bottom:none; padding-bottom:0.5rem;">Origen del Simulacro</h3><div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;"><button class="secondary-btn gen-drill-btn" data-type="dsc" style="height:auto; padding:1.2rem; flex-direction:column; gap:0.5rem; border:1px solid var(--border-color); transition: all 0.2s;"><div style="font-size:1.8rem;">📡</div><span style="font-weight:bold;">Generar DSC (IA)</span><span style="font-size:0.8rem; opacity:0.7;">Escenarios aleatorios</span></button><button class="secondary-btn gen-drill-btn" data-type="radiotelephony" style="height:auto; padding:1.2rem; flex-direction:column; gap:0.5rem; border:1px solid var(--border-color); transition: all 0.2s;"><div style="font-size:1.8rem;">🎙️</div><span style="font-weight:bold;">Generar Voz (IA)</span><span style="font-size:0.8rem; opacity:0.7;">Interacción hablada</span></button><button id="create-manual-btn" class="secondary-btn" style="height:auto; padding:1.2rem; flex-direction:column; gap:0.5rem; border:1px dashed var(--accent-color); color: var(--accent-color-dark); transition: all 0.2s;"><div style="font-size:1.8rem;">📝</div><span style="font-weight:bold;">Crear Manualmente</span><span style="font-size:0.8rem; opacity:0.7;">Desde cero</span></button></div></div><div id="drill-preview-area" style="flex-grow: 1;">${editorHtml}</div></div></div>`;
}

function renderQuestionBlock(q: any, idx: number) {
    const type = q.type || 'choice'; 
    const isOrdering = type === 'ordering';
    const options = q.options && q.options.length > 0 ? q.options : ['', ''];
    let optionsHtml = '';
    options.forEach((opt: string, optIdx: number) => {
        const isCorrect = q.correctAnswerIndex === optIdx;
        const selectorHtml = isOrdering ? `<div style="width: 24px; height: 24px; background: var(--bg-main); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; color: var(--text-secondary); font-size: 0.8rem; border: 1px solid var(--border-color);">${optIdx + 1}</div>` : `<input type="radio" name="radio-grp-qblock-${idx}" value="${optIdx}" ${isCorrect ? 'checked' : ''} style="width: 1.2rem; height: 1.2rem; accent-color: var(--accent-color); cursor: pointer;" title="Marcar como correcta">`;
        optionsHtml += `<div class="q-option-row" style="display:flex; gap:0.75rem; align-items:center; margin-bottom:0.75rem;">${selectorHtml}<input type="text" class="modern-input q-option-input" value="${opt}" placeholder="Opción ${optIdx + 1}" style="flex:1;"><button class="tertiary-btn remove-opt-btn" style="padding:0.4rem 0.6rem; border-color: transparent; color: var(--text-secondary);" title="Eliminar opción">✕</button></div>`;
    });
    const helperText = isOrdering ? "Introduzca las opciones en el <strong>ORDEN CORRECTO</strong>. Se barajarán automáticamente." : "Marque la casilla de la respuesta correcta.";
    return `<div class="editor-question-block" id="qblock-${idx}" style="background:var(--bg-card); padding:1.5rem; border:1px solid var(--border-color); border-radius:8px; position:relative; box-shadow: 0 1px 3px rgba(0,0,0,0.05);"><button class="tertiary-btn remove-q-btn" style="position:absolute; top:1rem; right:1rem; padding:0.3rem 0.6rem; font-size:0.8rem; border-color: var(--danger-color-bg); color: var(--danger-color);">Eliminar Pregunta</button><div style="margin-bottom: 1rem; display:flex; gap: 1rem; align-items:center; padding-right: 120px;"><span style="font-weight:bold; font-size:1rem; color: var(--accent-color-dark);">Pregunta ${idx + 1}</span><select class="modern-input q-type-select" style="width: auto; padding: 0.2rem 2rem 0.2rem 0.5rem; font-size: 0.85rem;"><option value="choice" ${!isOrdering ? 'selected' : ''}>Tipo Test</option><option value="ordering" ${isOrdering ? 'selected' : ''}>Ordenar Secuencia</option></select></div><textarea class="styled-textarea q-text-input" placeholder="Escriba el enunciado de la pregunta..." style="margin-bottom:1.5rem; font-weight:600; font-size: 1rem; padding: 0.75rem; min-height: 100px; resize: vertical;">${q.questionText}</textarea><div style="padding-left: 0.5rem;"><p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem; display: flex; align-items: center; gap: 0.5rem;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>${helperText}</p><div class="q-options-container">${optionsHtml}</div><button class="secondary-btn add-opt-btn" style="margin-top:0.5rem; font-size:0.8rem; padding: 0.4rem 0.8rem; border-style: dashed;">+ Añadir Opción</button></div></div>`;
}

function renderContent() {
    const container = document.getElementById('supervisor-content');
    if (!container) return;
    if (isLoading) { container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`; return; }
    if (currentTab === 'dashboard') { container.innerHTML = renderDashboardTab(); } else { container.innerHTML = renderAssignTab(); }
}

function attachEditorEvents(container: HTMLElement) {
    container.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.id === 'add-question-btn') { if (!generatedDrillData) return; generatedDrillData.questions.push({ type: 'choice', questionText: '', options: ['', ''], correctAnswerIndex: 0 }); renderContent(); }
        const removeQBtn = target.closest('.remove-q-btn'); if (removeQBtn) { if (!generatedDrillData) return; const block = removeQBtn.closest('.editor-question-block'); if (block) { const idx = parseInt(block.id.replace('qblock-', '')); generatedDrillData.questions.splice(idx, 1); renderContent(); } }
        const addOptBtn = target.closest('.add-opt-btn'); if (addOptBtn) { const block = addOptBtn.closest('.editor-question-block'); if (block && generatedDrillData) { const idx = parseInt(block.id.replace('qblock-', '')); generatedDrillData.questions[idx].options.push(''); renderContent(); } }
        const removeOptBtn = target.closest('.remove-opt-btn'); if (removeOptBtn) { const block = removeOptBtn.closest('.editor-question-block'); const row = removeOptBtn.closest('.q-option-row'); if (block && row && generatedDrillData) { const qIdx = parseInt(block.id.replace('qblock-', '')); const optsContainer = block.querySelector('.q-options-container'); if (optsContainer) { const optRows = Array.from(optsContainer.children); const optIdx = optRows.indexOf(row); if (optIdx > -1) { generatedDrillData.questions[qIdx].options.splice(optIdx, 1); renderContent(); } } } }
        if (target.id === 'select-all-users-btn') { if (selectedUserIds.length === usersStats.length) { selectedUserIds = []; } else { selectedUserIds = usersStats.map(u => u.id); } renderContent(); }
        const genBtn = target.closest('.gen-drill-btn'); if (genBtn) { const type = genBtn.getAttribute('data-type'); if(type) generateDrillPreview(type); }
        if (target.id === 'create-manual-btn') createManualDrill();
        if (target.id === 'confirm-assign-btn') assignDrill();
    });
    container.addEventListener('input', (e) => {
        const target = e.target as HTMLElement;
        if (generatedDrillData) {
            if (target.id === 'editor-scenario') { generatedDrillData.scenario = (target as HTMLTextAreaElement).value; }
            if (target.id === 'editor-drill-type') { generatedDrillData.type = (target as HTMLSelectElement).value; }
            if (target.classList.contains('q-text-input')) { const block = target.closest('.editor-question-block'); if (block) { const idx = parseInt(block.id.replace('qblock-', '')); generatedDrillData.questions[idx].questionText = (target as HTMLTextAreaElement | HTMLInputElement).value; } }
            if (target.classList.contains('q-option-input')) { const block = target.closest('.editor-question-block'); const row = target.closest('.q-option-row'); if (block && row) { const qIdx = parseInt(block.id.replace('qblock-', '')); const optsContainer = block.querySelector('.q-options-container'); if (optsContainer) { const optRows = Array.from(optsContainer.children); const optIdx = optRows.indexOf(row); if (optIdx > -1) { generatedDrillData.questions[qIdx].options[optIdx] = (target as HTMLInputElement).value; } } } }
        }
    });
    container.addEventListener('change', (e) => {
        const target = e.target as HTMLElement;
        if (generatedDrillData) {
            if (target.classList.contains('q-type-select')) { const block = target.closest('.editor-question-block'); if (block) { const idx = parseInt(block.id.replace('qblock-', '')); generatedDrillData.questions[idx].type = (target as HTMLSelectElement).value; renderContent(); } }
            if (target instanceof HTMLInputElement && target.type === 'radio' && target.name.startsWith('radio-grp-qblock-')) { const block = target.closest('.editor-question-block'); if (block) { const idx = parseInt(block.id.replace('qblock-', '')); generatedDrillData.questions[idx].correctAnswerIndex = parseInt(target.value); } }
        }
    });
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
    container.addEventListener('input', e => {
        const target = e.target as HTMLInputElement;
        if (target.id === 'dashboard-search') { dashboardFilter = target.value; renderContent(); }
    });
    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const tabBtn = target.closest('button[data-tab]');
        const sortTh = target.closest('th[data-sort]');
        if (sortTh) { const key = sortTh.getAttribute('data-sort')!; if (dashboardSort.key === key) dashboardSort.dir = dashboardSort.dir === 'asc' ? 'desc' : 'asc'; else { dashboardSort.key = key; dashboardSort.dir = 'desc'; } renderContent(); }
        if (tabBtn) { const newTab = tabBtn.getAttribute('data-tab') as any; if (newTab) { currentTab = newTab; container.querySelectorAll('.info-nav-btn').forEach(b => b.classList.remove('active')); tabBtn.classList.add('active'); renderContent(); } }
        const rangeBtn = target.closest('button[data-range]'); if (rangeBtn) { timeRange = rangeBtn.getAttribute('data-range') as '1M' | '1Y' | 'ALL'; renderContent(); }
        const userRow = target.closest('.user-row-interactive'); if (userRow) { const uid = parseInt(userRow.getAttribute('data-user-id')!); const user = usersStats.find(u => u.id === uid); if (user) renderUserDetailModal(user); }
        if (target.closest('#export-csv-btn')) exportToCSV();
    });
    container.addEventListener('change', e => {
        const target = e.target as HTMLInputElement;
        if (target.classList.contains('user-select-cb')) {
            const uid = parseInt(target.value);
            if (target.checked) selectedUserIds.push(uid); else selectedUserIds = selectedUserIds.filter(id => id !== uid);
            const allSelectedBtn = document.getElementById('select-all-users-btn'); if(allSelectedBtn) { const allSelected = usersStats.length > 0 && selectedUserIds.length === usersStats.length; allSelectedBtn.textContent = allSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos'; }
        }
    });
}
