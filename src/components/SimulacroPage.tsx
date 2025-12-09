
import { checkDrillAnswers, renderDrillCalendar, renderDrillDashboard } from "../utils/drill";
import { showToast, initializeInfoTabs } from "../utils/helpers";
import { getCurrentUser } from "../utils/auth";

// --- EXISTING AI DRILL LOGIC WRAPPED IN FUNCTION ---
function renderPersonalDrills(container: HTMLElement) {
    container.innerHTML = `
        <div class="simulacro-layout-grid">
            <div id="drill-dashboard-container"></div>
            <div class="content-card">
                 <h2 class="content-card-title">Simulador de Casos Prácticos GMDSS</h2>
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
            <div id="drill-calendar-container"></div>
        </div>
    `;
    initializeSimulacroEvents();
    renderDrillDashboard();
    renderDrillCalendar();
}

function initializeSimulacroEvents() {
    const drillContainer = document.querySelector('.drill-container');
    if (!drillContainer) return;
    const drillButtons = drillContainer.querySelectorAll<HTMLButtonElement>('.drill-actions button');
    const drillContent = drillContainer.querySelector<HTMLDivElement>('#drill-content');
    if (!drillButtons.length || !drillContent) return;

    const generateDrill = async (drillType: string) => {
        drillContent.innerHTML = `<div class="loader"></div>`;
        try {
            const apiResponse = await fetch('/api/simulacro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: drillType })
            });
            const drillData = await apiResponse.json();
            renderDrillUI(drillData, drillContent, (score, total) => {
                 // Update local stats only for personal drills
                 import("../utils/drill").then(m => m.updateDrillStats(score, total, drillType));
            });
        } catch (error) {
            drillContent.innerHTML = `<p class="error">Error generando simulacro</p>`;
        }
    };
    drillButtons.forEach(b => b.addEventListener('click', () => generateDrill(b.dataset.drillType!)));
}

// --- NEW AUDITED DRILLS LOGIC ---
async function renderAuditedDrills(container: HTMLElement) {
    const user = getCurrentUser();
    if (!user) return;
    
    container.innerHTML = `<div class="loader"></div>`;
    
    try {
        const res = await fetch(`/api/supervisor?action=get_my_drills&username=${user.username}`);
        const drills = await res.json();
        
        if (drills.length === 0) {
            container.innerHTML = `<p class="drill-placeholder">No tienes simulacros asignados.</p>`;
            return;
        }

        const listHtml = drills.map((d: any) => `
            <div class="log-entry" style="margin-bottom: 1rem;">
                <div class="log-entry-header">
                    <span>${d.title}</span>
                    <span class="category-badge ${d.status === 'COMPLETED' ? 'green' : 'orange'}">${d.status === 'COMPLETED' ? `Completado (${d.score}/${d.max_score})` : 'Pendiente'}</span>
                </div>
                <div class="log-entry-content">
                    <p>${d.scenario.substring(0, 100)}...</p>
                    ${d.status !== 'COMPLETED' ? `<button class="primary-btn-small start-audit-btn" data-id="${d.id}">Realizar</button>` : ''}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = listHtml;
        
        container.querySelectorAll('.start-audit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const drill = drills.find((d: any) => d.id == (btn as HTMLElement).dataset.id);
                startAuditedDrill(drill, container);
            });
        });

    } catch (e) { container.innerHTML = '<p class="error">Error cargando simulacros.</p>'; }
}

function startAuditedDrill(drill: any, container: HTMLElement) {
    const drillData = {
        scenario: drill.scenario,
        questions: drill.questions,
        type: 'AUDITED'
    };
    
    container.innerHTML = `<div id="audit-content"></div>`;
    const contentDiv = container.querySelector('#audit-content') as HTMLDivElement;
    
    renderDrillUI(drillData, contentDiv, async (score, total, answers) => {
        // Submit to supervisor API
        const user = getCurrentUser();
        await fetch('/api/supervisor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'submit_drill',
                username: user?.username,
                assignmentId: drill.id,
                score,
                maxScore: total,
                answers
            })
        });
        showToast('Simulacro enviado al supervisor.', 'success');
        renderAuditedDrills(container); // Go back to list
    }, true);
}

// --- SHARED UI RENDERER ---
function renderDrillUI(data: any, container: HTMLDivElement, onFinish: (score: number, total: number, answers?: any) => void, isAudit = false) {
    let html = `<div class="drill-scenario">${data.scenario}</div><div class="drill-questions">`;
    data.questions.forEach((q: any, index: number) => {
        html += `
            <div class="question-block" id="q-block-${index}">
                <p class="question-text">${index + 1}. ${q.questionText}</p>
                <div class="answer-options">
                    ${q.options.map((opt: string, optIndex: number) => `
                        <label class="answer-option"><input type="radio" name="q-${index}" value="${optIndex}"> <span>${opt}</span></label>
                    `).join('')}
                </div>
            </div>`;
    });
    html += `</div><button id="finish-btn" class="primary-btn">Finalizar</button>`;
    container.innerHTML = html;

    container.querySelector('#finish-btn')?.addEventListener('click', () => {
        let score = 0;
        const answers: any[] = [];
        data.questions.forEach((q: any, index: number) => {
            const selected = container.querySelector(`input[name="q-${index}"]:checked`) as HTMLInputElement;
            const val = selected ? parseInt(selected.value) : -1;
            const correct = parseInt(q.correctAnswerIndex);
            if (val === correct) score++;
            answers.push({ question: q.questionText, selected: val, correct });
            
            // Show feedback immediately
            const block = container.querySelector(`#q-block-${index}`);
            if(block) {
                if (val === correct) block.classList.add('correct-block'); // CSS class needed
                else block.classList.add('incorrect-block');
                block.insertAdjacentHTML('beforeend', `<div class="answer-feedback">Correcta: ${q.options[correct]}</div>`);
            }
        });
        
        container.querySelector('#finish-btn')?.remove();
        onFinish(score, data.questions.length, answers);
        
        if (!isAudit) {
             container.insertAdjacentHTML('beforeend', `<div class="drill-results-summary"><h3>Resultado: ${score}/${data.questions.length}</h3></div>`);
        }
    });
}

export function renderSimulacro(container: HTMLElement) {
    container.innerHTML = `
        <div class="info-nav-tabs">
            <button class="info-nav-btn active" data-target="tab-personal">Personales</button>
            <button class="info-nav-btn" data-target="tab-audit">Auditados</button>
        </div>
        <div id="tab-personal" class="sub-tab-panel active"></div>
        <div id="tab-audit" class="sub-tab-panel"></div>
    `;
    
    initializeInfoTabs(container);
    renderPersonalDrills(container.querySelector('#tab-personal') as HTMLElement);
    
    const auditTab = container.querySelector('.info-nav-btn[data-target="tab-audit"]');
    auditTab?.addEventListener('click', () => {
        renderAuditedDrills(container.querySelector('#tab-audit') as HTMLElement);
    });
}
