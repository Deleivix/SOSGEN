
import { getCurrentUser } from "../utils/auth";
import { checkDrillAnswers, renderDrillCalendar, renderDrillDashboard, loadDrillStats } from "../utils/drill";
import { showToast, speakText, stopSpeech } from "../utils/helpers";

type AssignedDrill = {
    id: number;
    supervisor_name: string;
    drill_type: string;
    drill_data: any;
    created_at: string;
    status: 'PENDING' | 'COMPLETED';
    score?: number;
    max_score?: number;
    completed_at?: string;
};

let assignedDrills: AssignedDrill[] = [];
let currentTab: 'personal' | 'assigned' = 'personal';

// Centralized function to refresh all stats views
async function refreshDashboardAndCalendar() {
    const personalStats = await loadDrillStats(); // Returns the object from utils state
    renderDrillDashboard(personalStats, assignedDrills);
    renderDrillCalendar(personalStats, assignedDrills);
}

async function fetchAssignedDrills() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        // Fetch ALL assigned drills (pending and completed) for history
        const response = await fetch(`/api/user-data?username=${user.username}&type=assigned_drills_all`); 
        // Note: API endpoint logic needs to handle 'assigned_drills_all' or we filter on client if 'assigned_drills' returns all.
        // Assuming current API returns all based on logic, or we update API. 
        // For now, let's assume the API returns pending. 
        // *Correction*: To populate calendar, we need completed ones too.
        // Let's rely on the existing endpoint. If it filters by PENDING, we might miss completed history in calendar.
        // The existing API implementation checks: WHERE ad.user_id = ${userId} AND ad.status = 'PENDING'.
        // We need to fetch ALL to populate the calendar properly.
        // Let's fetch 'assigned_drills_all' (requires API update or just fetch all here if supported)
        
        // Falling back to fetching 'assigned_drills' (pending) + separately getting history from stats?
        // No, 'assigned_drills' usually implies active. 
        // Let's change this to fetch ALL user data in utils if possible, or modify request.
        
        // Workaround without changing API file in this specific XML block (assuming user follows):
        // We will fetch from the generic user-data endpoint which returns 'drillStats' and 'sosgenHistory'.
        // It seems 'assigned_drills' table is separate.
        
        // Let's use a specific param to get ALL assigned
        const responseAll = await fetch(`/api/user-data?username=${user.username}&type=assigned_drills_full_history`);
        if (responseAll.ok) {
            assignedDrills = await responseAll.json();
        } else {
            // Fallback to just pending if endpoint fails (graceful degradation)
            const resPending = await fetch(`/api/user-data?username=${user.username}&type=assigned_drills`);
            if (resPending.ok) assignedDrills = await resPending.json();
        }

        renderAssignedList();
        updateAssignedTabBadge(); 
        refreshDashboardAndCalendar(); // Update dashboard with new data
    } catch (e) {
        console.error("Failed to load assigned drills");
    }
}

function updateAssignedTabBadge() {
    const tabBtn = document.querySelector('button[data-tab="assigned"]') as HTMLElement;
    if (!tabBtn) return;

    if (tabBtn.style.position !== 'relative') tabBtn.style.position = 'relative';

    const existingBadge = tabBtn.querySelector('.notification-badge');
    const pendingCount = assignedDrills.filter(d => d.status === 'PENDING').length;

    if (pendingCount > 0) {
        if (!existingBadge) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.style.backgroundColor = 'var(--warning-color)';
            badge.style.border = '1px solid #fff';
            badge.style.top = '2px';
            badge.style.right = '2px';
            tabBtn.appendChild(badge);
        }
    } else {
        if (existingBadge) existingBadge.remove();
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
        await fetchAssignedDrills(); // This will trigger dashboard refresh
        document.getElementById('drill-content')!.innerHTML = '<p class="drill-placeholder">Simulacro completado.</p>';
    } catch (e) {
        showToast("Error al enviar resultados.", "error");
    }
}

function renderAssignedList() {
    const container = document.getElementById('assigned-drills-list');
    if (!container) return;

    const pending = assignedDrills.filter(d => d.status === 'PENDING');

    if (pending.length === 0) {
        container.innerHTML = '<p class="drill-placeholder">No tienes simulacros pendientes de auditoría.</p>';
        return;
    }

    container.innerHTML = pending.map(drill => `
        <div class="drill-card-assigned" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1rem; margin-bottom: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 600; color: var(--text-primary);">${drill.drill_type === 'dsc' ? 'Alerta DSC' : (drill.drill_type === 'manual' ? 'Simulacro Manual' : 'Radiotelefonía')}</div>
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
    // Fetch calls will trigger rendering of dashboard and calendar once data arrives
    fetchAssignedDrills(); 

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
                document.getElementById('personal-tab-content')!.style.display = 'block';
                document.getElementById('assigned-tab-content')!.style.display = 'none';
                container.querySelectorAll('.info-nav-btn').forEach(b => b.classList.remove('active'));
                const actions = container.querySelector('.drill-actions') as HTMLElement;
                if (actions) actions.style.display = 'none';
                
                const contentEl = document.getElementById('drill-content') as HTMLDivElement;
                renderDrillContent(drill.drill_data, contentEl, id); 
            }
        }
        
        const speakBtn = target.closest('#btn-speak-scenario');
        if (speakBtn) {
            const scenarioText = document.querySelector('.drill-scenario')?.textContent;
            if (scenarioText) speakText(scenarioText);
        }

        if (target.classList.contains('order-btn')) {
            const item = target.closest('.order-item');
            const list = item?.parentElement;
            if (item && list) {
                if (target.dataset.dir === 'up' && item.previousElementSibling) {
                    list.insertBefore(item, item.previousElementSibling);
                } else if (target.dataset.dir === 'down' && item.nextElementSibling) {
                    list.insertBefore(item.nextElementSibling, item);
                }
            }
        }
    });
}

function renderDrillContent(drillData: any, contentEl: HTMLDivElement, assignedId?: number) {
    const isVoiceDrill = drillData.type === 'radiotelephony';
    let html = `
        <div class="drill-scenario">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
                <span style="white-space: pre-wrap;">${drillData.scenario}</span>
                ${isVoiceDrill ? `<button id="btn-speak-scenario" class="secondary-btn" style="padding:0.4rem 0.8rem; font-size:0.85rem;" title="Escuchar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/><path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/><path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 8.99 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/></svg></button>` : ''}
            </div>
        </div>
        <div class="drill-questions">
    `;
    
    drillData.questions.forEach((q: any, index: number) => {
        const isOrdering = q.type === 'ordering';
        
        let optionsContent = '';
        
        if (isOrdering) {
            const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
            optionsContent = `
                <div class="ordering-list" id="sortable-${index}" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${shuffledOptions.map((opt: string) => `
                        <div class="order-item" style="display:flex; align-items:center; justify-content:space-between; padding:0.75rem; background:var(--bg-card); border:1px solid var(--border-color); border-radius:6px;">
                            <span class="opt-text">${opt}</span>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <button class="order-btn" data-dir="up" style="border:none; background:none; cursor:pointer; color:var(--text-secondary); line-height:1;">▲</button>
                                <button class="order-btn" data-dir="down" style="border:none; background:none; cursor:pointer; color:var(--text-secondary); line-height:1;">▼</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            optionsContent = `
                <div class="answer-options">
                    ${q.options.map((opt: string, optIndex: number) => `
                        <label class="answer-option" for="q${index}-opt${optIndex}">
                            <input type="radio" name="question-${index}" id="q${index}-opt${optIndex}" value="${optIndex}">
                            <span>${opt}</span>
                        </label>
                    `).join('')}
                </div>
            `;
        }

        html += `
            <div class="question-block" id="question-${index}" data-type="${isOrdering ? 'ordering' : 'choice'}" data-correct-index="${q.correctAnswerIndex}">
                <p class="question-text">${index + 1}. ${q.questionText}</p>
                ${optionsContent}
            </div>
        `;
    });
    
    html += `</div><button id="drill-check-btn" class="primary-btn">Verificar y Finalizar</button><div id="drill-results" class="drill-results-summary"></div>`;
    contentEl.innerHTML = html;

    const checkBtn = contentEl.querySelector('#drill-check-btn');
    checkBtn?.addEventListener('click', () => {
        stopSpeech();
        const score = checkDrillAnswers(drillData, contentEl);
        
        if (assignedId) {
            submitAssignedDrill(assignedId, score);
            const actions = document.querySelector('.drill-actions') as HTMLElement;
            if (actions) actions.style.display = 'flex';
        } else {
            refreshDashboardAndCalendar(); // Trigger update for personal drills
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
