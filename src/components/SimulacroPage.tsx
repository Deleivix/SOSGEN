
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
        drillContent.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        try {
            const apiResponse = await fetch('/api/simulacro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: drillType })
            });
            const drillData = await apiResponse.json();
            // Default AI drills are always TEST type
            renderDrillUI(drillData, drillContent, (score, total) => {
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
    
    container.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
    
    try {
        const res = await fetch(`/api/simulacro?action=get_my_drills&username=${user.username}`);
        const drills = await res.json();
        
        if (drills.length === 0) {
            container.innerHTML = `<div class="content-card"><p class="drill-placeholder">No tienes simulacros asignados.</p></div>`;
            return;
        }

        const listHtml = drills.map((d: any) => `
            <div class="log-entry" style="margin-bottom: 1rem; background: var(--bg-card);">
                <div class="log-entry-header">
                    <span>${d.title}</span>
                    <span class="category-badge ${d.status === 'COMPLETED' ? 'green' : 'orange'}">${d.status === 'COMPLETED' ? `Completado (${d.score}/${d.max_score})` : 'Pendiente'}</span>
                </div>
                <div class="log-entry-content">
                    <p style="grid-column: 1/-1;">${d.scenario.substring(0, 150)}...</p>
                    ${d.status !== 'COMPLETED' ? `<button class="primary-btn-small start-audit-btn" style="grid-column: 1/-1; width: fit-content;" data-id="${d.id}">Realizar Simulacro</button>` : ''}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = `<div class="content-card">${listHtml}</div>`;
        
        container.querySelectorAll('.start-audit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const drill = drills.find((d: any) => d.id == (btn as HTMLElement).dataset.id);
                startAuditedDrill(drill, container);
            });
        });

    } catch (e) { container.innerHTML = '<div class="content-card"><p class="error">Error cargando simulacros.</p></div>'; }
}

function startAuditedDrill(drill: any, container: HTMLElement) {
    // Determine context for mixed types
    const drillData = {
        scenario: drill.scenario,
        questions: drill.questions,
        type: 'AUDITED' 
    };
    
    container.innerHTML = `<div class="content-card" id="audit-content"></div>`;
    const contentDiv = container.querySelector('#audit-content') as HTMLDivElement;
    
    renderDrillUI(drillData, contentDiv, async (score, total, answers) => {
        // Submit to supervisor API
        const user = getCurrentUser();
        await fetch('/api/simulacro', {
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
    
    // Questions rendering loop
    data.questions.forEach((q: any, index: number) => {
        html += `<div class="question-block" id="q-block-${index}" data-type="${q.type || 'TEST'}">`;
        html += `<p class="question-text">${index + 1}. ${q.questionText}</p>`;
        
        // Render based on type
        const type = q.type || 'TEST'; // Default to TEST if undefined (legacy)

        if (type === 'TEST') {
            html += `<div class="answer-options">
                ${q.options.map((opt: string, optIndex: number) => `
                    <label class="answer-option"><input type="radio" name="q-${index}" value="${optIndex}"> <span>${opt}</span></label>
                `).join('')}
            </div>`;
        } else if (type === 'ORDER') {
            // Shuffle options for display, but keep track of original ID
            const optionsWithIndex = q.options.map((opt: string, i: number) => ({val: opt, id: i}));
            // Ideally shuffle here, but for simplicity showing in defined order (user drags/numbers)
            // Using numbered inputs for simplicity instead of complex drag-drop lib
            html += `<div class="answer-options">
                ${optionsWithIndex.map((opt: any) => `
                    <div class="answer-option" style="cursor: default;">
                        <input type="number" class="simulator-input" style="width: 60px; margin-right: 1rem;" min="1" max="${q.options.length}" name="q-${index}-ord-${opt.id}">
                        <span>${opt.val}</span>
                    </div>
                `).join('')}
            </div>
            <small style="color:var(--text-secondary)">Numera las opciones del 1 al ${q.options.length} en el orden correcto.</small>`;
        } else if (type === 'TEXT') {
            html += `<textarea class="styled-textarea" rows="3" name="q-${index}-text" placeholder="Escribe tu respuesta..."></textarea>`;
        }

        html += `</div>`;
    });

    html += `</div><button id="finish-btn" class="primary-btn">Finalizar</button>`;
    container.innerHTML = html;

    container.querySelector('#finish-btn')?.addEventListener('click', () => {
        let score = 0;
        const answers: any[] = [];
        let canSubmit = true;

        data.questions.forEach((q: any, index: number) => {
            const block = container.querySelector(`#q-block-${index}`);
            const type = q.type || 'TEST';
            let userAns: any = null;
            let isCorrect = false;

            if (type === 'TEST') {
                const selected = container.querySelector(`input[name="q-${index}"]:checked`) as HTMLInputElement;
                const val = selected ? parseInt(selected.value) : -1;
                const correct = parseInt(q.correctAnswer);
                if (val === correct) isCorrect = true;
                userAns = val;
                
                // Visual Feedback
                if(block) {
                    if (isCorrect) block.classList.add('correct-block');
                    else block.classList.add('incorrect-block');
                    block.insertAdjacentHTML('beforeend', `<div class="answer-feedback">Correcta: ${q.options[correct]}<br><br>${q.feedback || ''}</div>`);
                }

            } else if (type === 'ORDER') {
                // Check sequence
                const correctSeq = q.correctAnswer; // Array of indices [0, 1, 2]
                const userSeq: number[] = [];
                // Retrieve inputs by original index
                q.options.forEach((_: any, i: number) => {
                    const input = container.querySelector(`input[name="q-${index}-ord-${i}"]`) as HTMLInputElement;
                    const pos = parseInt(input.value) - 1; // 1-based to 0-based
                    // We need to map position to option index. 
                    // This logic is a bit complex for validation without state.
                    // Simplified: We verify if the user put '1' on the option that is truly first in sequence.
                });
                
                // For simplicity in this non-stateful version: 
                // We assume correct answer is the array of option indices in correct order e.g. [2, 0, 1]
                // We check if user assigned '1' to option 2, '2' to option 0, '3' to option 1.
                let allCorrect = true;
                const userOrderMap: {[key:number]: number} = {}; // OptionIdx -> UserPos(0-based)

                q.options.forEach((_: any, optIdx: number) => {
                    const input = container.querySelector(`input[name="q-${index}-ord-${optIdx}"]`) as HTMLInputElement;
                    const val = parseInt(input.value);
                    if(isNaN(val)) allCorrect = false;
                    userOrderMap[optIdx] = val - 1;
                });

                // Verify against correct sequence
                // correctSeq = [2, 0, 1] means option 2 is first, 0 is second...
                q.correctAnswer.forEach((correctOptIdx: number, seqPos: number) => {
                    if (userOrderMap[correctOptIdx] !== seqPos) allCorrect = false;
                });

                isCorrect = allCorrect;
                userAns = userOrderMap;
                
                if(block) {
                    const correctText = q.correctAnswer.map((idx: number) => q.options[idx]).join(' -> ');
                    block.insertAdjacentHTML('beforeend', `<div class="answer-feedback">Orden Correcto: ${correctText}<br><br>${q.feedback || ''}</div>`);
                }

            } else if (type === 'TEXT') {
                const text = (container.querySelector(`textarea[name="q-${index}-text"]`) as HTMLTextAreaElement).value;
                userAns = text;
                // Simple keyword matching for auto-grading text
                const keywords = (q.correctAnswer as string).split(',').map(s => s.trim().toLowerCase());
                if (keywords.some(k => text.toLowerCase().includes(k))) isCorrect = true;
                
                if(block) {
                    block.insertAdjacentHTML('beforeend', `<div class="answer-feedback">Respuesta esperada (palabras clave): ${q.correctAnswer}<br><br>${q.feedback || ''}</div>`);
                }
            }

            if (isCorrect) score++;
            answers.push({ question: q.questionText, selected: userAns, correct: q.correctAnswer, isCorrect });
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
    
    // Explicitly handle tab switch logic for dynamic content
    const auditTab = container.querySelector('.info-nav-btn[data-target="tab-audit"]');
    if (auditTab) {
        auditTab.addEventListener('click', () => {
            const auditContainer = container.querySelector('#tab-audit') as HTMLElement;
            renderAuditedDrills(auditContainer);
        });
    }
}
