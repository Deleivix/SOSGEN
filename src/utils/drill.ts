
import { getCurrentUser } from "./auth";
import { showToast } from "./helpers";

type DrillStats = {
    totalDrills: number;
    totalCorrect: number;
    totalQuestions: number;
    dsc: { taken: number; correct: number; questions: number; };
    radiotelephony: { taken: number; correct: number; questions: number; };
    history: {
        timestamp: string;
        type: string;
        score: number;
        total: number;
    }[];
}

let drillStats: DrillStats | null = null;

async function loadDrillStats() {
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
            history: []
        };

    } catch(e) {
        console.error("Failed to load drill stats:", e);
        showToast("No se pudieron cargar las estadísticas.", "error");
        drillStats = null;
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
    if (!drillStats) return; // if loading failed, abort

    drillStats.totalDrills++;
    drillStats.totalCorrect += score;
    drillStats.totalQuestions += totalQuestions;

    if (!drillStats[drillType as keyof DrillStats]) {
      (drillStats as any)[drillType] = { taken: 0, correct: 0, questions: 0 };
    }
    const statsForType = (drillStats as any)[drillType];
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
    
    // Refresh dashboard and calendar
    renderDrillDashboard();
    renderDrillCalendar();
}

/**
 * Checks answers and returns the score.
 */
export function checkDrillAnswers(data: any, container: HTMLDivElement): number {
    let score = 0;
    data.questions.forEach((q: any, index: number) => {
        const questionBlock = container.querySelector(`#question-${index}`) as HTMLElement;
        if (!questionBlock) return;
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

        if (q.feedback) {
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
    
    // Only update personal stats if it is NOT an assigned drill (caller handles assigned logic)
    // We assume if this function is called, it's a standard flow unless caller intervenes.
    // However, to keep it simple, we ALWAYS update stats here for "Personal" drills.
    // Assigned drills logic in SimulacroPage calls this but won't trigger updateDrillStats if separate.
    // FIX: We will update stats here. Assigned drills should essentially count towards practice too.
    updateDrillStats(score, data.questions.length, data.type);
    
    return score;
}


export async function renderDrillDashboard() {
    const container = document.getElementById('drill-dashboard-container');
    if (!container) return;

    if (!drillStats) await loadDrillStats();
    
    const stats = drillStats || { totalDrills: 0, totalCorrect: 0, totalQuestions: 0, dsc: { taken: 0 }, radiotelephony: { taken: 0 } };
    const avgScore = stats.totalQuestions > 0 ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0;

    container.innerHTML = `
        <div class="simulacro-side-panel">
            <h3 class="floating-panel-title">Estadísticas</h3>
            <div class="stat-item">
                <span>Total Simulacros:</span>
                <span>${stats.totalDrills}</span>
            </div>
            <div class="stat-item">
                <span>- DSC:</span>
                <span>${stats.dsc.taken}</span>
            </div>
            <div class="stat-item">
                <span>- Radiotelefonía:</span>
                <span>${stats.radiotelephony.taken}</span>
            </div>
            <div class="stat-item">
                <span>Puntuación Media:</span>
                <span>${avgScore.toFixed(1)}%</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${avgScore}%;"></div>
            </div>
        </div>
    `;
}

export async function renderDrillCalendar() {
    const container = document.getElementById('drill-calendar-container');
    if (!container) return;

    if (!drillStats) await loadDrillStats();

    const stats = drillStats || { history: [] };
    const drillDates = stats.history.map((h: any) => new Date(h.timestamp).toDateString());
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString('es-ES', { month: 'long' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let calendarHtml = `<div class="calendar-header"><span>${monthName} ${year}</span></div>`;
    calendarHtml += `<div class="calendar-grid">`;
    const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    dayNames.forEach(d => calendarHtml += `<div class="calendar-day-name">${d}</div>`);
    
    const startOffset = (firstDay === 0) ? 6 : firstDay - 1;

    for (let i = 0; i < startOffset; i++) {
        calendarHtml += `<div class="calendar-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const isToday = currentDate.toDateString() === now.toDateString();
        const hasDrill = drillDates.includes(currentDate.toDateString());
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (hasDrill) classes += ' has-drill';
        
        calendarHtml += `<div class="${classes}">${day}</div>`;
    }
    calendarHtml += `</div>`;
    
    let reminderHtml = '<div class="reminder-box">';
    if (stats.history.length > 0) {
        const lastDrillDate = new Date(stats.history[stats.history.length - 1].timestamp);
        const daysSinceLast = Math.floor((now.getTime() - lastDrillDate.getTime()) / (1000 * 3600 * 24));
        if (daysSinceLast <= 3) {
            reminderHtml += '¡Estás al día con tu entrenamiento! Sigue así.';
        } else if (daysSinceLast <= 7) {
            reminderHtml += 'Han pasado unos días. Considera realizar un nuevo simulacro pronto.';
        } else {
            reminderHtml = '<div class="reminder-box warning">';
            reminderHtml += `<strong>¡Atención!</strong> Llevas más de una semana sin practicar. ¡Es hora de un simulacro!`;
        }
    } else {
        reminderHtml += '¡Bienvenido! Realiza tu primer simulacro para empezar a registrar tu progreso.';
    }
    reminderHtml += `</div>`;


    container.innerHTML = `
        <div class="simulacro-side-panel">
            <h3 class="floating-panel-title">Calendario de Práctica</h3>
            ${calendarHtml}
            ${reminderHtml}
        </div>
    `;
}
