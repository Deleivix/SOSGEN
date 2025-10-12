import { checkDrillAnswers, renderDrillCalendar, renderDrillDashboard } from "../utils/drill";
import { showToast } from "../utils/helpers";

export function renderSimulacro(container: HTMLElement) {
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
    initializeSimulacro();
    renderDrillDashboard(); // These now fetch data from the backend via drill.ts
    renderDrillCalendar();
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
            console.error("Drill Generation Error:", error);
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