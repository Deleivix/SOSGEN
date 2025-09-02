async function initializeDashboard() {
    const warningsCard = document.getElementById('dashboard-warnings-card');
    if (!warningsCard) return;

    const warningsContent = warningsCard.querySelector('.dashboard-card-content');
    if (!warningsContent) return;

    const skeletonHtml = `
        <div class="skeleton skeleton-text" style="width: 80%;"></div>
        <div class="skeleton skeleton-text" style="width: 60%;"></div>
        <div class="skeleton skeleton-text" style="width: 70%; margin-top: 1rem;"></div>
    `;
    warningsContent.innerHTML = skeletonHtml;

    try {
        const response = await fetch('/api/warnings');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'No se pudieron cargar los avisos.');
        }

        const data = await response.json();
        if (data.summary && data.summary.trim() !== '') {
            warningsContent.innerHTML = `<pre class="warnings-card-content">${data.summary}</pre>`;
            warningsCard.classList.add('has-warnings');
        } else {
            warningsContent.innerHTML = '<p class="drill-placeholder" style="padding: 1rem 0;">No hay avisos costeros en vigor.</p>';
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error al cargar avisos.";
        warningsContent.innerHTML = `<p class="error">${errorMessage}</p>`;
    }
}


export function renderDashboard(container: HTMLElement) {
    const stats = JSON.parse(localStorage.getItem('sosgen_drill_stats') || JSON.stringify({
        totalDrills: 0, totalCorrect: 0, totalQuestions: 0
    }));
    const logbook = JSON.parse(localStorage.getItem('sosgen_logbook') || '[]');

    const avgScore = stats.totalQuestions > 0 ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0;

    const icons = {
        stats: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>`,
        links: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>`,
        history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
        warnings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`
    };

    container.innerHTML = `
        <div class="dashboard-grid">
            <!-- Windy Map Card -->
            <div class="dashboard-card full-width">
                <h2 class="dashboard-card-title">${icons.map}<span>Mapa Meteorológico</span></h2>
                <div class="windy-map-container">
                    <iframe width="1200" height="800" src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=kt&zoom=5&overlay=wind&product=ecmwf&level=surface&lat=39.977&lon=4.966&detailLat=43.317&detailLon=-8.433&detail=true&pressure=true&message=true" frameborder="0"></iframe>
                </div>
            </div>

            <!-- Weather Warnings Card -->
            <div class="dashboard-card" id="dashboard-warnings-card">
                <h2 class="dashboard-card-title">${icons.warnings}<span>Avisos Costeros (Galicia/Cantábrico)</span></h2>
                <div class="dashboard-card-content">
                    <!-- Content will be loaded by JS -->
                </div>
            </div>

            <!-- Quick Links Card -->
            <div class="dashboard-card">
                 <h2 class="dashboard-card-title">${icons.links}<span>Accesos Rápidos</span></h2>
                 <div class="quick-links">
                    <button class="secondary-btn" onclick="window.switchToPage(1)">Generar SOSGEN</button>
                    <button class="secondary-btn" onclick="window.switchToPage(6)">Iniciar Simulacro</button>
                    <button class="secondary-btn" onclick="window.switchToPage(4)">Consultar Meteos</button>
                    <button class="secondary-btn" onclick="window.switchToPage(7, 'ref-tab-1')">Ver Directorio</button>
                </div>
            </div>
            
            <!-- Stats Card -->
            <div class="dashboard-card">
                <h2 class="dashboard-card-title">${icons.stats}<span>Resumen de Simulacros</span></h2>
                <div class="dashboard-card-content">
                    <div class="stat-item">
                        <span>Total Realizados:</span>
                        <span>${stats.totalDrills}</span>
                    </div>
                    <div class="stat-item">
                        <span>Puntuación Media:</span>
                        <span>${avgScore.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar-container" style="margin-top: 0.5rem;">
                        <div class="progress-bar" style="width: ${avgScore}%;"></div>
                    </div>
                </div>
            </div>
            
            <!-- Recent History Card -->
            <div class="dashboard-card full-width">
                 <h2 class="dashboard-card-title">${icons.history}<span>Últimos Mensajes Generados (Bitácora)</span></h2>
                ${logbook.length === 0 
                    ? '<div class="dashboard-card-content"><p class="drill-placeholder">No hay mensajes recientes.</p></div>' 
                    : `<div class="dashboard-card-content dashboard-history-list">
                        ${logbook.slice(-3).reverse().map((entry: any) => `
                            <div class="dashboard-history-entry" onclick="window.switchToPage(8)">
                                <span class="history-entry-ts">${new Date(entry.timestamp).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                <p class="history-entry-content">${(entry.content.spanish.split('\n')[4] || 'Detalles no disponibles').substring(0, 100)}...</p>
                            </div>
                        `).join('')}
                       </div>`
                }
            </div>
        </div>
    `;
    
    initializeDashboard();
}
