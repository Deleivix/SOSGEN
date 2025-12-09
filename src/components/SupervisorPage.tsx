
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
    const response = await fetch(`/api/supervisor?action=${action}&username=${user.username}`, {
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
    // Simplified JSON parsing for demo
    let questions = [];
    try {
        questions = JSON.parse((form.querySelector('#drill-json') as HTMLTextAreaElement).value);
    } catch(err) { return showToast('JSON de preguntas inválido', 'error'); }

    await apiCall('create_drill', { title, scenario, questions });
    showToast('Simulacro creado', 'success');
    loadData();
}

async function assignDrill(e: Event) {
    e.preventDefault();
    const drillId = (document.getElementById('assign-drill-select') as HTMLSelectElement).value;
    const userId = (document.getElementById('assign-user-select') as HTMLSelectElement).value;
    
    await apiCall('assign_drill', { drillId, targetUsers: userId === 'ALL' ? 'ALL' : [userId] });
    showToast('Asignación realizada', 'success');
    loadData();
}

async function generateAI(e: Event) {
    e.preventDefault();
    const btn = e.target as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Generando...';
    try {
        const data = await apiCall('generate_ai_drill', {});
        (document.getElementById('drill-title') as HTMLInputElement).value = data.title || '';
        (document.getElementById('drill-scenario') as HTMLTextAreaElement).value = data.scenario || '';
        (document.getElementById('drill-json') as HTMLTextAreaElement).value = JSON.stringify(data.questions || [], null, 2);
    } catch(err) { showToast('Error IA', 'error'); }
    btn.disabled = false;
    btn.textContent = 'Generar Base con IA';
}

function renderTabs() {
    const container = document.getElementById('supervisor-content');
    if (!container) return;

    // --- Create Tab ---
    const createHtml = `
        <div class="form-grid">
            <button class="secondary-btn" id="gen-ai-btn" style="margin-bottom:1rem;">Generar Base con IA</button>
            <form id="create-drill-form">
                <div class="form-group"><label>Título</label><input class="simulator-input" id="drill-title" required></div>
                <div class="form-group"><label>Escenario</label><textarea class="styled-textarea" id="drill-scenario" required></textarea></div>
                <div class="form-group"><label>Preguntas (JSON)</label><textarea class="styled-textarea" id="drill-json" required rows="10">[]</textarea></div>
                <button class="primary-btn">Guardar Simulacro</button>
            </form>
        </div>
    `;

    // --- Assign Tab ---
    const assignHtml = `
        <form id="assign-form" style="margin-bottom: 2rem;">
            <div class="form-grid">
                <div class="form-group">
                    <label>Simulacro</label>
                    <select class="simulator-input" id="assign-drill-select">
                        ${allDrills.map(d => `<option value="${d.id}">${d.title}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Usuario</label>
                    <select class="simulator-input" id="assign-user-select">
                        <option value="ALL">TODOS</option>
                        ${users.map(u => `<option value="${u.id}">${u.username}</option>`).join('')}
                    </select>
                </div>
                <button class="primary-btn" style="margin-top: 1.5rem;">Asignar</button>
            </div>
        </form>
    `;

    // --- Results Tab ---
    const kpiTotal = assignments.length;
    const kpiCompleted = assignments.filter(a => a.status === 'COMPLETED').length;
    const resultsHtml = `
        <div class="stats-grid" style="margin-bottom: 2rem;">
            <div class="stat-card"><div class="label">Asignados</div><div class="value">${kpiTotal}</div></div>
            <div class="stat-card"><div class="label">Completados</div><div class="value green">${kpiCompleted}</div></div>
            <div class="stat-card"><div class="label">Pendientes</div><div class="value red">${kpiTotal - kpiCompleted}</div></div>
        </div>
        <button class="secondary-btn" id="export-btn" style="margin-bottom: 1rem;">Exportar CSV</button>
        <div class="table-wrapper">
            <table class="reference-table">
                <thead><tr><th>Drill</th><th>Usuario</th><th>Estado</th><th>Nota</th></tr></thead>
                <tbody>
                    ${assignments.map(a => `<tr><td>${a.title}</td><td>${a.username}</td><td>${a.status}</td><td>${a.score || '-'}/${a.max_score || '-'}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = `
        <div class="info-nav-tabs">
            <button class="info-nav-btn active" data-target="sup-tab-create">Crear</button>
            <button class="info-nav-btn" data-target="sup-tab-assign">Asignar</button>
            <button class="info-nav-btn" data-target="sup-tab-results">Resultados</button>
        </div>
        <div id="sup-tab-create" class="sub-tab-panel active">${createHtml}</div>
        <div id="sup-tab-assign" class="sub-tab-panel">${assignHtml}</div>
        <div id="sup-tab-results" class="sub-tab-panel">${resultsHtml}</div>
    `;
    
    initializeInfoTabs(container);
    
    document.getElementById('gen-ai-btn')?.addEventListener('click', generateAI);
    document.getElementById('create-drill-form')?.addEventListener('submit', createDrill);
    document.getElementById('assign-form')?.addEventListener('submit', assignDrill);
    document.getElementById('export-btn')?.addEventListener('click', exportToCSV);
}

export function renderSupervisorPage(container: HTMLElement) {
    container.innerHTML = `<div class="content-card" id="supervisor-content"><div class="loader"></div></div>`;
    loadData();
}
