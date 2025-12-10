
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
// generatedDrillData structure: { type: string, scenario: string, questions: [{ type: 'choice'|'ordering', questionText: string, options: string[], correctAnswerIndex?: number }] }
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
