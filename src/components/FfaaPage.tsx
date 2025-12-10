
import { handleCopy, showToast } from "../utils/helpers";

type Warning = {
    id: string;
    area: string;
    event: string;
    severity: 'Severe' | 'Extreme'; // Orange | Red
    start: string;
    expires: string;
    issued: string; // Added for the bulletin (Effective date)
    description: string;
    certainty: string; // Added for probability
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
    certainty: string;
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

let currentWarnings: Warning[] = []; // Store warnings globally for the generator

// --- HELPER: MAP AREA TO COMMUNITY ---
function getCommunity(areaName: string): string {
    const a = areaName.toLowerCase();
    if (a.includes('asturia') || a.includes('asturiano')) return 'del Principado de Asturias';
    if (a.includes('cántabro') || a.includes('cantabria')) return 'de Cantabria';
    if (a.includes('vasco') || a.includes('bizkaia') || a.includes('gipuzkoa') || a.includes('vizcaya') || a.includes('guipúzcoa')) return 'del País Vasco';
    if (a.includes('coruña') || a.includes('lugo') || a.includes('pontevedra') || a.includes('mariña') || a.includes('rias baixas') || a.includes('fisterra') || a.includes('miño') || a.includes('costa da morte') || a.includes('ártabro')) return 'de Galicia';
    if (a.includes('barcelona') || a.includes('girona') || a.includes('tarragona') || a.includes('ampurdán') || a.includes('empordà')) return 'de Cataluña';
    if (a.includes('valencia') || a.includes('alicante') || a.includes('castellón')) return 'de la Comunidad Valenciana';
    if (a.includes('murcia') || a.includes('cartagena') || a.includes('mazarrón')) return 'de la Región de Murcia';
    if (a.includes('almería') || a.includes('granada') || a.includes('málaga') || a.includes('cádiz') || a.includes('huelva') || a.includes('estrecho') || a.includes('alborán') || a.includes('axarquía') || a.includes('sol') || a.includes('guadalhorce')) return 'de Andalucía';
    if (a.includes('mallorca') || a.includes('menorca') || a.includes('ibiza') || a.includes('formentera') || a.includes('baleares') || a.includes('tramontana') || a.includes('cabrera')) return 'de las Islas Baleares';
    if (a.includes('canaria') || a.includes('tenerife') || a.includes('palma') || a.includes('gomera') || a.includes('hierro') || a.includes('lanzarote') || a.includes('fuerteventura')) return 'de Canarias';
    if (a.includes('ceuta')) return 'de Ceuta';
    if (a.includes('melilla')) return 'de Melilla';
    return 'de la zona afectada'; // Generic fallback
}

// --- GENERATE BULLETIN TEXT ---
function generateBulletinText(warnings: Warning[]): string {
    if (warnings.length === 0) return "No hay avisos costeros vigentes para generar un boletín.";

    // Group by Community
    const grouped: { [key: string]: Warning[] } = {};
    
    warnings.forEach(w => {
        const comm = getCommunity(w.area);
        if (!grouped[comm]) grouped[comm] = [];
        grouped[comm].push(w);
    });

    // Sort communities (Cantabrico -> Mediterraneo -> Sur -> Islas)
    const orderPreference = [
        'de Galicia', 'del Principado de Asturias', 'de Cantabria', 'del País Vasco',
        'de Cataluña', 'de la Comunidad Valenciana', 'de la Región de Murcia', 'de Andalucía',
        'de las Islas Baleares', 'de Ceuta', 'de Melilla', 'de Canarias'
    ];
    
    const sortedCommunities = Object.keys(grouped).sort((a, b) => {
        const idxA = orderPreference.indexOf(a);
        const idxB = orderPreference.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    const regionListClean = sortedCommunities.map(c => c.replace('de ', '').replace('del ', '').replace('la ', '').replace('las ', '')).join(', ');

    // Determine Global Level for Header
    const hasRedGlobal = warnings.some(w => w.severity === 'Extreme');
    const hasOrangeGlobal = warnings.some(w => w.severity === 'Severe');
    let globalLevel = "naranja";
    if (hasRedGlobal && hasOrangeGlobal) globalLevel = "rojo y naranja";
    else if (hasRedGlobal) globalLevel = "rojo";

    // HEADER
    let text = `Boletín de fenómenos adversos nivel ${globalLevel} para ${regionListClean}.\n\n`;
    text += "Agencia estatal de Meteorología.\n\n";

    // Date formatting helpers
    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const hours = d.getHours().toString().padStart(2, '0'); // Local time
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${hours}, ${minutes}`;
    };
    
    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
    };

    // BODY - Iterate Communities
    sortedCommunities.forEach((comm) => {
        const commWarnings = grouped[comm];
        
        // Sort warnings by start time
        commWarnings.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        // Determine Highest Level for Community Header
        const hasRed = commWarnings.some(w => w.severity === 'Extreme');
        const hasOrange = commWarnings.some(w => w.severity === 'Severe');
        
        let levelHeader = "naranja";
        if (hasRed && hasOrange) levelHeader = "rojo y naranja";
        else if (hasRed) levelHeader = "rojo";

        text += `Información sobre fenómenos adversos de nivel ${levelHeader} para la comunidad autónoma ${comm}.\n\n`;
        
        // List Warnings
        commWarnings.forEach((w, index) => {
            const severitySpanish = w.severity === 'Extreme' ? 'rojo' : 'naranja';
            
            text += `Fenómeno costero número ${index + 1}.\n\n`;
            text += `Nivel, ${severitySpanish}.\n\n`;
            text += `Ámbito geográfico, ${w.area}.\n\n`;
            text += `Hora de comienzo, a las ${formatTime(w.start)} hora oficial del día ${formatDate(w.start)}.\n\n`;
            text += `Hora de finalización, a las ${formatTime(w.expires)} hora oficial del día ${formatDate(w.expires)}.\n\n`;
            text += `Comentario. ${w.description}\n\n`;
            
            // Add spacing between warnings but not after the last one of the block
            if (index < commWarnings.length - 1) {
                 text += " \n"; 
            }
        });
        
        text += " \n"; // Separator between communities
    });

    // FOOTER
    text += `Fin de los boletines de fenómenos adversos para ${regionListClean}.`;

    return text;
}

function renderBulletinModal(bulletinText: string) {
    const modalId = 'ffaa-bulletin-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = modalId;

    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 800px; text-align: left;">
            <h2 class="modal-title">Boletín FFAA Generado</h2>
            <p class="modal-text" style="margin-bottom: 1rem;">Formato listo para lectura en fonía (hora oficial local).</p>
            <textarea class="styled-textarea" style="height: 400px; font-family: var(--font-mono); line-height: 1.6;" readonly>${bulletinText}</textarea>
            <div class="button-container" style="justify-content: flex-end; margin-top: 1.5rem; border-top: none; padding-top: 0;">
                <button class="secondary-btn modal-close-btn">Cerrar</button>
                <button class="primary-btn modal-copy-btn" style="margin-top: 0; width: auto;">Copiar Texto</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    modalOverlay.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === modalOverlay || target.closest('.modal-close-btn')) {
            modalOverlay.remove();
        }
        if (target.closest('.modal-copy-btn')) {
            handleCopy(bulletinText);
        }
    });
}

// --- RENDER LOGIC ---

function renderFfaaContent(warnings: Warning[]) {
    const container = document.getElementById('ffaa-content');
    if (!container) return;

    if (warnings.length === 0) {
        container.innerHTML = `
            <div class="attention-panel" style="background-color: #E8F5E9; border-color: #2E7D32; color: #1B5E20; text-align: center;">
                <h4 style="justify-content: center;">Sin Avisos Costeros Activos</h4>
                <p style="margin-bottom: 0;">No se han detectado avisos costeros vigentes de nivel Naranja o Rojo en el feed de MeteoAlarm.</p>
            </div>
        `;
        return;
    }

    // Group by Community
    const grouped: { [key: string]: Warning[] } = {};
    warnings.forEach(w => {
        const comm = getCommunity(w.area);
        // Map generic "de la zona afectada" or empty to a misc key
        const key = (comm && comm !== 'de la zona afectada') ? comm : 'Otras Zonas';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(w);
    });

    // Sort communities (same preference order as bulletin)
    const orderPreference = [
        'de Galicia', 'del Principado de Asturias', 'de Cantabria', 'del País Vasco',
        'de Cataluña', 'de la Comunidad Valenciana', 'de la Región de Murcia', 'de Andalucía',
        'de las Islas Baleares', 'de Ceuta', 'de Melilla', 'de Canarias', 'Otras Zonas'
    ];
    
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const idxA = orderPreference.indexOf(a);
        const idxB = orderPreference.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    let htmlContent = `<div style="text-align: right; margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-secondary);">Fuente: MeteoAlarm (AEMET)</div>`;

    sortedKeys.forEach(key => {
        const commWarnings = grouped[key];
        
        // Sort warnings: Red first, then start time
        commWarnings.sort((a, b) => {
            if (a.severity === 'Extreme' && b.severity !== 'Extreme') return -1;
            if (b.severity === 'Extreme' && a.severity !== 'Extreme') return 1;
            return new Date(a.start).getTime() - new Date(b.start).getTime();
        });

        const rowsHtml = commWarnings.map(w => {
            const severityClass = w.severity === 'Extreme' ? 'alert-badge red' : 'alert-badge orange';
            const severityLabel = w.severity === 'Extreme' ? 'ROJO' : 'NARANJA';
            
            const now = new Date();
            const startDate = new Date(w.start);
            const isFuture = startDate > now;
            const statusLabel = isFuture ? 'FUTURO' : 'EN VIGOR';
            const statusStyle = isFuture 
                ? 'color: var(--info-color); border: 1px solid var(--info-color);' 
                : 'color: var(--accent-color-dark); border: 1px solid var(--accent-color-dark);';

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
                    <td style="text-align: center; vertical-align: top;"><span class="${severityClass}">${severityLabel}</span></td>
                    <td style="text-align: center; vertical-align: top;">
                        <span style="display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; white-space: nowrap; ${statusStyle}">${statusLabel}</span>
                    </td>
                    <td style="vertical-align: top;"><strong>${w.area}</strong></td>
                    <td style="vertical-align: top;">${w.event}</td>
                    <td style="vertical-align: top; font-size: 0.9em; line-height: 1.5;">${w.description}</td>
                    <td style="vertical-align: top; white-space: nowrap;">${formatTime(w.start)}</td>
                    <td style="vertical-align: top; white-space: nowrap;">${formatTime(w.expires)}</td>
                </tr>
            `;
        }).join('');

        // Clean name for display (e.g. "de Galicia" -> "Galicia")
        let displayName = key;
        if (key !== 'Otras Zonas') {
            displayName = key.replace(/^(de |del |la |las )/, '');
            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        }

        htmlContent += `
            <div class="salvamento-panel" style="margin-bottom: 2rem;">
                <div class="salvamento-panel-header" style="justify-content: flex-start; gap: 1rem;">
                    <h3>${displayName}</h3>
                    <span class="category-badge" style="background-color: var(--text-secondary); font-size: 0.75rem;">${commWarnings.length} Avisos</span>
                </div>
                <div class="table-wrapper">
                    <table class="reference-table">
                        <thead>
                            <tr>
                                <th style="text-align: center;">Nivel</th>
                                <th style="text-align: center;">Estado</th>
                                <th>Zona</th>
                                <th>Fenómeno</th>
                                <th style="min-width: 250px;">Descripción</th>
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
    });

    container.innerHTML = htmlContent;
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
        const now = new Date();

        if (data && Array.isArray(data.warnings)) {
            data.warnings.forEach(entry => {
                // Find Spanish info block, fallback to first available
                const info = entry.alert.info.find(i => i.language === 'es-ES') || entry.alert.info[0];
                
                if (!info) return;

                // 0. Check Expiration
                const expiresDate = new Date(info.expires);
                if (expiresDate <= now) {
                    return; // Skip expired warnings
                }

                // 1. Check Event Type
                const awarenessTypeParam = info.parameter?.find(p => p.valueName === 'awareness_type');
                const isCoastalParam = awarenessTypeParam && (
                    awarenessTypeParam.value.includes('coastalevent') || 
                    awarenessTypeParam.value.startsWith('7;')
                );
                
                const isCoastalString = info.event.toLowerCase().includes('costero') || info.event.toLowerCase().includes('coastal');
                const isCoastal = isCoastalParam || isCoastalString;

                // 2. Check Severity (Orange/Red)
                const severity = info.severity; 
                const isHighSeverity = severity === 'Severe' || severity === 'Extreme';

                if (isCoastal && isHighSeverity) {
                    info.area.forEach(area => {
                        parsedWarnings.push({
                            id: entry.uuid,
                            area: area.areaDesc,
                            event: info.event,
                            severity: severity as 'Severe' | 'Extreme',
                            start: info.onset || info.effective, 
                            expires: info.expires,
                            issued: info.effective,
                            description: info.description,
                            certainty: info.certainty
                        });
                    });
                }
            });
        }
        
        currentWarnings = parsedWarnings; 
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
                    <p class="translator-desc" style="margin-bottom: 0;">Avisos vigentes (no caducados) de nivel Naranja y Rojo.</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="ffaa-bulletin-btn" class="primary-btn-small">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/><path d="M4.5 10a.5.5 0 0 1 .5-.5h6.5a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h6.5a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5"/></svg>
                        <span>Generar Boletín</span>
                    </button>
                    <button id="ffaa-refresh-btn" class="secondary-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
                        <span>Actualizar</span>
                    </button>
                </div>
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
        if (target.closest('#ffaa-bulletin-btn')) {
            const text = generateBulletinText(currentWarnings);
            renderBulletinModal(text);
        }
    });
}
