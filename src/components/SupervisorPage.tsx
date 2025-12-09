import { getCurrentUser } from "../utils/auth";
import { showToast, initializeInfoTabs } from "../utils/helpers";

let myDrills: any[] = [];
let allDrills: any[] = [];
let users: any[] = [];
let assignments: any[] = [];

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
        renderTabs();
    } catch (e) { showToast('Error cargando datos', 'error'); }
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

async function createDrill(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.querySelector('#drill-title') as HTMLInputElement).value;
    const scenario = (form.querySelector('#drill-scenario') as HTMLTextAreaElement).value;
    const questionsStr = (form.querySelector('#drill-questions') as HTMLTextAreaElement).value;
    
    try {
        const questions = JSON.parse(questionsStr);
        await apiCall('create_drill', { title, scenario, questions });
        showToast('Simulacro creado', 'success');
        form.reset();
        loadData();
    } catch (e) {
        showToast('JSON de preguntas inválido', 'error');
    }
}

async function generateAiDrill() {
    const btn = document.getElementById('ai-generate-btn') as HTMLButtonElement;
    if(btn) btn.disabled = true;
    try {
        showToast('Generando con IA...', 'info');
        // Sending empty body to force POST method
        const data = await apiCall('generate_ai_drill', {});
        
        const titleInput = document.getElementById('drill-title') as HTMLInputElement;
        const scenarioInput = document.getElementById('drill-scenario') as HTMLTextAreaElement;
        const questionsInput = document.getElementById('drill-questions') as HTMLTextAreaElement;

        if (titleInput) titleInput.value = data.title || '';
        if (scenarioInput) scenarioInput.value = data.scenario || '';
        if (questionsInput) questionsInput.value = JSON.stringify(data.questions || [], null, 2);
        
        showToast('Generado', 'success');
    } catch(e) {
        showToast('Error al generar con IA', 'error');
    } finally {
        if(btn) btn.disabled = false;
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

function renderTabs() {
    const createTab = document.getElementById('tab-create');
    const assignTab = document.getElementById('tab-assign');
    const monitorTab = document.getElementById('tab-monitor');

    if (createTab) {
        createTab.innerHTML = `
            <form id="create-drill-form">
                <div class="form-group">
                    <label>Título</label>
                    <input id="drill-title" class="simulator-input" required placeholder="Título del simulacro">
                </div>
                <div class="form-group">
                    <label>Escenario</label>
                    <textarea id="drill-scenario" class="styled-textarea" rows="4" required placeholder="Descripción del escenario..."></textarea>
                </div>
                <div class="form-group">
                    <label>Preguntas (JSON)</label>
                    <textarea id="drill-questions" class="styled-textarea" rows="6" placeholder='[{"questionText": "...", "options": ["..."], "correctAnswerIndex": 0, "feedback": "..."}]' required></textarea>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button type="submit" class="primary-btn">Crear Simulacro</button>
                    <button type="button" id="ai-generate-btn" class="secondary-btn">Generar con IA</button>
                </div>
            </form>
        `;
        document.getElementById('create-drill-form')?.addEventListener('submit', createDrill);
        document.getElementById('ai-generate-btn')?.addEventListener('click', generateAiDrill);
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
    loadData();
}