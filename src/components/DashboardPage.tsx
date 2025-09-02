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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.28a1 1 0 00-.948.684l-1.054 2.636a1 1 0 01-1.898 0L8.28 9.684A1 1 0 007.332 9H4a1 1 0 01-1-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" /><path d="M10 12.5a1.5 1.5 0 013 0V13a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.28a1 1 0 00-.948.684l-1.054 2.636a1 1 0 01-1.898 0L8.28 17.684A1 1 0 007.332 17H4a1 1 0 01-1-1v-2a1 1 0 011-1h3a1 1 0 001-1v-.5z" /></svg>
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0l-1.5-1.5a2 2 0 112.828-2.828l1.5 1.5l3-3zm-2.5 4a2 2 0 012.828 0l3 3a2 2 0 01-2.828 2.828l-3-3a2 2 0 010-2.828z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M4.586 12.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0l-1.5-1.5a2 2 0 112.828-2.828l1.5 1.5l3-3zm-2.5 4a2 2 0 012.828 0l3 3a2 2 0 01-2.828 2.828l-3-3a2 2 0 010-2.828z" clip-rule="evenodd" /></svg>
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.898 0V3a1 1 0 112 0v2.101a7.002 7.002 0 01-3.98 6.42l-1.12 3.362a1 1 0 01-1.96 0L8.08 11.523A7.002 7.002 0 014 9.101V3a1 1 0 011-1zm2 8.101a5.002 5.002 0 018.062-3.692 1 1 0 11-1.547-1.282A3.002 3.002 0 006 9.101V10a1 1 0 11-2 0v-.899z" clip-rule="evenodd" /></svg>
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