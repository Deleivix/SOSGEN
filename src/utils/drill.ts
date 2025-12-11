
import { getCurrentUser } from "./auth";
import { showToast } from "./helpers";

type DrillStats = {
    totalDrills: number;
    totalCorrect: number;
    totalQuestions: number;
    dsc: { taken: number; correct: number; questions: number; };
    radiotelephony: { taken: number; correct: number; questions: number; };
    manual: { taken: number; correct: number; questions: number; };
    history: {
        timestamp: string;
        type: string;
        score: number;
        total: number;
    }[];
}

let drillStats: DrillStats | null = null;

// Helper to render SVG Donut
function renderDonutChart(percentage: number, color: string): string {
    const radius = 15.9155;
    const circumference = 2 * Math.PI * radius; // ~100
    const offset = circumference - (percentage / 100) * circumference;
    
    return `
        <svg class="kpi-chart-svg" viewBox="0 0 36 36">
            <path class="donut-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border-color)" stroke-width="3" />
            <path class="donut-value" stroke-dasharray="${percentage}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" />
        </svg>
    `;
}

export async function loadDrillStats() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const response = await fetch(`/api/user-data?username=${user.username}`);
        if(!response.ok) throw new Error("Could not fetch user data");
        const data = await response.json();
        
        drillStats = data.drillStats || {
            totalDrills: 0, totalCorrect: 0, totalQuestions: 0,
            dsc: { taken: 0, correct: 0, questions: 0 },
            radiotelephony: { taken: 0, correct: 0, questions: 0 },
            manual: { taken: 0, correct: 0, questions: 0 },
            history: []
        };
        return drillStats; // Return for immediate use

    } catch(e) {
        console.error("Failed to load drill stats:", e);
        showToast("No se pudieron cargar las estadísticas.", "error");
        drillStats = null;
        return null;
    }
}

async function saveDrillStats() {
    const user = getCurrentUser();
    if (!user || !drillStats) return;

    try {
        await fetch('/api/user-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: user.username,
                type: 'drill_stats',
                data: drillStats
            })
        });
    } catch(e) {
        console.error("Failed to save drill stats:", e);
        showToast("No se pudieron guardar las estadísticas.", "error");
    }
}


export async function updateDrillStats(score: number, totalQuestions: number, drillType: string) {
    if (!drillStats) await loadDrillStats();
    if (!drillStats) return; 

    drillStats.totalDrills++;
    drillStats.totalCorrect += score;
    drillStats.totalQuestions += totalQuestions;

    const safeType = drillType === 'dsc' || drillType === 'radiotelephony' ? drillType : 'manual';

    if (!drillStats[safeType as keyof DrillStats]) {
      (drillStats as any)[safeType] = { taken: 0, correct: 0, questions: 0 };
    }
    const statsForType = (drillStats as any)[safeType];
    statsForType.taken++;
    statsForType.correct += score;
    statsForType.questions += totalQuestions;

    drillStats.history.push({
        timestamp: new Date().toISOString(),
        type: drillType,
        score: score,
        total: totalQuestions
    });

    if (drillStats.history.length > 50) {
        drillStats.history.shift();
    }

    await saveDrillStats();
    // Note: Render triggers are now handled in SimulacroPage to include assigned data
}

/**
 * Checks answers and returns the score.
 */
export function checkDrillAnswers(data: any, container: HTMLDivElement): number {
    let score = 0;
    data.questions.forEach((q: any, index: number) => {
        const questionBlock = container.querySelector(`#question-${index}`) as HTMLElement;
        if (!questionBlock) return;

        const isOrdering = q.type === 'ordering';

        if (isOrdering) {
            const userOrderElements = questionBlock.querySelectorAll('.opt-text');
            const userOrder: string[] = [];
            userOrderElements.forEach(el => userOrder.push(el.textContent || ''));
            
            const isCorrect = JSON.stringify(userOrder) === JSON.stringify(q.options);
            
            if (isCorrect) {
                score++;
                questionBlock.style.border = '2px solid var(--success-color)';
            } else {
                questionBlock.style.border = '2px solid var(--danger-color)';
                const feedbackEl = document.createElement('div');
                feedbackEl.className = 'answer-feedback';
                feedbackEl.innerHTML = `<p style="color:var(--danger-color); font-weight:bold;">Orden Incorrecto.</p><p><strong>Orden Correcto:</strong></p><ol style="margin-left:1.5rem;">${q.options.map((o:string) => `<li>${o}</li>`).join('')}</ol>`;
                questionBlock.appendChild(feedbackEl);
            }
            questionBlock.querySelectorAll('button').forEach(b => (b as HTMLButtonElement).disabled = true);

        } else {
            const correctAnswerIndex = parseInt(q.correctAnswerIndex, 10);
            const selectedOption = container.querySelector<HTMLInputElement>(`input[name="question-${index}"]:checked`);
            
            questionBlock.querySelectorAll('.answer-option input').forEach(input => input.setAttribute('disabled', 'true'));
            
            const correctLabel = questionBlock.querySelector<HTMLLabelElement>(`label[for="q${index}-opt${correctAnswerIndex}"]`);
            if (correctLabel) correctLabel.classList.add('correct');

            if (selectedOption) {
                const selectedAnswerIndex = parseInt(selectedOption.value, 10);
                if (selectedAnswerIndex === correctAnswerIndex) {
                    score++;
                } else {
                    const selectedLabel = questionBlock.querySelector<HTMLLabelElement>(`label[for="q${index}-opt${selectedAnswerIndex}"]`);
                    if (selectedLabel) selectedLabel.classList.add('incorrect');
                }
            }
        }

        if (q.feedback && !questionBlock.querySelector('.answer-feedback')) {
            const feedbackEl = document.createElement('div');
            feedbackEl.className = 'answer-feedback';
            feedbackEl.innerHTML = `<p><strong>Explicación:</strong> ${q.feedback}</p>`;
            questionBlock.appendChild(feedbackEl);
        }
    });

    const resultsEl = container.querySelector('#drill-results') as HTMLDivElement;
    if (resultsEl) {
        resultsEl.innerHTML = `<h3>Resultado: ${score} de ${data.questions.length} correctas</h3>`;
        if (data.fullDetails) {
            const detailsEl = document.createElement('div');
            detailsEl.className = 'drill-full-details';
            detailsEl.innerHTML = `<h4>Detalles Completos del Escenario</h4><p>${data.fullDetails}</p>`;
            resultsEl.appendChild(detailsEl);
        }
    }
    
    updateDrillStats(score, data.questions.length, data.type);
    return score;
}


// --- ENHANCED RENDER FUNCTIONS (Stateless, data passed in) ---

export function renderDrillDashboard(personalStats: DrillStats | null, assignedDrills: any[]) {
    const container = document.getElementById('drill-dashboard-container');
    if (!container) return;

    // 1. Calculate Personal Metrics
    const pStats = personalStats || { totalDrills: 0, totalCorrect: 0, totalQuestions: 0 };
    const pAvg = pStats.totalQuestions > 0 ? (pStats.totalCorrect / pStats.totalQuestions) * 100 : 0;

    // 2. Calculate Assigned/Audited Metrics
    const completedAssigned = assignedDrills.filter(a => a.status === 'COMPLETED');
    const pendingAssigned = assignedDrills.filter(a => a.status === 'PENDING');
    
    let aTotalScore = 0;
    let aTotalMax = 0;
    completedAssigned.forEach(a => {
        aTotalScore += (a.score || 0);
        aTotalMax += (a.max_score || 0);
    });
    const aAvg = aTotalMax > 0 ? (aTotalScore / aTotalMax) * 100 : 0;

    container.innerHTML = `
        <div class="simulacro-side-panel">
            <h3 class="floating-panel-title">Estadísticas de Rendimiento</h3>
            
            <div class="kpi-grid">
                <!-- Personal Card -->
                <div class="kpi-card">
                    <div class="kpi-title">Personales</div>
                    <div class="kpi-chart-container">
                        ${renderDonutChart(pAvg, 'var(--accent-color)')}
                        <div class="kpi-value-text">${Math.round(pAvg)}%</div>
                    </div>
                    <div class="kpi-subtext">${pStats.totalDrills} realizados</div>
                </div>

                <!-- Assigned Card -->
                <div class="kpi-card">
                    <div class="kpi-title">Auditados</div>
                    <div class="kpi-chart-container">
                        ${renderDonutChart(aAvg, 'var(--info-color)')}
                        <div class="kpi-value-text">${Math.round(aAvg)}%</div>
                    </div>
                    <div class="kpi-subtext">${completedAssigned.length} completados</div>
                </div>
            </div>

            <div style="border-top: 1px solid var(--border-color); padding-top: 1rem;">
                <div class="stat-item">
                    <span>Simulacros Totales:</span>
                    <span style="font-weight:700;">${pStats.totalDrills + completedAssigned.length}</span>
                </div>
                <div class="stat-item">
                    <span>Pendientes de Auditoría:</span>
                    <span style="color: ${pendingAssigned.length > 0 ? 'var(--attention-color)' : 'var(--text-secondary)'}; font-weight:700;">${pendingAssigned.length}</span>
                </div>
            </div>
        </div>
    `;
}

export function renderDrillCalendar(personalStats: DrillStats | null, assignedDrills: any[]) {
    const container = document.getElementById('drill-calendar-container');
    if (!container) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString('es-ES', { month: 'long' });

    // --- DATA PREPARATION ---
    // Map: DateString -> Array of Event Objects
    const eventsMap: { [dateStr: string]: { type: 'personal'|'assigned'|'pending', score?: string, title: string }[] } = {};

    // 1. Personal History
    if (personalStats?.history) {
        personalStats.history.forEach(h => {
            const dateStr = new Date(h.timestamp).toDateString();
            if (!eventsMap[dateStr]) eventsMap[dateStr] = [];
            eventsMap[dateStr].push({
                type: 'personal',
                score: `${h.score}/${h.total}`,
                title: h.type === 'dsc' ? 'DSC' : (h.type === 'radiotelephony' ? 'Voz' : 'Manual')
            });
        });
    }

    // 2. Assigned Completed
    assignedDrills.forEach(a => {
        if (a.status === 'COMPLETED' && a.completed_at) {
            const dateStr = new Date(a.completed_at).toDateString();
            if (!eventsMap[dateStr]) eventsMap[dateStr] = [];
            eventsMap[dateStr].push({
                type: 'assigned',
                score: `${a.score}/${a.max_score}`,
                title: 'Auditado'
            });
        }
        // 3. Assigned Pending (Show on Created Date or Today if relevant, simplistic approach: Created Date)
        if (a.status === 'PENDING') {
            const dateStr = new Date(a.created_at).toDateString(); // Or calculate deadline
            if (!eventsMap[dateStr]) eventsMap[dateStr] = [];
            eventsMap[dateStr].push({
                type: 'pending',
                title: 'Asignado Pendiente'
            });
        }
    });

    // --- RENDER CALENDAR GRID ---
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    
    let calendarHtml = `
        <h3 class="floating-panel-title">Calendario de Actividad</h3>
        <div class="calendar-header" style="justify-content: center; font-weight: bold;">${monthName} ${year}</div>
        
        <div class="cal-legend">
            <div class="cal-legend-item"><span class="cal-legend-dot bg-personal"></span>Personal</div>
            <div class="cal-legend-item"><span class="cal-legend-dot bg-assigned"></span>Auditado</div>
            <div class="cal-legend-item"><span class="cal-legend-dot bg-pending"></span>Pendiente</div>
        </div>

        <div class="calendar-grid">
    `;
    
    dayNames.forEach(d => calendarHtml += `<div class="calendar-day-name">${d}</div>`);
    
    // Empty slots
    const startOffset = (firstDay === 0) ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) calendarHtml += `<div class="calendar-day empty"></div>`;

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateStr = currentDate.toDateString();
        const events = eventsMap[dateStr] || [];
        const isToday = dateStr === now.toDateString();
        
        let dotClass = '';
        // Prioritize colors: Pending > Assigned > Personal
        if (events.some(e => e.type === 'pending')) dotClass = 'cal-pending';
        else if (events.some(e => e.type === 'assigned')) dotClass = 'cal-assigned';
        else if (events.some(e => e.type === 'personal')) dotClass = 'cal-personal';

        calendarHtml += `
            <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
                ${day}
                ${dotClass ? `<span class="dot-indicator ${dotClass}"></span>` : ''}
            </div>
        `;
    }
    calendarHtml += `</div><div id="calendar-details-area" class="calendar-details" style="display:none;"></div>`;

    container.innerHTML = `<div class="simulacro-side-panel">${calendarHtml}</div>`;

    // --- EVENT LISTENERS FOR DETAILS ---
    const detailsArea = container.querySelector('#calendar-details-area') as HTMLElement;
    
    container.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            // UI Selection
            container.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            dayEl.classList.add('selected');

            const dateStr = dayEl.getAttribute('data-date');
            const events = eventsMap[dateStr!] || [];
            const displayDate = new Date(dateStr!).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long'});

            if (events.length === 0) {
                detailsArea.style.display = 'block';
                detailsArea.innerHTML = `<p style="font-size:0.85rem; color:var(--text-secondary); text-align:center; margin:0;">${displayDate}<br>Sin actividad.</p>`;
                return;
            }

            const listHtml = events.map(e => {
                let badgeClass = 'bg-personal';
                if(e.type === 'assigned') badgeClass = 'bg-assigned';
                if(e.type === 'pending') badgeClass = 'bg-pending';
                
                return `
                    <div class="cal-detail-item">
                        <div>
                            <span class="cal-detail-badge ${badgeClass}">${e.type === 'pending' ? 'Pendiente' : (e.type === 'assigned' ? 'Auditado' : 'Personal')}</span>
                            <span style="font-weight:500; margin-left:5px;">${e.title}</span>
                        </div>
                        ${e.score ? `<strong>${e.score}</strong>` : ''}
                    </div>
                `;
            }).join('');

            detailsArea.style.display = 'block';
            detailsArea.innerHTML = `<div style="font-size:0.9rem; font-weight:bold; margin-bottom:0.5rem; text-transform:capitalize;">${displayDate}</div>${listHtml}`;
        });
    });
}
