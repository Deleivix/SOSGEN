
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
    };
    assigned_history: {
        status: string;
        score: number;
        max_score: number;
        created_at: string;
        drill_type?: string;
    }[] | null;
};

let usersStats: UserStat[] = [];
let selectedUserIds: number[] = [];
// generatedDrillData structure: { type: string, scenario: string, questions: [{ type: 'choice'|'ordering', questionText: string, options: string[], correctAnswerIndex?: number }] }
let generatedDrillData: any = null;
let isLoading = false;
let currentTab: 'dashboard' | 'assign' | 'history' = 'dashboard';

// --- DASHBOARD STATE ---
let dashboardFilter = "";
let dashboardSort: { key: string, dir: 'asc' | 'desc' } = { key: 'last_activity', dir: 'desc' };

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

function scrapeDrillDataFromEditor() {
    const editor = document.getElementById('drill-editor');
    if (!editor) return null;

    const scenarioInput = document.getElementById('editor-scenario') as HTMLTextAreaElement;
    const typeSelect = document.getElementById('editor-drill-type') as HTMLSelectElement;
    
    if (!scenarioInput.value.trim()) {
        showToast("El escenario no puede estar vacío", "error");
        return null;
    }

    const questions: any[] = [];
    const questionBlocks = editor.querySelectorAll('.editor-question-block');
    let isValid = true;

    questionBlocks.forEach((block) => {
        const qText = (block.querySelector('.q-text-input') as HTMLInputElement).value.trim();
        const qType = (block.querySelector('.q-type-select') as HTMLSelectElement).value;
        const optionsInputs = block.querySelectorAll('.q-option-input');
        
        if (!qText) { isValid = false; return; }

        const options: string[] = [];
        let correctAnswerIndex = 0;

        optionsInputs.forEach((input, idx) => {
            const val = (input as HTMLInputElement).value.trim();
            if (val) options.push(val);
            // Check if this option is selected as correct (only for choice type)
            const radio = block.querySelector(`input[name="radio-grp-${block.id}"]`) as HTMLInputElement; // simplistic check, logic below handles specific radio
        });

        if (options.length < 2) {
            showToast("Cada pregunta debe tener al menos 2 opciones.", "error");
            isValid = false;
            return;
        }

        if (qType === 'choice') {
            const checkedRadio = block.querySelector('input[type="radio"]:checked') as HTMLInputElement;
            if (!checkedRadio) {
                showToast("Marque la respuesta correcta en las preguntas tipo Test.", "error");
                isValid = false;
                return;
            }
            correctAnswerIndex = parseInt(checkedRadio.value);
        }
        // For 'ordering', the order in 'options' IS the correct order.

        questions.push({
            type: qType,
            questionText: qText,
            options: options,
            correctAnswerIndex: qType === 'choice' ? correctAnswerIndex : undefined
        });
    });

    if (!isValid) return null;
    if (questions.length === 0) {
        showToast("Añada al menos una pregunta.", "error");
        return null;
    }

    return {
        type: typeSelect ? typeSelect.value : 'manual',
        scenario: scenarioInput.value.trim(),
        questions: questions
    };
}

async function assignDrill() {
    const user = getCurrentUser();
    
    // Update data from the editor inputs before assigning
    const finalDrillData = scrapeDrillDataFromEditor();
    
    if (!user || !finalDrillData || selectedUserIds.length === 0) {
        if (selectedUserIds.length === 0) showToast("Seleccione al menos un usuario.", "error");
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
                drillType: finalDrillData.type,
                drillData: finalDrillData
            })
        });
        if (!response.ok) throw new Error('Failed to assign');
        showToast("Simulacro asignado correctamente.", "success");
        generatedDrillData = null; // Reset
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
        // Force refresh of the view to display the generated data
        renderContent();
    } catch (e) {
        showToast("Error generando simulacro", "error");
        container.innerHTML = `<p class="error">Error al generar.</p>`;
    }
}

function createManualDrill() {
    generatedDrillData = {
        type: 'manual',
        scenario: 'Escriba aquí el escenario del simulacro...',
        questions: [
            {
                type: 'choice',
                questionText: 'Pregunta 1...',
                options: ['Opción A', 'Opción B'],
                correctAnswerIndex: 0
            }
        ]
    };
    // Force refresh of the view to display the manual editor
    renderContent();
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

// --- HELPERS FOR DASHBOARD ---

function getKPI(u: UserStat): number {
    if (!u.personal_stats?.totalQuestions) return 0;
    return (u.personal_stats.totalCorrect! / u.personal_stats.totalQuestions!) * 100;
}

function getCompletedAssignedCount(u: UserStat): number {
    return (u.assigned_history || []).filter(a => a.status === 'COMPLETED').length;
}

function renderUserDetailModal(user: UserStat) {
    const modalId = `user-detail-modal-${user.id}`;
    if (document.getElementById(modalId)) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = modalId;

    // Calculate detailed stats
    const ps = user.personal_stats || {};
    const dscStats = ps.dsc || { correct: 0, questions: 0 };
    const voiceStats = ps.radiotelephony || { correct: 0, questions: 0 };
    
    const dscScore = dscStats.questions > 0 ? ((dscStats.correct / dscStats.questions) * 100).toFixed(0) : '-';
    const voiceScore = voiceStats.questions > 0 ? ((voiceStats.correct / voiceStats.questions) * 100).toFixed(0) : '-';
    const totalScore = ps.totalQuestions ? ((ps.totalCorrect! / ps.totalQuestions!) * 100).toFixed(0) : '-';

    // Assigned History
    const history = user.assigned_history || [];
    const historyHtml = history.length > 0 
        ? history.slice(0, 5).map(h => { // Last 5
            const isCompleted = h.status === 'COMPLETED';
            const statusColor = isCompleted ? 'var(--success-color)' : 'var(--warning-color)';
            const scoreDisplay = isCompleted ? `${h.score}/${h.max_score}` : '-';
            const typeDisplay = h.drill_type === 'dsc' ? 'DSC' : (h.drill_type === 'radiotelephony' ? 'Voz' : 'Manual');
            return `
                <tr style="font-size: 0.9rem;">
                    <td>${new Date(h.created_at).toLocaleDateString()}</td>
                    <td>${typeDisplay}</td>
                    <td><span style="color:${statusColor}; font-weight:700;">${h.status}</span></td>
                    <td style="text-align:right;">${scoreDisplay}</td>
                </tr>
            `;
        }).join('')
        : '<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--text-secondary);">Sin simulacros asignados recientes.</td></tr>';

    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 600px; text-align: left; padding: 2rem;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--border-color);">
                <div>
                    <h2 class="modal-title" style="margin:0; font-size:1.5rem;">${user.username}</h2>
                    <p style="margin:0; font-size:0.9rem; color:var(--text-secondary);">${user.email}</p>
                </div>
                <button class="secondary-btn modal-close-btn" style="padding:0.4rem 0.8rem;">✕</button>
            </div>

            <div class="user-detail-stats">
                <div class="user-detail-stat-item">
                    <div class="user-detail-stat-val" style="color:var(--accent-color-dark);">${totalScore}%</div>
                    <div class="user-detail-stat-lbl">Media Global</div>
                </div>
                <div class="user-detail-stat-item">
                    <div class="user-detail-stat-val">${dscScore}%</div>
                    <div class="user-detail-stat-lbl">Técnica DSC</div>
                </div>
                <div class="user-detail-stat-item">
                    <div class="user-detail-stat-val">${voiceScore}%</div>
                    <div class="user-detail-stat-lbl">Voz / Fonía</div>
                </div>
            </div>

            <h3 class="reference-table-subtitle" style="margin-top:0;">Últimas Asignaciones</h3>
            <div class="table-wrapper" style="margin-bottom:2rem;">
                <table class="reference-table">
                    <thead>
                        <tr><th>Fecha</th><th>Tipo</th><th>Estado</th><th style="text-align:right;">Nota</th></tr>
                    </thead>
                    <tbody>${historyHtml}</tbody>
                </table>
            </div>

            <div style="text-align:right;">
                <button class="primary-btn quick-assign-btn" data-user-id="${user.id}">Asignar Nuevo Simulacro</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    modalOverlay.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === modalOverlay || target.closest('.modal-close-btn')) {
            modalOverlay.remove();
        }
        
        const assignBtn = target.closest('.quick-assign-btn');
        if (assignBtn) {
            modalOverlay.remove();
            // Switch to assign tab and select this user
            const uid = parseInt(assignBtn.getAttribute('data-user-id')!);
            selectedUserIds = [uid];
            currentTab = 'assign';
            renderContent();
            const tabBtn = document.querySelector('button[data-tab="assign"]');
            if(tabBtn) (tabBtn as HTMLElement).click();
        }
    });
}

function renderAnalyticsSection() {
    // 1. Completion Rate (Donut)
    let totalAssigned = 0;
    let totalCompleted = 0;
    usersStats.forEach(u => {
        const history = u.assigned_history || [];
        totalAssigned += history.length;
        totalCompleted += history.filter(h => h.status === 'COMPLETED').length;
    });
    
    const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;
    const circumference = 2 * Math.PI * 16; // r=16 -> ~100
    const offset = circumference - (completionRate / 100) * circumference;

    // 2. Global Category Performance (Bars)
    let totalDscQ = 0, totalDscC = 0;
    let totalVoiceQ = 0, totalVoiceC = 0;
    
    usersStats.forEach(u => {
        const ps = u.personal_stats || {};
        if (ps.dsc) { totalDscQ += ps.dsc.questions; totalDscC += ps.dsc.correct; }
        if (ps.radiotelephony) { totalVoiceQ += ps.radiotelephony.questions; totalVoiceC += ps.radiotelephony.correct; }
    });
    
    const avgDsc = totalDscQ > 0 ? (totalDscC / totalDscQ) * 100 : 0;
    const avgVoice = totalVoiceQ > 0 ? (totalVoiceC / totalVoiceQ) * 100 : 0;

    return `
        <div class="supervisor-charts-row">
            <div class="chart-card">
                <div class="chart-title">Estado de Asignaciones</div>
                <div class="donut-chart-container">
                    <svg class="donut-chart-svg" viewBox="0 0 36 36">
                        <path class="donut-segment donut-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="donut-segment donut-value" stroke-dasharray="${completionRate}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div class="donut-center-text">
                        <div class="donut-center-value">${Math.round(completionRate)}%</div>
                        <div class="donut-center-label">Completado</div>
                    </div>
                </div>
                <div style="margin-top:1rem; font-size:0.8rem; color:var(--text-secondary);">
                    ${totalCompleted} de ${totalAssigned} simulacros
                </div>
            </div>

            <div class="chart-card">
                <div class="chart-title">Rendimiento Global por Categoría</div>
                <div class="bar-chart-container">
                    <div class="bar-row">
                        <div class="bar-label-row"><span>DSC (Técnica)</span><span>${avgDsc.toFixed(1)}%</span></div>
                        <div class="bar-track"><div class="bar-fill" style="width: ${avgDsc}%;"></div></div>
                    </div>
                    <div class="bar-row">
                        <div class="bar-label-row"><span>Radiotelefonía (Voz)</span><span>${avgVoice.toFixed(1)}%</span></div>
                        <div class="bar-track"><div class="bar-fill" style="width: ${avgVoice}%; background-color: var(--info-color);"></div></div>
                    </div>
                </div>
                <div style="margin-top:auto; padding-top:1rem; font-size:0.8rem; color:var(--text-secondary); text-align:center;">
                    Media de todos los usuarios activos
                </div>
            </div>
        </div>
    `;
}

// --- RENDER FUNCTIONS ---

function renderDashboardTab() {
    // 1. FILTERING
    let filteredUsers = usersStats;
    if (dashboardFilter) {
        const term = dashboardFilter.toLowerCase();
        filteredUsers = usersStats.filter(u => 
            u.username.toLowerCase().includes(term) || 
            u.email.toLowerCase().includes(term)
        );
    }

    // 2. SORTING
    filteredUsers.sort((a, b) => {
        let valA: any, valB: any;
        
        switch(dashboardSort.key) {
            case 'kpi':
                valA = getKPI(a);
                valB = getKPI(b);
                break;
            case 'assigned':
                valA = getCompletedAssignedCount(a);
                valB = getCompletedAssignedCount(b);
                break;
            case 'last_activity':
                valA = a.last_activity ? new Date(a.last_activity).getTime() : 0;
                valB = b.last_activity ? new Date(b.last_activity).getTime() : 0;
                break;
            default: // username, email
                valA = (a as any)[dashboardSort.key] || '';
                valB = (b as any)[dashboardSort.key] || '';
        }

        if (valA < valB) return dashboardSort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return dashboardSort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    const totalDrills = usersStats.reduce((acc, u) => acc + (u.personal_stats?.totalDrills || 0), 0);
    const totalAssigned = usersStats.reduce((acc, u) => acc + (u.assigned_history?.length || 0), 0);
    
    // Sort Icon Helper
    const sortIcon = (key: string) => {
        if (dashboardSort.key !== key) return '<span style="opacity:0.3; margin-left:5px;">↕</span>';
        return dashboardSort.dir === 'asc' ? '<span style="color:var(--accent-color); margin-left:5px;">↑</span>' : '<span style="color:var(--accent-color); margin-left:5px;">↓</span>';
    };

    return `
        ${renderAnalyticsSection()}

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

        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <input type="text" id="dashboard-search" class="filter-input" placeholder="Filtrar por nombre o email..." value="${dashboardFilter}" style="width: 300px; margin-bottom: 0;">
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                ${filteredUsers.length} resultados
            </div>
        </div>

        <div class="table-wrapper">
            <table class="reference-table">
                <thead>
                    <tr>
                        <th style="cursor:pointer;" data-sort="username">Usuario ${sortIcon('username')}</th>
                        <th style="cursor:pointer;" data-sort="email">Email ${sortIcon('email')}</th>
                        <th style="cursor:pointer;" data-sort="last_activity">Última Actividad ${sortIcon('last_activity')}</th>
                        <th style="cursor:pointer; text-align:center;" data-sort="kpi">KPI Personal ${sortIcon('kpi')}</th>
                        <th style="cursor:pointer; text-align:center;" data-sort="assigned">Asignados (Comp/Tot) ${sortIcon('assigned')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredUsers.map(u => {
                        const pAvg = getKPI(u);
                        const hasData = !!u.personal_stats?.totalQuestions;
                        
                        // KPI Badge Logic
                        let kpiColor = 'var(--text-secondary)';
                        if (hasData) {
                            if (pAvg >= 70) kpiColor = 'var(--accent-color)'; // Green
                            else if (pAvg >= 50) kpiColor = 'var(--warning-color)'; // Yellow
                            else kpiColor = 'var(--danger-color)'; // Red
                        }

                        // Inactivity Logic
                        const lastActDate = u.last_activity ? new Date(u.last_activity) : null;
                        const daysInactive = lastActDate ? Math.floor((Date.now() - lastActDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
                        const inactiveWarning = daysInactive > 15 ? `<span title="Inactivo > 15 días" style="color:var(--danger-color); font-weight:bold; margin-left:0.5rem;">⚠</span>` : '';

                        const assigned = u.assigned_history || [];
                        const completed = assigned.filter(a => a.status === 'COMPLETED').length;
                        
                        return `
                            <tr class="user-row-interactive" data-user-id="${u.id}" style="cursor: pointer;">
                                <td>${u.username}</td>
                                <td>${u.email}</td>
                                <td>
                                    ${u.last_activity ? new Date(u.last_activity).toLocaleDateString() : '-'}
                                    ${inactiveWarning}
                                </td>
                                <td style="text-align:center;">
                                    ${hasData 
                                        ? `<span style="font-weight:700; color:${kpiColor};">${pAvg.toFixed(0)}%</span>` 
                                        : '-'
                                    }
                                </td>
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

    let editorHtml = '<div class="drill-placeholder" style="padding: 2rem;">Genere un simulacro o cree uno manual para editarlo.</div>';
    
    if (generatedDrillData) {
        editorHtml = `
            <div id="drill-editor" style="background:var(--bg-main); padding:1.5rem; border:1px solid var(--border-color); border-radius:8px; margin-bottom:1rem;">
                <div style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center;">
                    <label style="font-weight: bold; font-size: 0.9rem;">Tipo General:</label>
                    <select id="editor-drill-type" class="modern-input" style="width: auto; padding: 0.3rem;">
                        <option value="dsc" ${generatedDrillData.type === 'dsc' ? 'selected' : ''}>Alerta DSC</option>
                        <option value="radiotelephony" ${generatedDrillData.type === 'radiotelephony' ? 'selected' : ''}>Radiotelefonía</option>
                        <option value="manual" ${generatedDrillData.type === 'manual' ? 'selected' : ''}>Manual / Otro</option>
                    </select>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="font-weight: bold; display: block; margin-bottom: 0.5rem;">Escenario:</label>
                    <textarea id="editor-scenario" class="styled-textarea" style="min-height: 100px;">${generatedDrillData.scenario}</textarea>
                </div>

                <div id="editor-questions-container">
                    ${generatedDrillData.questions.map((q: any, idx: number) => renderQuestionBlock(q, idx)).join('')}
                </div>

                <button id="add-question-btn" class="secondary-btn" style="width: 100%; margin-top: 1rem; border-style: dashed;">+ Añadir Pregunta</button>
            </div>
            <button id="confirm-assign-btn" class="primary-btn">Confirmar y Enviar a Seleccionados</button>
        `;
    }

    return `
        <div style="display:grid; grid-template-columns: 300px 1fr; gap:2rem;">
            <div style="border:1px solid var(--border-color); border-radius:8px; height:600px; display:flex; flex-direction:column;">
                <div style="padding:1rem; border-bottom:1px solid var(--border-color); font-weight:bold; background:var(--bg-card);">Seleccionar Usuarios</div>
                <div style="overflow-y:auto; flex-grow:1; background:var(--bg-main);">
                    ${userListHtml}
                </div>
            </div>
            <div>
                <div style="margin-bottom:2rem;">
                    <h3 class="reference-table-subtitle" style="margin-top:0;">Origen del Simulacro</h3>
                    <div style="display:flex; gap:1rem; flex-wrap: wrap;">
                        <button class="secondary-btn gen-drill-btn" data-type="dsc">Generar DSC (IA)</button>
                        <button class="secondary-btn gen-drill-btn" data-type="radiotelephony">Generar Voz (IA)</button>
                        <button id="create-manual-btn" class="secondary-btn" style="border-color: var(--accent-color); color: var(--accent-color-dark);">Crear Manualmente</button>
                    </div>
                </div>
                <div id="drill-preview-area">
                    ${editorHtml}
                </div>
            </div>
        </div>
    `;
}

function renderQuestionBlock(q: any, idx: number) {
    // q.type can be 'choice' (default) or 'ordering'
    const type = q.type || 'choice'; 
    const isOrdering = type === 'ordering';
    
    let optionsHtml = '';
    
    // Ensure we have at least 2 options slots if empty
    const options = q.options && q.options.length > 0 ? q.options : ['', ''];

    options.forEach((opt: string, optIdx: number) => {
        const isCorrect = q.correctAnswerIndex === optIdx;
        
        // For Ordering: No radio button. The order IS the answer.
        // For Choice: Radio button to mark correct.
        
        const selectorHtml = isOrdering 
            ? `<span style="font-weight:bold; color:var(--text-secondary); padding:0 0.5rem;">${optIdx + 1}</span>`
            : `<input type="radio" name="radio-grp-qblock-${idx}" value="${optIdx}" ${isCorrect ? 'checked' : ''} title="Marcar como correcta">`;

        optionsHtml += `
            <div class="q-option-row" style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
                ${selectorHtml}
                <input type="text" class="modern-input q-option-input" value="${opt}" placeholder="Opción ${optIdx + 1}">
                <button class="tertiary-btn remove-opt-btn" style="padding:0.2rem 0.5rem;">✕</button>
            </div>
        `;
    });

    // Helper text
    const helperText = isOrdering 
        ? "Introduzca las opciones en el <strong>ORDEN CORRECTO</strong>. Se barajarán automáticamente al usuario." 
        : "Marque la casilla redonda de la respuesta correcta.";

    return `
        <div class="editor-question-block" id="qblock-${idx}" style="background:var(--bg-card); padding:1rem; border:1px solid var(--border-color); border-radius:6px; margin-bottom:1rem; position:relative;">
            <button class="tertiary-btn remove-q-btn" style="position:absolute; top:0.5rem; right:0.5rem; padding:0.2rem 0.5rem; font-size:0.8rem;">Eliminar Pregunta</button>
            
            <div style="margin-bottom: 0.5rem; display:flex; justify-content:space-between; align-items:center; padding-right: 80px;">
                <label style="font-weight:bold; font-size:0.9rem;">Pregunta ${idx + 1}</label>
                <select class="modern-input q-type-select" style="width: auto; padding: 0.2rem; font-size: 0.8rem;">
                    <option value="choice" ${!isOrdering ? 'selected' : ''}>Tipo Test (Selección)</option>
                    <option value="ordering" ${isOrdering ? 'selected' : ''}>Ordenar Secuencia</option>
                </select>
            </div>
            
            <input type="text" class="modern-input q-text-input" value="${q.questionText}" placeholder="Texto de la pregunta" style="margin-bottom:1rem; font-weight:500;">
            
            <div style="background: var(--bg-main); padding: 0.5rem; border-radius: 4px;">
                <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.5rem;">${helperText}</p>
                <div class="q-options-container">
                    ${optionsHtml}
                </div>
                <button class="secondary-btn add-opt-btn" style="width:100%; padding:0.3rem; margin-top:0.5rem; font-size:0.8rem;">+ Añadir Opción</button>
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

// --- DYNAMIC EDITOR EVENTS ---
function attachEditorEvents(container: HTMLElement) {
    
    // Add Question
    container.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.id === 'add-question-btn') {
            const container = document.getElementById('editor-questions-container');
            if (!container) return;
            const idx = container.children.length;
            const emptyQ = { type: 'choice', questionText: '', options: ['', ''], correctAnswerIndex: 0 };
            container.insertAdjacentHTML('beforeend', renderQuestionBlock(emptyQ, idx));
        }
        
        // Remove Question
        if (target.classList.contains('remove-q-btn')) {
            target.closest('.editor-question-block')?.remove();
        }

        // Add Option
        if (target.classList.contains('add-opt-btn')) {
            const block = target.closest('.editor-question-block');
            const optsContainer = block?.querySelector('.q-options-container');
            if (!block || !optsContainer) return;
            
            const currentOpts = optsContainer.querySelectorAll('.q-option-row').length;
            if (currentOpts >= 4) {
                showToast("Máximo 4 opciones por pregunta.", "info");
                return;
            }
            
            const isOrdering = (block.querySelector('.q-type-select') as HTMLSelectElement).value === 'ordering';
            const idx = block.id.replace('qblock-', '');
            const newOptIdx = currentOpts;
            
            const selectorHtml = isOrdering 
            ? `<span style="font-weight:bold; color:var(--text-secondary); padding:0 0.5rem;">${newOptIdx + 1}</span>`
            : `<input type="radio" name="radio-grp-qblock-${idx}" value="${newOptIdx}" title="Marcar como correcta">`;

            const html = `
                <div class="q-option-row" style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
                    ${selectorHtml}
                    <input type="text" class="modern-input q-option-input" placeholder="Opción ${newOptIdx + 1}">
                    <button class="tertiary-btn remove-opt-btn" style="padding:0.2rem 0.5rem;">✕</button>
                </div>
            `;
            optsContainer.insertAdjacentHTML('beforeend', html);
        }

        // Remove Option
        if (target.classList.contains('remove-opt-btn')) {
            const row = target.closest('.q-option-row');
            const container = target.closest('.q-options-container');
            if (row && container) {
                // Prevent having less than 2 options
                if (container.querySelectorAll('.q-option-row').length <= 2) {
                    showToast("Mínimo 2 opciones.", "info");
                    return;
                }
                row.remove();
                // Re-index remaining options (important for ordering numbers and radio values)
                const block = container.closest('.editor-question-block');
                if (block) refreshOptionsIndices(block as HTMLElement);
            }
        }
    });

    // Change Question Type
    container.addEventListener('change', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('q-type-select')) {
            const block = target.closest('.editor-question-block') as HTMLElement;
            if (block) refreshOptionsIndices(block);
        }
    });
}

function refreshOptionsIndices(block: HTMLElement) {
    const isOrdering = (block.querySelector('.q-type-select') as HTMLSelectElement).value === 'ordering';
    const rows = block.querySelectorAll('.q-option-row');
    const idx = block.id.replace('qblock-', '');
    
    // Update helper text
    const p = block.querySelector('p');
    if (p) {
        p.innerHTML = isOrdering 
            ? "Introduzca las opciones en el <strong>ORDEN CORRECTO</strong>. Se barajarán automáticamente al usuario." 
            : "Marque la casilla redonda de la respuesta correcta.";
    }

    rows.forEach((row, i) => {
        // Remove first child (selector) and re-insert correct one
        row.firstElementChild?.remove();
        
        const selectorHtml = isOrdering 
            ? `<span style="font-weight:bold; color:var(--text-secondary); padding:0 0.5rem;">${i + 1}</span>`
            : `<input type="radio" name="radio-grp-qblock-${idx}" value="${i}" ${i === 0 ? 'checked' : ''} title="Marcar como correcta">`;
        
        row.insertAdjacentHTML('afterbegin', selectorHtml);
        
        // Update placeholder
        const input = row.querySelector('.q-option-input') as HTMLInputElement;
        if (input) input.placeholder = `Opción ${i + 1}`;
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

    // --- NEW EVENT LISTENERS ---
    container.addEventListener('input', e => {
        const target = e.target as HTMLInputElement;
        if (target.id === 'dashboard-search') {
            dashboardFilter = target.value;
            renderContent();
        }
    });

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const tabBtn = target.closest('button[data-tab]');
        
        // Sorting Handler
        const sortTh = target.closest('th[data-sort]');
        if (sortTh) {
            const key = sortTh.getAttribute('data-sort')!;
            if (dashboardSort.key === key) {
                dashboardSort.dir = dashboardSort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                dashboardSort.key = key;
                dashboardSort.dir = 'desc'; // Default desc for new columns
            }
            renderContent();
        }
        
        // Tab switching
        if (tabBtn) {
            const newTab = tabBtn.getAttribute('data-tab') as any;
            if (newTab) {
                currentTab = newTab;
                container.querySelectorAll('.info-nav-btn').forEach(b => b.classList.remove('active'));
                tabBtn.classList.add('active');
                renderContent();
            }
        }

        // Row Click Handler (for User Detail Modal)
        const userRow = target.closest('.user-row-interactive');
        if (userRow) {
            const uid = parseInt(userRow.getAttribute('data-user-id')!);
            const user = usersStats.find(u => u.id === uid);
            if (user) renderUserDetailModal(user);
        }

        if (target.id === 'export-csv-btn') exportToCSV();
        
        if (target.classList.contains('gen-drill-btn')) {
            const type = target.getAttribute('data-type');
            if(type) generateDrillPreview(type);
        }

        if (target.id === 'create-manual-btn') {
            createManualDrill();
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
