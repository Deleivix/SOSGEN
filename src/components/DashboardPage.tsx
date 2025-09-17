// Fix: Implement the DashboardPage component to provide the main landing page for the application.
import { APP_PAGES, APP_PAGE_ICONS } from '../data';

// Define types for the forecast data to ensure type safety
interface Forecast {
    locationName: string;
    windDirection: string;
    windForceBft: number;
    waveHeightMeters: number;
    visibilityKm: number;
    weatherSummary: string;
    weatherIcon: string;
}

// Skeleton loaders for a better UX while data is fetching
function getWarningsSkeleton(): string {
    return `
        <div class="dashboard-card-header">
             <div class="skeleton skeleton-icon" style="width: 24px; height: 24px; border-radius: 50%;"></div>
             <div class="skeleton skeleton-text" style="height: 1.2em; width: 40%;"></div>
        </div>
        <div class="warnings-content">
            <div class="skeleton skeleton-text" style="width: 90%; margin-top: 1rem;"></div>
            <div class="skeleton skeleton-text" style="width: 70%;"></div>
        </div>
    `;
}

function getForecastSkeleton(): string {
    let skeletonItems = '';
    for (let i = 0; i < 10; i++) {
        skeletonItems += `<div class="forecast-item skeleton"><div class="skeleton-icon"></div><div class="skeleton-text-group"><div class="skeleton-text"></div><div class="skeleton-text short"></div></div></div>`;
    }
    return `
        <div class="dashboard-card-header">
             <div class="skeleton skeleton-icon" style="width: 24px; height: 24px; border-radius: 50%;"></div>
             <div class="skeleton skeleton-text" style="height: 1.2em; width: 60%;"></div>
        </div>
        <div class="forecast-grid">${skeletonItems}</div>
    `;
}

// Function to render the warnings card once data is available
function renderWarnings(container: HTMLElement, summary: string | null) {
    let content = '';
    if (summary && summary.trim()) {
        content = `<p>${summary.replace(/\n/g, '<br>')}</p>`;
    } else {
        content = `<p class="no-warnings">No hay avisos de temporal (gale warnings) activos para las zonas costeras gestionadas.</p>`;
    }

    container.innerHTML = `
        <div class="dashboard-card-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <h3>Avisos Activos</h3>
        </div>
        <div class="warnings-content">${content}</div>
    `;
    container.classList.remove('skeleton');
}

// Function to get the correct weather icon SVG
function getWeatherIcon(iconName: string): string {
    const icons: { [key: string]: string } = {
        'sunny': `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
        'partly-cloudy': `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M12 2L12 5"></path><path d="M22 12L19 12"></path><path d="M4.2 4.2L6.3 6.3"></path><path d="M17.7 17.7L19.8 19.8"></path></svg>`,
        'cloudy': `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`,
        'rain': `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M8 14v6"></path><path d="M12 16v6"></path><path d="M16 14v6"></path></svg>`,
        'heavy-rain': `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M7 14v6"></path><path d="M11 14v6"></path><path d="M15 14v6"></path><path d="M19 14v6"></path></svg>`,
        'thunderstorm': `<svg viewBox="0 0 24 24"><path d="M21 16.92V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V17"></path><path d="M17 12.92A8 8 0 1 0 5.42 15"></path><polygon points="13 11 9 17 15 17 11 23"></polygon></svg>`,
        'windy': `<svg viewBox="0 0 24 24"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg>`,
        'fog': `<svg viewBox="0 0 24 24"><path d="M20 12h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M2 17h20"></path><path d="M2 12h20"></path></svg>`,
    };
    return icons[iconName] || icons['cloudy'];
}


// Function to render the forecast card once data is available
function renderForecast(container: HTMLElement, forecastData: Forecast[]) {
    container.innerHTML = `
        <div class="dashboard-card-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg>
            <h3>Previsión Marítima (24h)</h3>
        </div>
        <div class="forecast-grid">
            ${forecastData.map(item => `
                <div class="forecast-item">
                    <div class="forecast-icon" title="${item.weatherSummary}">${getWeatherIcon(item.weatherIcon)}</div>
                    <div class="forecast-details">
                        <span class="location">${item.locationName}</span>
                        <span class="conditions">
                            <span title="Viento">${item.windDirection} F${item.windForceBft}</span>
                            <span class="separator">|</span>
                            <span title="Oleaje">${item.waveHeightMeters.toFixed(1)}m</span>
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
     container.classList.remove('skeleton');
}

export function renderDashboard(container: HTMLElement) {
    // Initial HTML structure with quick links and placeholders for dynamic content
    container.innerHTML = `
        <h1 class="dashboard-title">Dashboard del Operador</h1>
        <p class="dashboard-subtitle">Vista rápida de avisos, previsión y herramientas principales.</p>
        
        <div class="dashboard-grid">
            <div id="warnings-container" class="dashboard-card warnings-card skeleton">
                ${getWarningsSkeleton()}
            </div>

            <div id="forecast-container" class="dashboard-card forecast-card skeleton">
                ${getForecastSkeleton()}
            </div>

            <div class="dashboard-card quick-links-card">
                <div class="dashboard-card-header">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>
                    <h3>Herramientas Frecuentes</h3>
                </div>
                <div class="quick-links-grid">
                    ${APP_PAGES.slice(1, 7).map((page, index) => `
                        <a href="#${page.name.toLowerCase().replace(/\s+/g, '-')}" class="quick-link-item" data-page="${page.name}">
                            ${APP_PAGE_ICONS[index+1]}
                            <span>${page.name}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Asynchronously fetch and render dynamic data
    loadWarnings();
    loadForecast();
}

async function loadWarnings() {
    const container = document.getElementById('warnings-container');
    if (!container) return;

    try {
        // The /api/warnings endpoint is a GET request
        const response = await fetch('/api/warnings');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ details: 'Error de red o respuesta no válida.' }));
            throw new Error(errorData.details || 'Fallo al obtener los avisos.');
        }
        const data = await response.json();
        renderWarnings(container, data.summary);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        container.innerHTML = `<div class="dashboard-card warnings-card error"><p>No se pudieron cargar los avisos: ${errorMessage}</p></div>`;
    }
}

async function loadForecast() {
    const container = document.getElementById('forecast-container');
    if (!container) return;

    try {
        const response = await fetch('/api/forecast', { method: 'POST' }); // This endpoint is POST
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ details: 'Error de red o respuesta no válida.' }));
            throw new Error(errorData.details || 'Fallo al obtener la previsión.');
        }
        const data: Forecast[] = await response.json();
        renderForecast(container, data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        container.innerHTML = `<div class="dashboard-card forecast-card error"><p>No se pudo cargar la previsión: ${errorMessage}</p></div>`;
    }
}
