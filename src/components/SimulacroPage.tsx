
import { getCurrentUser } from "../utils/auth";
import { checkDrillAnswers, renderDrillCalendar, renderDrillDashboard } from "../utils/drill";
import { showToast } from "../utils/helpers";

type AssignedDrill = {
    id: number;
    supervisor_name: string;
    drill_type: string;
    drill_data: any;
    created_at: string;
};

let assignedDrills: AssignedDrill[] = [];
let currentTab: 'personal' | 'assigned' = 'personal';

async function fetchAssignedDrills() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const response = await fetch(`/api/user-data?username=${user.username}&type=assigned_drills`);
        if (response.ok) {
            assignedDrills = await response.json();
            renderAssignedList();
        }
    } catch (e) {
        console.error("Failed to load assigned drills");
    }
}

async function submitAssignedDrill(assignedId: number, score: number) {
    const user = getCurrentUser();
    if (!user) return;
    try {
        await fetch('/api/user-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: user.username,
                type: 'submit_assigned_drill',
                data: { assignedDrillId: assignedId, score }
            })
        });
        showToast("Resultados enviados al supervisor.", "success");
        await fetchAssignedDrills(); // Refresh list
        document.getElementById('drill-content')!.innerHTML = '<p class="drill-placeholder">Simulacro completado.</p>';
    } catch (e) {
        showToast("Error al enviar resultados.", "error");
    }
}

function renderAssignedList() {
    const container = document.getElementById('assigned-drills-list');
    if (!container) return;

    if (assignedDrills.length === 0) {
        container.innerHTML = '<p class="drill-placeholder">No tienes simulacros pendientes de auditoría.</p>';
        return;
    }

    container.innerHTML = assignedDrills.map(drill => `
        <div class="drill-card-assigned" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1rem; margin-bottom: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 600; color: var(--text-primary);">${drill.drill_type === 'dsc' ? 'Alerta DSC' : 'Radiotelefonía'}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Asignado por: ${drill.supervisor_name} • ${new Date(drill.created_at).toLocaleDateString()}</div>
            </div>
            <button class="primary-btn-small start-assigned-btn" data-id="${drill.id}">Realizar</button>
        </div>
    `).join('');
}

export function renderSimulacro(container: HTMLElement) {
    container.innerHTML = `
        <div class="simulacro-layout-grid">
            <div id="drill-dashboard-container"></div>
            <div class="content-card">
                 <h2 class="content-card-title">Simulador de Casos Prácticos</h2>
                 
                 <div class="info-nav-tabs">
                    <button class="info-nav-btn active" data-tab="personal">Entrenamiento Personal (IA)</button>
                    <button class="info-nav-btn" data-tab="assigned">Simulacros Auditados</button>
                 </div>

                 <div id="personal-tab-content">
                     <div class="drill-container">
                         <div class="drill-actions">
                             <button class="primary-btn" data-drill-type="dsc">Simulacro DSC (IA)</button>
                             <button class="primary-btn" data-drill-type="radiotelephony">Simulacro Voz (IA)</button>
                         </div>
                         <div id="drill-content" class="drill-content">
                             <p class="drill-placeholder">Seleccione un tipo de simulacro para comenzar.</p>
                         </div>
                     </div>
                 </div>

                 <div id="assigned-tab-content" style="display: none;">
                    <div id="assigned-drills-list"></div>
                 </div>
            </div>
            <div id="drill-calendar-container"></div>
        </div>
    `;
    
    initializeSimulacro();
    renderDrillDashboard();
    renderDrillCalendar();
    fetchAssignedDrills();

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const tabBtn = target.closest('button[data-tab]');
        
        if (tabBtn) {
            const tab = tabBtn.getAttribute('data-tab');
            if (tab === 'personal') {
                document.getElementById('personal-tab-content')!.style.display = 'block';
                document.getElementById('assigned-tab-content')!.style.display = 'none';
            } else {
                document.getElementById('personal-tab-content')!.style.display = 'none';
                document.getElementById('assigned-tab-content')!.style.display = 'block';
            }
            container.querySelectorAll('.info-nav-btn').forEach(b => b.classList.remove('active'));
            tabBtn.classList.add('active');
        }

        const startAssignedBtn = target.closest('.start-assigned-btn');
        if (startAssignedBtn) {
            const id = parseInt(startAssignedBtn.getAttribute('data-id')!);
            const drill = assignedDrills.find(d => d.id === id);
            if (drill) {
                // Render drill in the personal content area for simplicity, but handle submission differently
                document.getElementById('personal-tab-content')!.style.display = 'block';
                document.getElementById('assigned-tab-content')!.style.display = 'none';
                container.querySelectorAll('.info-nav-btn').forEach(b => b.classList.remove('active'));
                // Hide buttons to force focus on this drill
                const actions = container.querySelector('.drill-actions') as HTMLElement;
                if (actions) actions.style.display = 'none';
                
                const contentEl = document.getElementById('drill-content') as HTMLDivElement;
                renderDrillContent(drill.drill_data, contentEl, id); // Pass ID to indicate assigned mode
            }
        }
    });
}

function renderDrillContent(drillData: any, contentEl: HTMLDivElement, assignedId?: number) {
    let html = `<div class="drill-scenario">${drillData.scenario}</div><div class="drill-questions">`;
    drillData.questions.forEach((q: any, index: number) => {
        html += `
            <div class="question-block" id="question-${index}" data-correct-index="${q.correctAnswerIndex}">
                <p class="question-text">${index + 1}. ${q.questionText}</p>
                <div class="answer-options">
                    ${q.options.map((opt: string, optIndex: number) => `
                        <label class="answer-option" for="q${index}-opt${optIndex}">
                            <input type="radio" name="question-${index}" id="q${index}-opt${optIndex}" value="${optIndex}">
                            <span>${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    html += `</div><button id="drill-check-btn" class="primary-btn">Verificar y Finalizar</button><div id="drill-results" class="drill-results-summary"></div>`;
    contentEl.innerHTML = html;

    const checkBtn = contentEl.querySelector('#drill-check-btn');
    checkBtn?.addEventListener('click', () => {
        // Special check function that returns score
        const score = checkDrillAnswers(drillData, contentEl);
        
        if (assignedId) {
            submitAssignedDrill(assignedId, score);
            // Restore UI
            const actions = document.querySelector('.drill-actions') as HTMLElement;
            if (actions) actions.style.display = 'flex';
        }
    }, { once: true });
}

function initializeSimulacro() {
    const drillContainer = document.querySelector('.drill-container');
    if (!drillContainer) return;

    const drillButtons = drillContainer.querySelectorAll<HTMLButtonElement>('.drill-actions button');
    const drillContent = drillContainer.querySelector<HTMLDivElement>('#drill-content');

    if (!drillButtons.length || !drillContent) return;
    
    const skeletonHtml = `
        <div class="skeleton skeleton-scenario"></div>
        <div class="skeleton skeleton-question"></div>
    `;

    const generateDrill = async (drillType: string) => {
        drillContent.innerHTML = skeletonHtml;
        drillContent.classList.add('loading');
        drillButtons.forEach(btn => btn.disabled = true);

        try {
            const apiResponse = await fetch('/api/simulacro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: drillType })
            });

            if (!apiResponse.ok) throw new Error('Error de API');
            const drillData = await apiResponse.json();
            renderDrillContent(drillData, drillContent);

        } catch (error) {
            showToast("No se pudo generar el simulacro.", 'error');
            drillContent.innerHTML = `<p class="error">Error de generación.</p>`;
        } finally {
            drillContent.classList.remove('loading');
            drillButtons.forEach(btn => btn.disabled = false);
        }
    };
    
    drillButtons.forEach(button => {
        button.addEventListener('click', () => {
            const drillType = button.dataset.drillType;
            if (drillType) generateDrill(drillType);
        });
    });
}
