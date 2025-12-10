
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

// --- Client-side cache for dashboard data ---
let forecastCache: { data: any, timestamp: number } | null = null;
let warningsCache: { data: any, timestamp: number } | null = null;
const DASHBOARD_CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes


/**
 * Renders the warnings content into the card.
 * @param data - The data object containing the parsed warnings list.
 */
function renderWarningsContent(data: { warnings: { severity: string, text: string }[] }) {
    const warningsCard = document.getElementById('dashboard-warnings-card');
    if (!warningsCard) return;
    const warningsContent = warningsCard.querySelector('.dashboard-card-content');
    if (!warningsContent) return;

    if (data.warnings && data.warnings.length > 0) {
        const listHtml = data.warnings.slice(0, 4).map(w => { // Show top 4
            const isRed = w.severity === 'Extreme';
            const badgeClass = isRed ? 'alert-badge red' : 'alert-badge orange';
            const badgeText = isRed ? 'ROJO' : 'NARANJA';
            return `
                <div style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem; border-bottom: 1px solid var(--border-color);">
                    <span class="${badgeClass}" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">${badgeText}</span>
                    <span style="font-size: 0.9rem; color: var(--text-primary); line-height: 1.4;">${w.text}</span>
                </div>
            `;
        }).join('');

        const remaining = data.warnings.length - 4;
        const moreHtml = remaining > 0 ? `<div style="text-align: center; padding: 0.5rem; color: var(--text-secondary); font-size: 0.85rem;">... y ${remaining} más</div>` : '';

        warningsContent.innerHTML = `
            <div style="margin-bottom: 1rem; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: var(--bg-main);">
                ${listHtml}
                ${moreHtml}
            </div>
            <button class="secondary-btn" style="width: 100%; justify-content: center;" onclick="window.switchToPage(6)">
                Ver Todos en FFAA
            </button>
        `;
        warningsCard.classList.add('has-warnings');
    } else {
        warningsContent.innerHTML = `
            <div style="text-align: center; padding: 1.5rem 0;">
                <p class="drill-placeholder" style="margin-bottom: 1rem;">No hay avisos costeros de nivel Naranja o Rojo en vigor.</p>
                <button class="secondary-btn" onclick="window.switchToPage(6)">Ir a Pestaña FFAA</button>
            </div>
        `;
        warningsCard.classList.remove('has-warnings');
    }
}

/**
 * Fetches and renders the coastal weather warnings, using a client-side cache.
 * Now fetches from MeteoAlarm (consistent with FFAA page).
 */
async function initializeWarnings() {
    const warningsCard = document.getElementById('dashboard-warnings-card');
    if (!warningsCard) return;
    const warningsContent = warningsCard.querySelector('.dashboard-card-content');
    if (!warningsContent) return;

    const now = Date.now();
    if (warningsCache && (now - warningsCache.timestamp < DASHBOARD_CACHE_DURATION_MS)) {
        renderWarningsContent(warningsCache.data);
        return;
    }

    const skeletonHtml = `
        <div class="skeleton skeleton-text" style="width: 80%;"></div>
        <div class="skeleton skeleton-text" style="width: 60%;"></div>
        <div class="skeleton skeleton-text" style="width: 70%; margin-top: 1rem;"></div>
    `;
    warningsContent.innerHTML = skeletonHtml;

    try {
        // Updated Endpoint: /api/aemet?type=meteoalarm
        const response = await fetch('/api/aemet?type=meteoalarm');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'No se pudieron cargar los avisos.');
        }

        const data = await response.json();
        
        const activeWarnings: { severity: string, text: string, start: string }[] = [];
        const currentDate = new Date();

        if (data && Array.isArray(data.warnings)) {
            data.warnings.forEach((entry: any) => {
                // Find Spanish info block
                const info = entry.alert.info.find((i: any) => i.language === 'es-ES') || entry.alert.info[0];
                if (!info) return;

                // Check Expiration
                const expiresDate = new Date(info.expires);
                if (expiresDate <= currentDate) return;

                // Check Event Type (Coastal)
                const awarenessTypeParam = info.parameter?.find((p: any) => p.valueName === 'awareness_type');
                const isCoastal = (awarenessTypeParam && (awarenessTypeParam.value.includes('coastalevent') || awarenessTypeParam.value.startsWith('7;'))) 
                                  || (info.event.toLowerCase().includes('costero') || info.event.toLowerCase().includes('coastal'));

                // Check Severity (Orange/Red)
                const severity = info.severity;
                const isHighSeverity = severity === 'Severe' || severity === 'Extreme';

                if (isCoastal && isHighSeverity) {
                    info.area.forEach((area: any) => {
                        activeWarnings.push({
                            severity: severity,
                            text: `${area.areaDesc}: ${info.event}`,
                            start: info.onset || info.effective
                        });
                    });
                }
            });
        }
        
        // Sort: Red first, then by start date
        activeWarnings.sort((a, b) => {
            if (a.severity === 'Extreme' && b.severity !== 'Extreme') return -1;
            if (b.severity === 'Extreme' && a.severity !== 'Extreme') return 1;
            return new Date(a.start).getTime() - new Date(b.start).getTime();
        });

        const warningData = { warnings: activeWarnings };
        warningsCache = { data: warningData, timestamp: now };
        renderWarningsContent(warningData);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error al cargar avisos.";
        warningsContent.innerHTML = `<p class="error">${errorMessage}</p>`;
    }
}

/**
 * Renders the forecast table into its card.
 * @param data - The array of forecast data.
 */
function renderForecastContent(data: any) {
    const forecastCard = document.getElementById('dashboard-forecast-card');
    if (!forecastCard) return;
    const forecastContent = forecastCard.querySelector('.dashboard-card-content');
    if (!forecastContent) return;

    if (Array.isArray(data) && data.length > 0) {
        const tableHtml = `
            <table class="forecast-table">
                <thead>
                    <tr>
                        <th>Ubicación</th>
                        <th style="text-align: center;">Viento (Bft)</th>
                        <th style="text-align: center;">Olas (m)</th>
                        <th style="text-align: center;">Visib. (km)</th>
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
}


/**
 * Fetches and renders the point forecasts table, using a client-side cache.
 */
async function initializeForecast() {
    const forecastCard = document.getElementById('dashboard-forecast-card');
    if (!forecastCard) return;
    const forecastContent = forecastCard.querySelector('.dashboard-card-content');
    if (!forecastContent) return;
    
    const now = Date.now();
    if (forecastCache && (now - forecastCache.timestamp < DASHBOARD_CACHE_DURATION_MS)) {
        renderForecastContent(forecastCache.data);
        return;
    }
    
    const skeletonHtml = Array(8).fill(`<div class="skeleton skeleton-text" style="height: 2.5em; margin-bottom: 0.5rem;"></div>`).join('');
    forecastContent.innerHTML = skeletonHtml;

    try {
        const response = await fetch('/api/aemet?type=forecast');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'No se pudo cargar la previsión.');
        }

        const data = await response.json();
        forecastCache = { data, timestamp: now }; // Update cache
        renderForecastContent(data);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error al cargar la previsión.";
        forecastContent.innerHTML = `<p class="error">${errorMessage}</p>`;
    }
}

function getWindDirectionAngle(direction: string): number {
    const angles: {[key: string]: number} = {
        'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
        'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
        'S': 180, 'SSO': 202.5, 'SO': 225, 'OSO': 247.5, 'SSW': 202.5, 'SW': 225,
        'O': 270, 'ONO': 292.5, 'NO': 315, 'NNO': 337.5,
        'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5,
        'VAR': 0,
    };
    return angles[direction.toUpperCase()] || 0;
}

export function renderDashboard(container: HTMLElement) {
    const stats = JSON.parse(localStorage.getItem('sosgen_drill_stats') || JSON.stringify({
        totalDrills: 0, totalCorrect: 0, totalQuestions: 0
    }));

    const avgScore = stats.totalQuestions > 0 ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0;

    const icons = {
        stats: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>`,
        links: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>`,
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
                    <button class="secondary-btn" onclick="window.switchToPage(7)">Iniciar Simulacro</button>
                    <button class="secondary-btn" onclick="window.switchToPage(5)">Consultar Meteos</button>
                    <button class="secondary-btn" onclick="window.switchToPage(8, 'ref-tab-1')">Ver Directorio</button>
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
        </div>
    `;
    
    initializeWarnings();
    initializeForecast();
}
