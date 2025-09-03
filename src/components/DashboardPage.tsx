/**
 * Renders a specific weather icon as an SVG string.
 * @param iconName - The name of the icon to render.
 * @returns An SVG string for the weather icon.
 */
function renderWeatherIcon(iconName: string): string {
    const icons: { [key: string]: string } = {
        'sunny': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
        'partly-cloudy': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M12 2L12 4"></path><path d="M20 12L22 12"></path><path d="M4.929 4.929L6.343 6.343"></path></svg>`,
        'cloudy': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`,
        'rain': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><line x1="12" y1="14" x2="12" y2="22"></line><line x1="16" y1="14" x2="16" y2="20"></line><line x1="8" y1="14" x2="8" y2="20"></line></svg>`,
        'heavy-rain': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M12 14v8"></path><path d="M16 14v6"></path><path d="M8 14v6"></path><path d="M10 12v-1"></path><path d="M14 12v-1"></path></svg>`,
        'thunderstorm': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><polyline points="13 11 10 15 13 15 11 19"></polyline></svg>`,
        'windy': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg>`,
        'fog': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M7 12V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4M4 16h16M10 20h4"></path></svg>`
    };
    return icons[iconName] || icons['cloudy']; // Default to cloudy
}

/**
 * Renders an SVG icon representing the atmospheric pressure trend.
 * @param trend - The pressure trend ('rising', 'falling', or 'steady').
 * @returns An SVG string for the trend icon.
 */
function renderPressureTrendIcon(trend: string): string {
    const icons: { [key: string]: string } = {
        'rising': `<svg class="pressure-trend-icon rising" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 8h6v8h4v-8h6z"/></svg>`,
        'falling': `<svg class="pressure-trend-icon falling" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l8-8h-6V4h-4v8H4z"/></svg>`,
        'steady': `<svg class="pressure-trend-icon steady" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`
    };
    return icons[trend] || '';
}

/**
 * Fetches and renders the coastal weather warnings.
 */
async function initializeWarnings() {
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

/**
 * Fetches and renders the point forecasts table.
 */
async function initializeForecast() {
    const forecastCard = document.getElementById('dashboard-forecast-card');
    if (!forecastCard) return;

    const forecastContent = forecastCard.querySelector('.dashboard-card-content');
    if (!forecastContent) return;
    
    const skeletonHtml = Array(8).fill(`<div class="skeleton skeleton-text" style="height: 2.5em; margin-bottom: 0.5rem;"></div>`).join('');
    forecastContent.innerHTML = skeletonHtml;

    try {
        const response = await fetch('/api/forecast', { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'No se pudo cargar la previsión.');
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            const tableHtml = `
                <table class="forecast-table">
                    <thead>
                        <tr>
                            <th>Ubicación</th>
                            <th style="text-align: center;">Viento (Bft)</th>
                            <th style="text-align: center;">Olas (m)</th>
                            <th style="text-align: center;">Visib. (km)</th>
                            <th style="text-align: center;">Presión</th>
                            <th style="text-align: center;">T. Aire</th>
                            <th style="text-align: center;">T. Mar</th>
                            <th style="text-align: center;">Tiempo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(f => `
                            <tr>
                                <td><strong>${f.locationName}</strong></td>
                                <td style="text-align: center;">
                                    <svg class="wind-icon" style="transform: rotate(${getWindDirectionAngle(f.windDirection)}deg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V3M7 8l5-5 5 5"/></svg>
                                    ${f.windForceBft}
                                </td>
                                <td style="text-align: center;">${f.waveHeightMeters.toFixed(1)}</td>
                                <td style="text-align: center;">${f.visibilityKm}</td>
                                <td style="text-align: center;" class="pressure-cell">
                                    <span>${f.pressureHpa}</span>
                                    ${renderPressureTrendIcon(f.pressureTrend)}
                                </td>
                                <td style="text-align: center;">${f.airTemperatureCelsius}°C</td>
                                <td style="text-align: center;">${f.seaTemperatureCelsius}°C</td>
                                <td style="text-align: center;">
                                    <div class="weather-icon" title="${f.weatherSummary || ''}">${renderWeatherIcon(f.weatherIcon)}</div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            forecastContent.innerHTML = tableHtml;
        } else {
            forecastContent.innerHTML = '<p class="drill-placeholder">No se pudo obtener la previsión.</p>';
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error al cargar la previsión.";
        forecastContent.innerHTML = `<p class="error">${errorMessage}</p>`;
    }
}

function getWindDirectionAngle(direction: string): number {
    const angles: {[key: string]: number} = {
        'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
        'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
        'S': 180, 'SSO': 202.5, 'SO': 225, 'OSO': 247.5,
        'O': 270, 'ONO': 292.5, 'NO': 315, 'NNO': 337.5,
        'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5,
        'SW': 225, 'SSW': 202.5
    };
    return angles[direction.toUpperCase()] || 0;
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
        map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
        forecast: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M7 12V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4M4 16h16M10 20h4"></path></svg>`
    };

    container.innerHTML = `
        <div class="dashboard-grid">
            <!-- Windy Map Card -->
            <div class="dashboard-card map-card">
                <h2 class="dashboard-card-title">${icons.map}<span>Mapa Meteorológico</span></h2>
                <div class="dashboard-card-content">
                    <div class="windy-map-container">
                        <iframe width="1200" height="800" src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=kt&zoom=5&overlay=wind&product=ecmwf&level=surface&lat=39.977&lon=4.966&detailLat=43.317&detailLon=-8.433&detail=true&pressure=true&message=true" frameborder="0"></iframe>
                    </div>
                </div>
            </div>

            <!-- Forecast Card -->
            <div class="dashboard-card forecast-card" id="dashboard-forecast-card">
                <h2 class="dashboard-card-title">${icons.forecast}<span>Previsión Costera (24h)</span></h2>
                <div class="dashboard-card-content">
                    <!-- Content will be loaded by JS -->
                </div>
            </div>

            <!-- Weather Warnings Card -->
            <div class="dashboard-card warnings-card" id="dashboard-warnings-card">
                <h2 class="dashboard-card-title">${icons.warnings}<span>Avisos Costeros</span></h2>
                <div class="dashboard-card-content">
                    <!-- Content will be loaded by JS -->
                </div>
            </div>

            <!-- Quick Links Card -->
            <div class="dashboard-card links-card">
                 <h2 class="dashboard-card-title">${icons.links}<span>Accesos Rápidos</span></h2>
                 <div class="quick-links">
                    <button class="secondary-btn" onclick="window.switchToPage(1)">Generar SOSGEN</button>
                    <button class="secondary-btn" onclick="window.switchToPage(6)">Iniciar Simulacro</button>
                    <button class="secondary-btn" onclick="window.switchToPage(4)">Consultar Meteos</button>
                    <button class="secondary-btn" onclick="window.switchToPage(7, 'ref-tab-1')">Ver Directorio</button>
                </div>
            </div>
            
            <!-- Stats Card -->
            <div class="dashboard-card stats-card">
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
            <div class="dashboard-card history-card">
                 <h2 class="dashboard-card-title">${icons.history}<span>Últimos Mensajes (Bitácora)</span></h2>
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
    
    initializeWarnings();
    initializeForecast();
}