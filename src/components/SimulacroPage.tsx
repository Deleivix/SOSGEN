import { checkDrillAnswers, renderDrillCalendar, renderDrillDashboard } from "../utils/drill";

export function renderSimulacro(container: HTMLElement) {
    container.innerHTML = `
        <div id="drill-dashboard-container"></div>
        <div id="drill-calendar-container"></div>
        <div class="content-card">
             <h2 class="content-card-title">Simulador de Casos Prácticos GMDSS</h2>
             <div class="drill-container">
                 <div class="drill-actions">
                     <button class="primary-btn" data-drill-type="dsc">Simulacro DSC (IA)</button>
                     <button class="primary-btn" data-drill-type="radiotelephony">Simulacro Radiotelefonía (IA)</button>
                 </div>
                 <div id="drill-loader" class="loader-container" style="display: none;"><div class="loader"></div></div>
                 <div id="drill-content" class="drill-content">
                     <p class="drill-placeholder">Seleccione un tipo de simulacro para comenzar.</p>
                 </div>
             </div>
        </div>
    `;
    initializeSimulacro();
    renderDrillDashboard();
    renderDrillCalendar();
}

function initializeSimulacro() {
    const drillContainer = document.querySelector('.drill-container');
    if (!drillContainer) return;

    const drillButtons = drillContainer.querySelectorAll<HTMLButtonElement>('.drill-actions button');
    const drillContent = drillContainer.querySelector<HTMLDivElement>('#drill-content');
    const loader = drillContainer.querySelector<HTMLDivElement>('#drill-loader');

    if (!drillButtons.length || !drillContent || !loader) return;

    const generateDrill = async (drillType: string) => {
        drillContent.innerHTML = '';
        loader.style.display = 'flex';
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
            drillContent.innerHTML = `<p class="error">No se pudo generar el simulacro. Inténtelo de nuevo.</p>`;
        } finally {
            loader.style.display = 'none';
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
