export function renderDashboard(container: HTMLElement) {
    const stats = JSON.parse(localStorage.getItem('sosgen_drill_stats') || JSON.stringify({
        totalDrills: 0, totalCorrect: 0, totalQuestions: 0
    }));
    const logbook = JSON.parse(localStorage.getItem('sosgen_logbook') || '[]');

    const avgScore = stats.totalQuestions > 0 ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0;

    container.innerHTML = `
        <div class="dashboard-grid">
            <!-- Stats Card -->
            <div class="dashboard-card">
                <h2 class="dashboard-card-title">
                    <span>Resumen de Simulacros</span>
                </h2>
                <div class="stat-item">
                    <span>Total Simulacros Realizados:</span>
                    <span>${stats.totalDrills}</span>
                </div>
                <div class="stat-item">
                    <span>Puntuación Media Global:</span>
                    <span>${avgScore.toFixed(1)}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${avgScore}%;"></div>
                </div>
            </div>
            
            <!-- Quick Links Card -->
            <div class="dashboard-card">
                 <h2 class="dashboard-card-title">
                    <span>Accesos Rápidos</span>
                </h2>
                 <div class="quick-links">
                    <button class="secondary-btn" onclick="window.switchToPage(1)">Generar Mensaje SOSGEN</button>
                    <button class="secondary-btn" onclick="window.switchToPage(2, 'sub-tab-Programados')">Plantilla: Entrada de Guardia</button>
                    <button class="secondary-btn" onclick="window.switchToPage(2, 'sub-tab-Transmisiones')">Plantilla: Transmisión WX</button>
                    <button class="secondary-btn" onclick="window.switchToPage(5)">Iniciar un Simulacro</button>
                </div>
            </div>

            <!-- Recent History Card -->
            <div class="dashboard-card">
                 <h2 class="dashboard-card-title">
                    <span>Últimos Mensajes Generados</span>
                </h2>
                ${logbook.length === 0 
                    ? '<p class="drill-placeholder">No hay mensajes recientes.</p>' 
                    : `<div class="history-list">
                        ${logbook.slice(-3).reverse().map((entry: any) => `
                            <div class="history-entry" data-id="${entry.id}">
                                <div class="history-entry-header">
                                    <span class="history-entry-ts">${new Date(entry.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                                </div>
                                <div class="history-entry-content">
                                   ${entry.content.spanish.split('\n')[4] || 'Detalles no disponibles'}
                                </div>
                            </div>
                        `).join('')}
                       </div>`
                }
            </div>
        </div>
    `;
}