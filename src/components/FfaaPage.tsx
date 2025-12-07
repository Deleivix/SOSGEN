
import { showToast } from "../utils/helpers";

type Warning = {
    id: string;
    area: string;
    event: string;
    severity: 'Severe' | 'Extreme'; // Orange | Red
    start: string;
    expires: string;
    description: string;
};

// Types based on the provided JSON structure
type MeteoParameter = {
    valueName: string;
    value: string;
};

type MeteoInfo = {
    language: string;
    area: { areaDesc: string; geocode: any[] }[];
    event: string;
    severity: string;
    description: string;
    effective: string;
    onset?: string;
    expires: string;
    parameter: MeteoParameter[];
};

type MeteoAlert = {
    alert: {
        identifier: string;
        info: MeteoInfo[];
    };
    uuid: string;
};

type MeteoResponse = {
    warnings: MeteoAlert[];
};

// --- RENDER LOGIC ---

function renderFfaaContent(warnings: Warning[]) {
    const container = document.getElementById('ffaa-content');
    if (!container) return;

    if (warnings.length === 0) {
        container.innerHTML = `
            <div class="attention-panel" style="background-color: #E8F5E9; border-color: #2E7D32; color: #1B5E20; text-align: center;">
                <h4 style="justify-content: center;">Sin Avisos Costeros Activos</h4>
                <p style="margin-bottom: 0;">No se han detectado avisos costeros de nivel Naranja o Rojo en el feed de MeteoAlarm.</p>
            </div>
        `;
        return;
    }

    // Sort by severity (Red first) then by start time
    const sortedWarnings = warnings.sort((a, b) => {
        if (a.severity === 'Extreme' && b.severity !== 'Extreme') return -1;
        if (b.severity === 'Extreme' && a.severity !== 'Extreme') return 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
    });

    const rowsHtml = sortedWarnings.map(w => {
        const severityClass = w.severity === 'Extreme' ? 'alert-badge red' : 'alert-badge orange';
        const severityLabel = w.severity === 'Extreme' ? 'ROJO' : 'NARANJA';
        
        // Clean up area description if needed (sometimes they have prefixes)
        const areaLabel = w.area;

        const formatTime = (iso: string) => {
            if (!iso) return '-';
            try {
                return new Date(iso).toLocaleString('es-ES', { 
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                });
            } catch { return iso; }
        };

        return `
            <tr>
                <td style="text-align: center;"><span class="${severityClass}">${severityLabel}</span></td>
                <td><strong>${areaLabel}</strong></td>
                <td>${w.event}</td>
                <td>${formatTime(w.start)}</td>
                <td>${formatTime(w.expires)}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="salvamento-panel">
            <div class="salvamento-panel-header">
                <h3>Avisos Costeros Activos (Naranja/Rojo)</h3>
                <span class="last-update-text">Fuente: MeteoAlarm (AEMET)</span>
            </div>
            <div class="table-wrapper">
                <table class="reference-table">
                    <thead>
                        <tr>
                            <th style="text-align: center;">Nivel</th>
                            <th>Zona</th>
                            <th>Fenómeno</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// --- DATA FETCHING & PARSING ---

async function fetchFfaaData() {
    const container = document.getElementById('ffaa-content');
    if (container) {
        container.innerHTML = `
            <div class="skeleton skeleton-box" style="height: 60px; margin-bottom: 1rem;"></div>
            <div class="skeleton skeleton-box" style="height: 300px;"></div>
        `;
    }

    try {
        const response = await fetch('/api/meteoalarm');
        if (!response.ok) throw new Error('Error al conectar con MeteoAlarm');
        
        const data: MeteoResponse = await response.json();
        
        const parsedWarnings: Warning[] = [];

        if (data && Array.isArray(data.warnings)) {
            data.warnings.forEach(entry => {
                // Find Spanish info block, fallback to first available
                const info = entry.alert.info.find(i => i.language === 'es-ES') || entry.alert.info[0];
                
                if (!info) return;

                // 1. Check Event Type
                // We check the parameters for 'awareness_type'. Coastal Event is usually type 7 or contains 'coastal'.
                const awarenessTypeParam = info.parameter?.find(p => p.valueName === 'awareness_type');
                const isCoastalParam = awarenessTypeParam && (
                    awarenessTypeParam.value.includes('coastalevent') || 
                    awarenessTypeParam.value.startsWith('7;')
                );
                
                // Fallback check on event string if parameter is missing (less reliable but safe)
                const isCoastalString = info.event.toLowerCase().includes('costero') || info.event.toLowerCase().includes('coastal');

                const isCoastal = isCoastalParam || isCoastalString;

                // 2. Check Severity
                // We only want Orange (Severe) or Red (Extreme)
                const severity = info.severity; // "Severe", "Extreme", "Moderate", "Minor"
                const isHighSeverity = severity === 'Severe' || severity === 'Extreme';

                if (isCoastal && isHighSeverity) {
                    // There can be multiple areas in one alert
                    info.area.forEach(area => {
                        parsedWarnings.push({
                            id: entry.uuid,
                            area: area.areaDesc,
                            event: info.event,
                            severity: severity as 'Severe' | 'Extreme',
                            start: info.onset || info.effective, // Prefer onset (start of event) over effective (publication time)
                            expires: info.expires,
                            description: info.description
                        });
                    });
                }
            });
        }

        renderFfaaContent(parsedWarnings);

    } catch (error) {
        console.error("FFAA Parsing Error:", error);
        const msg = error instanceof Error ? error.message : "Error desconocido";
        if (container) {
            container.innerHTML = `<p class="error">Error al cargar datos FFAA: ${msg}</p>`;
        }
        showToast("Error al cargar datos FFAA", "error");
    }
}

export function renderFfaaPage(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <div class="meteos-header">
                <div class="meteos-header-text">
                    <h2 class="content-card-title" style="margin-bottom: 0.5rem; border: none; padding: 0;">Fenómenos Adversos Costeros (FFAA)</h2>
                    <p class="translator-desc" style="margin-bottom: 0;">Avisos vigentes de nivel Naranja y Rojo.</p>
                </div>
                <button id="ffaa-refresh-btn" class="secondary-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
                    <span>Actualizar</span>
                </button>
            </div>
            <div id="ffaa-content"></div>
        </div>
    `;

    fetchFfaaData();

    container.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#ffaa-refresh-btn')) {
            fetchFfaaData();
        }
    });
}
