
import { getCurrentUser } from "../utils/auth";
import { showToast, initializeInfoTabs } from "../utils/helpers";

let myDrills: any[] = [];
let allDrills: any[] = [];
let users: any[] = [];
let assignments: any[] = [];
let currentBuilderQuestions: any[] = []; // State for the drill builder

async function apiCall(action: string, body?: any) {
    const user = getCurrentUser();
    if (!user) return;
    const method = body ? 'POST' : 'GET';
    const response = await fetch(`/api/simulacro?action=${action}&username=${user.username}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) throw new Error('API Error');
    return response.json();
}

async function loadData() {
    try {
        allDrills = await apiCall('get_drills');
        users = await apiCall('get_users');
        assignments = await apiCall('get_assignments_supervisor');
        renderTabs(); // Refresh tabs with new data
    } catch (e) { showToast('Error cargando datos', 'error'); }
}

// --- DRILL BUILDER LOGIC ---

function addQuestion(type: 'TEST' | 'TEXT' | 'ORDER') {
    const newQ = {
        type,
        questionText: '',
        options: type === 'TEXT' ? [] : ['', '', ''],
        correctAnswer: type === 'ORDER' ? [0, 1, 2] : 0, // Default correct indices
        feedback: ''
    };
    currentBuilderQuestions.push(newQ);
    renderBuilderQuestions();
}

function removeQuestion(index: number) {
    currentBuilderQuestions.splice(index, 1);
    renderBuilderQuestions();
}

function updateQuestion(index: number, field: string, value: any) {
    currentBuilderQuestions[index][field] = value;
}

function updateOption(qIndex: number, optIndex: number, value: string) {
    currentBuilderQuestions[qIndex].options[optIndex] = value;
}

function renderBuilderQuestions() {
    const container = document.getElementById('builder-questions-container');
    if (!container) return;

    if (currentBuilderQuestions.length === 0) {
        container.innerHTML = `<p class="drill-placeholder">No hay preguntas añadidas. Utiliza los botones de abajo para añadir.</p>`;
        return;
    }

    container.innerHTML = currentBuilderQuestions.map((q, i) => `
        <div class="question-block" style="background: var(--bg-card); position: relative;">
            <button type="button" class="tertiary-btn" style="position: absolute; top: 10px; right: 10px; padding: 2px 8px;" onclick="(window as any).removeBuilderQuestion(${i})">Eliminar</button>
            
            <div class="form-group">
                <label>Pregunta ${i + 1} (${q.type === 'TEST' ? 'Tipo Test' : q.type === 'ORDER' ? 'Ordenar' : 'Texto Libre'})</label>
                <input class="simulator-input" value="${q.questionText}" placeholder="Enunciado de la pregunta..." onchange="(window as any).updateBuilderQuestion(${i}, 'questionText', this.value)">
            </div>

            ${q.type !== 'TEXT' ? `
                <div class="form-group">
                    <label>Opciones</label>
                    ${q.options.map((opt: string, optIdx: number) => `
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;">
                            ${q.type === 'TEST' ? `<input type="radio" name="correct-${i}" ${q.correctAnswer == optIdx ? 'checked' : ''} onchange="(window as any).updateBuilderQuestion(${i}, 'correctAnswer', ${optIdx})">` : `<span style="font-family: monospace;">${optIdx + 1}.</span>`}
                            <input class="simulator-input" value="${opt}" placeholder="Opción ${optIdx + 1}" onchange="(window as any).updateBuilderOption(${i}, ${optIdx}, this.value)">
                        </div>
                    `).join('')}
                    ${q.type === 'ORDER' ? `<small style="color: var(--text-secondary);">Introduce la secuencia correcta arriba (1 arriba, 3 abajo). El sistema las desordenará al usuario.</small>` : ''}
                </div>
            ` : `<div class="form-group"><label>Respuesta Esperada (Palabras Clave)</label><input class="simulator-input" value="${q.correctAnswer || ''}" placeholder="Palabras clave para corrección manual..." onchange="(window as any).updateBuilderQuestion(${i}, 'correctAnswer', this.value)"></div>`}

            <div class="form-group">
                <label>Explicación / Feedback</label>
                <input class="simulator-input" value="${q.feedback || ''}" placeholder="Explicación que verá el usuario..." onchange="(window as any).updateBuilderQuestion(${i}, 'feedback', this.value)">
            </div>
        </div>
    `).join('');
}

// Expose helpers to window for inline events
(window as any).removeBuilderQuestion = removeQuestion;
(window as any).updateBuilderQuestion = updateQuestion;
(window as any).updateBuilderOption = updateOption;


async function createDrill(e: Event) {
    e.preventDefault();
    const title = (document.getElementById('drill-title') as HTMLInputElement).value;
    const scenario = (document.getElementById('drill-scenario') as HTMLTextAreaElement).value;
    
    if (currentBuilderQuestions.length === 0) {
        showToast('Añade al menos una pregunta', 'error');
        return;
    }

    try {
        await apiCall('create_drill', { title, scenario, questions: currentBuilderQuestions });
        showToast('Simulacro creado', 'success');
        (e.target as HTMLFormElement).reset();
        currentBuilderQuestions = [];
        renderBuilderQuestions();
        loadData();
    } catch (e) {
        showToast('Error al crear', 'error');
    }
}

async function generateAiDrill() {
    const btn = document.getElementById('ai-generate-btn') as HTMLButtonElement;
    const loadingOverlay = document.getElementById('ai-loading-overlay');
    
    if(btn) btn.disabled = true;
    if(loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const data = await apiCall('generate_ai_drill', {});
        
        const titleInput = document.getElementById('drill-title') as HTMLInputElement;
        const scenarioInput = document.getElementById('drill-scenario') as HTMLTextAreaElement;

        if (titleInput) titleInput.value = data.title || '';
        if (scenarioInput) scenarioInput.value = data.scenario || '';
        
        if (data.questions && Array.isArray(data.questions)) {
            currentBuilderQuestions = data.questions;
            renderBuilderQuestions();
        }
        
        showToast('Generado con IA', 'success');
    } catch(e) {
        showToast('Error al generar con IA', 'error');
    } finally {
        if(btn) btn.disabled = false;
        if(loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

async function assignDrill(e: Event) {
    e.preventDefault();
    const drillSelect = document.getElementById('assign-drill-select') as HTMLSelectElement;
    const userSelect = document.getElementById('assign-user-select') as HTMLSelectElement;
    
    const drillId = drillSelect.value;
    const selectedUsers = Array.from(userSelect.selectedOptions).map(o => o.value);
    
    if (!drillId || selectedUsers.length === 0) {
        showToast('Seleccione simulacro y usuarios', 'error');
        return;
    }

    let targetUsers: any = selectedUsers;
    if (selectedUsers.includes('ALL')) targetUsers = 'ALL';
    
    await apiCall('assign_drill', { drillId, targetUsers });
    showToast('Asignado correctamente', 'success');
    loadData();
}

function exportToCSV() {
    const rows = [['ID', 'Drill', 'Usuario', 'Estado', 'Puntuación', 'Fecha']];
    assignments.forEach(a => {
        rows.push([
            a.id, a.title, a.username, a.status, 
            `${a.score || 0}/${a.max_score || 0}`, 
            a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '-'
        ]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_simulacros.csv");
    document.body.appendChild(link);
    link.click();
}

function renderTabs() {
    const createTab = document.getElementById('tab-create');
    const assignTab = document.getElementById('tab-assign');
    const monitorTab = document.getElementById('tab-monitor');

    if (createTab) {
        // Only render if empty to preserve builder state during tab switches if desired, 
        // OR re-render if we want fresh state. Here we re-render static parts but keep dynamic.
        if (!createTab.innerHTML) {
            createTab.innerHTML = `
                <div id="ai-loading-overlay" style="display: none; position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.7); z-index: 10; justify-content: center; align-items: center; flex-direction: column; color: white; border-radius: 12px;">
                    <div class="loader" style="border-color: rgba(255,255,255,0.2); border-top-color: var(--accent-color);"></div>
                    <p style="margin-top: 1rem;">Generando escenario CCR con IA...</p>
                </div>
                <form id="create-drill-form" style="position: relative;">
                    <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; justify-content: flex-end;">
                        <button type="button" id="ai-generate-btn" class="secondary-btn" style="width: auto;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z"/><path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5"/></svg>
                            Generar Caso con IA
                        </button>
                    </div>
                    <div class="form-group">
                        <label>Título</label>
                        <input id="drill-title" class="simulator-input" required placeholder="Título del simulacro">
                    </div>
                    <div class="form-group">
                        <label>Escenario</label>
                        <textarea id="drill-scenario" class="styled-textarea" rows="4" required placeholder="Descripción del escenario..."></textarea>
                    </div>
                    
                    <div class="form-divider"><span>Preguntas</span></div>
                    
                    <div id="builder-questions-container" style="display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 1.5rem;"></div>

                    <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem;">
                        <button type="button" class="secondary-btn" onclick="addQuestion('TEST')">+ Test (A/B/C)</button>
                        <button type="button" class="secondary-btn" onclick="addQuestion('TEXT')">+ Texto Abierto</button>
                        <button type="button" class="secondary-btn" onclick="addQuestion('ORDER')">+ Ordenar</button>
                    </div>

                    <button type="submit" class="primary-btn">Guardar Simulacro</button>
                </form>
            `;
            
            // Re-attach listeners manually since innerHTML wiped them
            (window as any).addQuestion = addQuestion; 
            document.getElementById('create-drill-form')?.addEventListener('submit', createDrill);
            document.getElementById('ai-generate-btn')?.addEventListener('click', generateAiDrill);
            renderBuilderQuestions(); // Render initial state (empty)
        }
    }

    if (assignTab) {
        assignTab.innerHTML = `
            <form id="assign-drill-form">
                <div class="form-group">
                    <label>Simulacro</label>
                    <select id="assign-drill-select" class="simulator-input">
                        ${allDrills.length > 0 ? allDrills.map(d => `<option value="${d.id}">${d.title}</option>`).join('') : '<option disabled>No hay simulacros disponibles</option>'}
                    </select>
                </div>
                <div class="form-group">
                    <label>Usuarios</label>
                    <select id="assign-user-select" class="simulator-input" multiple style="height: 150px;">
                        <option value="ALL">TODOS LOS USUARIOS</option>
                        ${users.map(u => `<option value="${u.id}">${u.username}</option>`).join('')}
                    </select>
                    <small style="display: block; margin-top: 0.5rem; color: var(--text-secondary);">Mantén presionado Ctrl (o Cmd) para seleccionar múltiples usuarios.</small>
                </div>
                <button type="submit" class="primary-btn">Asignar</button>
            </form>
        `;
        document.getElementById('assign-drill-form')?.addEventListener('submit', assignDrill);
    }

    if (monitorTab) {
        monitorTab.innerHTML = `
            <div style="margin-bottom: 1rem; text-align: right;">
                <button id="export-csv-btn" class="secondary-btn">Exportar CSV</button>
            </div>
            <div class="table-wrapper">
                <table class="reference-table">
                    <thead><tr><th>Usuario</th><th>Simulacro</th><th>Estado</th><th>Nota</th><th>Fecha</th></tr></thead>
                    <tbody>
                        ${assignments.length > 0 ? assignments.map(a => `
                            <tr>
                                <td>${a.username}</td>
                                <td>${a.title}</td>
                                <td><span class="category-badge ${a.status === 'COMPLETED' ? 'green' : 'orange'}">${a.status}</span></td>
                                <td>${a.score}/${a.max_score}</td>
                                <td>${a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '-'}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 1rem;">No hay asignaciones registradas.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('export-csv-btn')?.addEventListener('click', exportToCSV);
    }
}

export function renderSupervisorPage(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Panel de Supervisor</h2>
            <div class="info-nav-tabs">
                <button class="info-nav-btn active" data-target="tab-create">Crear Simulacro</button>
                <button class="info-nav-btn" data-target="tab-assign">Asignar</button>
                <button class="info-nav-btn" data-target="tab-monitor">Seguimiento</button>
            </div>
            <div id="tab-create" class="sub-tab-panel active"></div>
            <div id="tab-assign" class="sub-tab-panel"></div>
            <div id="tab-monitor" class="sub-tab-panel"></div>
        </div>
    `;
    initializeInfoTabs(container);
    
    // Add specific listener to reload data when switching tabs inside supervisor
    container.querySelector('.info-nav-tabs')?.addEventListener('click', (e) => {
        if((e.target as HTMLElement).classList.contains('info-nav-btn')) {
            loadData();
        }
    });

    loadData();
}
