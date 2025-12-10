
import { checkDrillAnswers, renderDrillCalendar, renderDrillDashboard } from "../utils/drill";
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

type AssignedDrill = {
    id: number;
    drill_type: string;
    drill_data: any;
    status: 'PENDING' | 'COMPLETED';
    created_at: string;
    supervisor_name: string;
};

let currentTab: 'personal' | 'assigned' = 'personal';
let assignedDrills: AssignedDrill[] = [];

async function fetchAssignedDrills() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const res = await fetch(`/api/user-data?username=${user.username}&type=assigned_drills`);
        if (res.ok) {
            assignedDrills = await res.json();
            renderAssignedDrillsList();
        }
    } catch (e) {
        console.error("Failed to fetch assigned drills", e);
    }
}

async function submitAssignedDrill(drillId: number, score: number) {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const res = await fetch('/api/user-data', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: user.username,
                type: 'submit_assigned_drill',
                data: { assignedDrillId: drillId, score }
            })
        });
        if(res.ok) {
            showToast("Simulacro completado y enviado al supervisor.", "success");
            fetchAssignedDrills(); // Refresh list
            // Switch back to list view
            document.getElementById('assigned-drill-view')!.style.display = 'none';
            document.getElementById('assigned-drills-list')!.style.display = 'grid';
        }
    } catch(e) {
        showToast("Error al enviar resultados.", "error");
    }
}

export function renderSimulacro(container: HTMLElement) {
    container.innerHTML = `
        <div class="simulacro-layout-grid">
            <div id="drill-dashboard-container"></div>
            <div class="content-card">
                 <h2 class="content-card-title">Simulador de Casos Prácticos GMDSS</h2>
                 
                 <div class="info-nav-tabs" style="margin-bottom: 2rem;">
                    <button class="info-nav-btn active" data-tab="personal">Simulacros Personales</button>
                    <button class="info-nav-btn" data-tab="assigned">Simulacros Auditados</button>
                 </div>

                 <!-- PERSONAL TAB -->
                 <div id="tab-personal" class="sub-tab-panel active">
                     <div class="drill-container">
                         <div class="drill-actions">
                             <button class="primary-btn" data-drill-type="dsc">Simulacro DSC (IA)</button>
                             <button class="primary-btn" data-drill-type="radiotelephony">Simulacro Radiotelefonía (IA)</button>
                         </div>
                         <div id="drill-content" class="drill-content">
                             <p class="drill-placeholder">Seleccione un tipo de simulacro para comenzar.</p>
                         </div>
                     </div>
                 </div>

                 <!-- ASSIGNED TAB -->
                 <div id="tab-assigned" class="sub-tab-panel">
                    <div id="assigned-drills-list" class="dashboard-grid" style="grid-template-columns: 1fr;"></div>
                    <div id="assigned-drill-view" style="display:none;"></div>
                 </div>
            </div>
            <div id="drill-calendar-container"></div>
        </div>
    `;
    
    initializeSimulacro(container);
    renderDrillDashboard();
    renderDrillCalendar();
    fetchAssignedDrills();
}

function renderAssignedDrillsList() {
    const listContainer = document.getElementById('assigned-drills-list');
    if (!listContainer) return;

    if (assignedDrills.length === 0) {
        listContainer.innerHTML = `<p class="drill-placeholder">No tienes simulacros asignados pendientes.</p>`;
        return;
    }

    listContainer.innerHTML = assignedDrills.map(d => `
        <div class="dashboard-card drill-card-assigned" style="cursor: pointer;" data-id="${d.id}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h4 style="margin: 0;">Simulacro ${d.drill_type.toUpperCase()}</h4>
                <span class="category-badge importante">ASIGNADO</span>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                Asignado por: <strong>${d.supervisor_name}</strong>
            </p>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">
                Fecha: ${new Date(d.created_at).toLocaleDateString()}
            </p>
        </div>
    `).join('');
    
    listContainer.querySelectorAll('.drill-card-assigned').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.getAttribute('data-id')!, 10);
            const drill = assignedDrills.find(d => d.id === id);
            if (drill) startAssignedDrill(drill);
        });
    });
}

function startAssignedDrill(drill: AssignedDrill) {
    const listContainer = document.getElementById('assigned-drills-list');
    const viewContainer = document.getElementById('assigned-drill-view');
    if (!listContainer || !viewContainer) return;

    listContainer.style.display = 'none';
    viewContainer.style.display = 'block';
    
    // Render drill using standard logic but inside viewContainer
    const data = drill.drill_data;
    let html = `
        <div style="margin-bottom: 1rem;">
            <button class="secondary-btn" id="back-to-list-btn">← Volver a lista</button>
        </div>
        <div class="drill-scenario">${data.scenario}</div>
        <div class="drill-questions">
    `;
    
    data.questions.forEach((q: any, index: number) => {
        html += `
            <div class="question-block" id="q-assigned-${index}" data-correct-index="${q.correctAnswerIndex}">
                <p class="question-text">${index + 1}. ${q.questionText}</p>
                <div class="answer-options">
                    ${q.options.map((opt: string, optIndex: number) => `
                        <label class="answer-option" for="qa${index}-opt${optIndex}">
                            <input type="radio" name="question-${index}" id="qa${index}-opt${optIndex}" value="${optIndex}">
                            <span>${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });
    html += `</div><button id="submit-assigned-btn" class="primary-btn">Enviar Respuestas</button><div id="assigned-results" class="drill-results-summary"></div>`;
    
    viewContainer.innerHTML = html;

    viewContainer.querySelector('#back-to-list-btn')?.addEventListener('click', () => {
        viewContainer.style.display = 'none';
        listContainer.style.display = 'grid';
    });

    viewContainer.querySelector('#submit-assigned-btn')?.addEventListener('click', (e) => {
        const btn = e.target as HTMLButtonElement;
        btn.disabled = true;
        
        // Calculate Score
        let score = 0;
        data.questions.forEach((q: any, index: number) => {
            const block = viewContainer.querySelector(`#q-assigned-${index}`);
            const selected = block?.querySelector<HTMLInputElement>(`input[name="question-${index}"]:checked`);
            if (selected && parseInt(selected.value) === q.correctAnswerIndex) {
                score++;
            }
            // Show feedback visually (simplified version of checkDrillAnswers)
            if (block) {
                const correctLabel = block.querySelector(`label[for="qa${index}-opt${q.correctAnswerIndex}"]`);
                if (correctLabel) correctLabel.classList.add('correct');
                if (selected && parseInt(selected.value) !== q.correctAnswerIndex) {
                    const wrongLabel = block.querySelector(`label[for="qa${index}-opt${selected.value}"]`);
                    if (wrongLabel) wrongLabel.classList.add('incorrect');
                }
            }
        });

        const resultsEl = viewContainer.querySelector('#assigned-results');
        if (resultsEl) resultsEl.innerHTML = `<h3>Resultado: ${score} / ${data.questions.length}</h3>`;
        
        // Submit to API
        submitAssignedDrill(drill.id, score);
    });
}

function initializeSimulacro(container: HTMLElement) {
    const personalTab = container.querySelector('[data-tab="personal"]');
    const assignedTab = container.querySelector('[data-tab="assigned"]');
    const personalPanel = container.querySelector('#tab-personal') as HTMLElement;
    const assignedPanel = container.querySelector('#tab-assigned') as HTMLElement;

    const switchTab = (tab: 'personal' | 'assigned') => {
        currentTab = tab;
        if (tab === 'personal') {
            personalTab?.classList.add('active');
            assignedTab?.classList.remove('active');
            personalPanel.classList.add('active');
            assignedPanel.classList.remove('active');
        } else {
            personalTab?.classList.remove('active');
            assignedTab?.classList.add('active');
            personalPanel.classList.remove('active');
            assignedPanel.classList.add('active');
            fetchAssignedDrills();
        }
    };

    personalTab?.addEventListener('click', () => switchTab('personal'));
    assignedTab?.addEventListener('click', () => switchTab('assigned'));

    // --- Personal Drill Logic (Existing) ---
    const drillContainer = container.querySelector('.drill-container');
    if (!drillContainer) return;

    const drillButtons = drillContainer.querySelectorAll<HTMLButtonElement>('.drill-actions button');
    const drillContent = drillContainer.querySelector<HTMLDivElement>('#drill-content');

    if (!drillButtons.length || !drillContent) return;
    
    const skeletonHtml = `
        <div class="skeleton skeleton-scenario"></div>
        <div class="skeleton skeleton-question"></div>
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

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.details || 'La API devolvió un error.');
            }
            const drillData = await apiResponse.json();
            
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
            html += `</div><button id="drill-check-btn" class="primary-btn">Verificar Respuestas</button><div id="drill-results" class="drill-results-summary"></div>`;
            drillContent.innerHTML = html;

            const checkBtn = drillContent.querySelector('#drill-check-btn');
            checkBtn?.addEventListener('click', () => checkDrillAnswers(drillData, drillContent), { once: true });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "No se pudo generar el simulacro.";
            drillContent.innerHTML = `<p class="error">${errorMessage}</p>`;
            showToast(errorMessage, 'error');
        } finally {
            drillContent.classList.remove('loading');
            drillButtons.forEach(btn => btn.disabled = false);
        }
    };
    
    drillButtons.forEach(button => {
        button.addEventListener('click', () => {
            const drillType = button.dataset.drillType;
            if (drillType) {
                generateDrill(drillType);
            }
        });
    });
}
