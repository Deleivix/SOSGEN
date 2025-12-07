
import { showToast } from "../utils/helpers";

type Warning = {
    id: string;
    area: string;
    event: string;
    severity: 'Severe' | 'Extreme'; // Orange | Red
    effective: string;
    expires: string;
    description: string;
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

    const rowsHtml = warnings.map(w => {
        const severityClass = w.severity === 'Extreme' ? 'alert-badge red' : 'alert-badge orange';
        const severityLabel = w.severity === 'Extreme' ? 'ROJO' : 'NARANJA';
        
        // Basic translation/formatting for event types if needed, though usually mapped by logic
        const eventLabel = w.event === 'Coastal Event' ? 'COSTEROS' : w.event.toUpperCase();

        const formatTime = (iso: string) => {
            try {
                return new Date(iso).toLocaleString('es-ES', { 
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                });
            } catch { return iso; }
        };

        return `
            <tr>
                <td style="text-align: center;"><span class="${severityClass}">${severityLabel}</span></td>
                <td><strong>${w.area}</strong></td>
                <td>${eventLabel}</td>
                <td>${formatTime(w.effective)}</td>
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
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");
        
        const entries = Array.from(xmlDoc.querySelectorAll("entry"));
        const parsedWarnings: Warning[] = [];

        entries.forEach(entry => {
            // Namespace handling in DOMParser can be tricky depending on browser implementation of querySelector.
            // Using getElementsByTagName is safer for namespaced XML without explicit resolver.
            const getTagVal = (tagName: string) => {
                const els = entry.getElementsByTagName(tagName);
                // Try namespaced version if standard fails or vice versa logic handled by browser
                if (els.length > 0) return els[0].textContent || '';
                // Fallback for namespaced tags like cap:event
                const capEls = entry.getElementsByTagName("cap:" + tagName);
                if (capEls.length > 0) return capEls[0].textContent || '';
                return '';
            };

            const event = getTagVal('event');
            const severity = getTagVal('severity');
            
            // Filter Logic:
            // 1. Event must be related to coast. "Coastal Event" is the standard CAP category for MeteoAlarm.
            // 2. Severity must be 'Severe' (Orange) or 'Extreme' (Red).
            const isCoastal = event === 'Coastal Event' || event.toLowerCase().includes('coastal');
            const isHighSeverity = severity === 'Severe' || severity === 'Extreme';

            if (isCoastal && isHighSeverity) {
                parsedWarnings.push({
                    id: getTagVal('id'),
                    area: getTagVal('areaDesc'),
                    event: event,
                    severity: severity as 'Severe' | 'Extreme',
                    effective: getTagVal('effective'),
                    expires: getTagVal('expires'),
                    description: getTagVal('description') // Often empty in feed, implies detail link
                });
            }
        });

        renderFfaaContent(parsedWarnings);

    } catch (error) {
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
