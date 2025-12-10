
import { getCurrentUser } from "../utils/auth";
import { checkDrillAnswers, renderDrillCalendar, renderDrillDashboard } from "../utils/drill";
import { showToast, speakText, stopSpeech } from "../utils/helpers";

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

    // Ensure speech stops if user navigates away or switches tabs rapidly
    stopSpeech();

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
        
        // Handle TTS
        const speakBtn = target.closest('#btn-speak-scenario');
        if (speakBtn) {
            const scenarioText = document.querySelector('.drill-scenario')?.textContent;
            if (scenarioText) speakText(scenarioText);
        }
    });
}

function renderDrillContent(drillData: any, contentEl: HTMLDivElement, assignedId?: number) {
    const isVoiceDrill = drillData.type === 'radiotelephony';
    let html = `
        <div class="drill-scenario">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
                <span>${drillData.scenario}</span>
                ${isVoiceDrill ? `<button id="btn-speak-scenario" class="secondary-btn" style="padding:0.4rem 0.8rem; font-size:0.85rem;" title="Escuchar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/><path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/><path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 8.99 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/></svg></button>` : ''}
            </div>
        </div>
        <div class="drill-questions">
    `;
    
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
        stopSpeech(); // Stop any pending audio
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
