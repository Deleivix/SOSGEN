

import { 
    QUICK_REFERENCE_DATA, 
    PHONE_DIRECTORY_DATA, 
    VHF_FREQUENCIES_DATA,
    PHONETIC_ALPHABET_DATA,
    Q_CODES_DATA,
    BEAUFORT_SCALE_DATA,
    DOUGLAS_SCALE_DATA,
    ReferenceTableData
} from "../data";
import { debounce, initializeInfoTabs, showToast } from "../utils/helpers";

/**
 * Generates an HTML string for a reference table from structured data.
 * @param config - The table configuration.
 * @returns An HTML string representing the table.
 */
function renderReferenceTable(config: {
    caption?: string;
    captionClass?: string;
    headers: string[];
    rows: string[][];
}): string {
    return `
        <table class="reference-table">
            ${config.caption ? `<caption class="${config.captionClass || ''}">${config.caption}</caption>` : ''}
            <thead>
                <tr>${config.headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${config.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
            </tbody>
        </table>
    `;
}


export function renderInfo(container: HTMLElement) {
    const fullQuickRefData = [...QUICK_REFERENCE_DATA];
    
    // Dynamically populate content for each tab
    fullQuickRefData[0].content = `
        <div class="mmsi-searcher">
            <h3 class="reference-table-subtitle">Buscador Inteligente de Buques por MMSI (OSINT)</h3>
            <p class="translator-desc">Introduzca un MMSI (Identidad del Servicio Móvil Marítimo) de 9 dígitos para buscar información pública del buque utilizando IA para consultar bases de datos oficiales y de seguimiento.</p>
            <form id="mmsi-search-form" class="simulator-form" style="max-width: none;">
                <input type="text" id="mmsi-search-input" class="simulator-input" placeholder="Introduzca MMSI de 9 dígitos..." pattern="[0-9]{9}" title="Debe ser un número de 9 dígitos." required>
                <button id="mmsi-search-btn" class="simulator-btn" type="submit">Buscar</button>
            </form>
            <div id="mmsi-result-container">
                 <p class="drill-placeholder">Introduzca un MMSI para comenzar la búsqueda.</p>
            </div>
        </div>`;

    fullQuickRefData[1].content = `
        <h3 class="reference-table-subtitle">Directorio Telefónico Marítimo</h3>
        <input type="search" id="phone-search-input" class="phone-directory-search" placeholder="Buscar por nombre, centro, etc.">
        <div id="phone-directory-list" class="phone-directory-list"></div>`;

    fullQuickRefData[2].content = `
        <h3 class="reference-table-subtitle">Canales VHF</h3>
        <div class="vhf-tables-container">
            ${VHF_FREQUENCIES_DATA.map(tableData => renderReferenceTable(tableData)).join('')}
        </div>`;

    fullQuickRefData[3].content = `<div class="info-table-wrapper">${renderReferenceTable(PHONETIC_ALPHABET_DATA)}</div>`;
    
    fullQuickRefData[4].content = `<div class="info-table-wrapper">${renderReferenceTable(Q_CODES_DATA)}</div>`;
    
    fullQuickRefData[5].content = `
        <div class="info-table-wrapper">
            <h3 class="reference-table-subtitle">Escala Beaufort / Beaufort Wind Scale</h3>
            ${renderReferenceTable(BEAUFORT_SCALE_DATA)}
            <h3 class="reference-table-subtitle">Escala Douglas / Douglas Sea Scale</h3>
            ${renderReferenceTable(DOUGLAS_SCALE_DATA)}
        </div>`;

    fullQuickRefData[6].content = `
        <div class="coord-converter info-table-wrapper">
            <h3 class="reference-table-subtitle">Conversor de Coordenadas</h3>
            <p class="translator-desc">Introduzca un par de coordenadas (Latitud y Longitud) para convertirlas al formato estándar <strong>gg° mm,ddd' N/S ggg° mm,ddd' E/W</strong>. Use espacios como separadores.</p>
            <div class="converter-form">
                <textarea id="coord-input" class="styled-textarea" rows="2" placeholder="Ej: 43 21 30.5 N 008 25 15 W\nEj: 43 21.5 N 008 25.2 W\nEj: 43.358 -8.420"></textarea>
                <button id="coord-convert-btn" class="primary-btn">Convertir</button>
            </div>
            <div id="coord-result" class="translation-result" aria-live="polite"></div>
        </div>`;
        
    fullQuickRefData[7].content = `
        <div class="info-table-wrapper">
            <div class="nautical-translator">
                <h3 class="reference-table-subtitle">Traductor Náutico (IA)</h3>
                <p class="translator-desc">Traduce términos o frases cortas entre español e inglés.</p>
                <textarea id="translator-input" class="styled-textarea" rows="3" placeholder="Ej: virar por avante"></textarea>
                <button id="translator-btn" class="primary-btn">Traducir</button>
                <div id="translator-result" class="translation-result"></div>
            </div>
            <h3 class="reference-table-subtitle">Términos Comunes / Common Terms</h3>
            ${renderReferenceTable({
                headers: ['Español', 'Inglés'],
                rows: [
                    ['Babor', 'Port'], ['Estribor', 'Starboard'], ['Proa', 'Bow'], ['Popa', 'Stern'],
                    ['Barlovento', 'Windward'], ['Sotavento', 'Leeward'], ['Nudo', 'Knot'],
                    ['Ancla', 'Anchor'], ['Timón', 'Rudder'], ['Deriva', 'Leeway / Drift'],
                    ['Rumbo', 'Heading / Course'], ['Escora', 'Heel / List']
                ]
            })}
        </div>`;

    container.innerHTML = `
        <div class="content-card">
            <div class="info-nav-tabs">
                 ${fullQuickRefData.map((item, index) => `
                    <button class="info-nav-btn ${index === 0 ? 'active' : ''}" data-target="ref-tab-${index}">
                        ${item.category}
                    </button>
                `).join('')}
            </div>
            <main class="info-content">
                ${fullQuickRefData.map((item, index) => `
                    <div class="sub-tab-panel ${index === 0 ? 'active' : ''}" id="ref-tab-${index}">
                       ${item.content}
                    </div>
                `).join('')}
            </main>
        </div>
    `;
    initializeInfoTabs(container);
    initializeMmsiSearcher();
    initializePhoneDirectory();
    initializeNauticalTranslator();
    initializeCoordinateConverter();
}

function renderMmsiResults(data: any, container: HTMLElement) {
    const { vesselInfo: details, sources } = data;
    const na = 'No disponible';

    if (!details) {
        container.innerHTML = `<p class="drill-placeholder">No se pudo obtener la información del buque.</p>`;
        return;
    }
    
    const detailsMap: Record<string, string | null | undefined> = {
        'MMSI': details.mmsi,
        'Indicativo': details.callSign,
        'IMO': details.imo,
        'Bandera': details.flag
    };

    const characteristicsMap: Record<string, string | null | undefined> = {
        'Eslora': details.length,
        'Manga': details.beam,
        'Arqueo Bruto': details.grossTonnage,
    };
    
    const voyageMap: Record<string, string | null | undefined> = {
        'Última Posición': details.lastPosition,
        'Timestamp': details.positionTimestamp,
        'Destino': details.currentVoyage?.destination,
        'ETA': details.currentVoyage?.eta,
        'Estado': details.currentVoyage?.status,
    };

    const createGridItems = (map: Record<string, string | null | undefined>) => {
        let html = '';
        for (const [label, value] of Object.entries(map)) {
            if (value) {
                html += `
                <div class="mmsi-detail-item">
                    <span>${label}</span>
                    <strong>${value}</strong>
                </div>`;
            }
        }
        return html;
    };
    
    const keyDetailsHtml = createGridItems(detailsMap);
    const characteristicsHtml = createGridItems(characteristicsMap);
    const voyageHtml = createGridItems(voyageMap);

    const marineTrafficUrl = `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${details.mmsi}`;
    const vesselFinderUrl = `https://www.vesselfinder.com/vessels?mmsi=${details.mmsi}`;
    const externalLinkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>`;

    container.innerHTML = `
        <div class="mmsi-result-card">
            <h4 class="mmsi-result-title">
                ${details.stationName || 'Nombre Desconocido'}
            </h4>

            ${details.mmsi ? `
            <div class="mmsi-live-links">
                <a href="${marineTrafficUrl}" target="_blank" rel="noopener noreferrer" class="secondary-btn">
                    <span>Ver en MarineTraffic</span>
                    ${externalLinkIcon}
                </a>
                <a href="${vesselFinderUrl}" target="_blank" rel="noopener noreferrer" class="secondary-btn">
                    <span>Ver en VesselFinder</span>
                    ${externalLinkIcon}
                </a>
            </div>` : ''}

            <div class="mmsi-detail-item" style="grid-column: 1 / -1; background-color: var(--bg-card); border: none; padding-left: 0; padding-top: 0; margin-bottom: 1rem;">
                <span style="background: var(--accent-color); color: white; padding: .2em .5em; border-radius: 4px; font-size: .8em; font-weight: 500;">${details.stationType || na}</span>
            </div>
            
            ${details.summary ? `
                <div class="mmsi-summary">
                    <p>${details.summary}</p>
                </div>
            ` : ''}

            ${keyDetailsHtml ? `
                <h5 class="reference-table-subtitle" style="margin-top:0;">Datos Principales</h5>
                <div class="mmsi-details-grid">${keyDetailsHtml}</div>
            ` : ''}

            ${characteristicsHtml ? `
                <h5 class="reference-table-subtitle">Características</h5>
                <div class="mmsi-details-grid">${characteristicsHtml}</div>
            ` : ''}

            ${voyageHtml ? `
                <h5 class="reference-table-subtitle">Último Viaje</h5>
                <div class="mmsi-details-grid">${voyageHtml}</div>
            ` : ''}

            ${(sources && sources.length > 0) ? `
            <div class="mmsi-sources">
                <h5>Fuentes Consultadas</h5>
                <ul class="mmsi-sources-list">
                    ${sources.map((s: any) => `<li><a href="${s.web.uri}" target="_blank" rel="noopener noreferrer">${s.web.title || s.web.uri}</a></li>`).join('')}
                </ul>
            </div>` : ''}
        </div>
    `;
}


async function initializeMmsiSearcher() {
    const form = document.getElementById('mmsi-search-form') as HTMLFormElement;
    const input = document.getElementById('mmsi-search-input') as HTMLInputElement;
    const button = document.getElementById('mmsi-search-btn') as HTMLButtonElement;
    const resultsContainer = document.getElementById('mmsi-result-container') as HTMLDivElement;
    if (!form || !input || !button || !resultsContainer) return;

    const skeletonHtml = `
        <div class="mmsi-result-card">
            <div class="skeleton skeleton-title" style="width: 60%; height: 2em; margin-bottom: 1rem;"></div>
            <div class="skeleton skeleton-text" style="width: 90%; margin-bottom: 0.5rem;"></div>
            <div class="skeleton skeleton-text" style="width: 80%; margin-bottom: 2rem;"></div>
            <h5 class="reference-table-subtitle" style="margin-top:0; margin-bottom: 1rem;"><div class="skeleton skeleton-text" style="width: 30%; height: 1.2em;"></div></h5>
            <div class="mmsi-details-grid">
                ${Array(4).fill('<div class="skeleton skeleton-box" style="height: 4em;"></div>').join('')}
            </div>
            <h5 class="reference-table-subtitle" style="margin-bottom: 1rem;"><div class="skeleton skeleton-text" style="width: 40%; height: 1.2em;"></div></h5>
            <div class="mmsi-details-grid">
                ${Array(3).fill('<div class="skeleton skeleton-box" style="height: 4em;"></div>').join('')}
            </div>
        </div>`;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mmsi = input.value.trim();
        if (!/^\d{9}$/.test(mmsi)) {
            showToast("Por favor, introduzca un MMSI válido de 9 dígitos.", "error");
            return;
        }

        resultsContainer.innerHTML = skeletonHtml;
        button.disabled = true;

        try {
            const response = await fetch('/api/mmsi-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mmsi })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'La API devolvió un error.');
            }

            const data = await response.json();
            
            const hasData = data.vesselInfo && Object.entries(data.vesselInfo).some(([key, value]) => {
                if (key === 'mmsi') return false;
                if (value !== null && typeof value !== 'object') return true;
                if (value !== null && typeof value === 'object') {
                    return Object.values(value).some(subValue => subValue !== null);
                }
                return false;
            });

            if (hasData) {
                renderMmsiResults(data, resultsContainer);
            } else {
                resultsContainer.innerHTML = `<p class="drill-placeholder">No se encontró información relevante para el MMSI ${mmsi} en las fuentes públicas consultadas.</p>`;
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error al realizar la búsqueda";
            resultsContainer.innerHTML = `<p class="error">${errorMessage}</p>`;
            showToast(errorMessage, 'error');
        } finally {
            button.disabled = false;
        }
    });
}


function initializePhoneDirectory() {
    const searchInput = document.getElementById('phone-search-input') as HTMLInputElement | null;
    const listContainer = document.getElementById('phone-directory-list') as HTMLDivElement | null;
    
    if (!searchInput || !listContainer) return;

    const renderList = (filter = '') => {
        const searchTerm = filter.toLowerCase().trim();
        const filteredData = searchTerm === '' ? PHONE_DIRECTORY_DATA : PHONE_DIRECTORY_DATA.filter(entry => 
            entry.name.toLowerCase().includes(searchTerm) ||
            entry.phones.some(p => p.includes(searchTerm)) ||
            (entry.email && entry.email.toLowerCase().includes(searchTerm)) ||
            entry.keywords.some(k => k.toLowerCase().includes(searchTerm))
        );

        if (filteredData.length === 0) {
            listContainer.innerHTML = `<p class="drill-placeholder">No se encontraron resultados.</p>`;
            return;
        }
        const phoneIcon = `<svg viewBox="0 0 16 16"><path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/></svg>`;
        const faxIcon = `<svg viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1M4 5.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7a.5.5 0 0 0-.5.5M4 8a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7A.5.5 0 0 0 4 8m0 2.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1h-4a.5.5 0 0 0-.5.5"/></svg>`;
        const emailIcon = `<svg viewBox="0 0 16 16"><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414zM0 4.697v7.104l5.803-3.558zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586zm3.436-.586L16 11.801V4.697z"/></svg>`;

        listContainer.innerHTML = filteredData.map(entry => `
            <div class="phone-entry-card">
                <div class="phone-entry-header">
                     <h4 class="phone-entry-name">${entry.name}</h4>
                </div>
                <div class="phone-entry-contact-grid">
                    ${entry.phones.map(p => `<div class="phone-entry-contact-item">${phoneIcon}<span>${p}</span></div>`).join('')}
                    ${entry.fax ? `<div class="phone-entry-contact-item">${faxIcon}<span>${entry.fax}</span></div>` : ''}
                    ${entry.email ? `<div class="phone-entry-contact-item">${emailIcon}<a href="mailto:${entry.email}">${entry.email}</a></div>` : ''}
                </div>
            </div>
        `).join('');
    };

    searchInput.addEventListener('input', debounce(() => renderList(searchInput.value), 300));
    
    // Initial render
    renderList();
}

// --- COORDINATE CONVERTER LOGIC ---
function initializeCoordinateConverter() {
    const convertBtn = document.getElementById('coord-convert-btn') as HTMLButtonElement;
    const inputEl = document.getElementById('coord-input') as HTMLTextAreaElement;
    const resultEl = document.getElementById('coord-result') as HTMLDivElement;

    if (!convertBtn || !inputEl || !resultEl) return;

    const parseToDD = (input: string): number => {
        let str = input.trim().toUpperCase();
        str = str.replace(/,/g, '.');
        str = str.replace(/[°'"]/g, ' ');

        const parts = str.split(/[\s]+/).filter(p => p.length > 0);

        const hemisphere = parts.find(p => /^[NSEW]$/.test(p));
        const numbers = parts
            .filter(p => !/^[NSEW]$/.test(p))
            .map(p => parseFloat(p));

        if (numbers.some(isNaN) || numbers.length === 0 || numbers.length > 3) {
            return NaN;
        }

        let dd = 0;
        if (numbers.length === 3) { // DMS
            dd = Math.abs(numbers[0]) + numbers[1] / 60 + numbers[2] / 3600;
        } else if (numbers.length === 2) { // DDM
            dd = Math.abs(numbers[0]) + numbers[1] / 60;
        } else { // DD
            dd = numbers[0];
        }

        if (hemisphere && /[SW]/.test(hemisphere)) {
            dd = -Math.abs(dd);
        } else if (hemisphere && /[NE]/.test(hemisphere)) {
            dd = Math.abs(dd);
        } else if (numbers.length === 1 && numbers[0] < 0) {
            dd = numbers[0];
        }

        return dd;
    };

    const parseCoordinatePair = (input: string): { lat: number | null, lon: number | null } => {
        let latStr = '';
        let lonStr = '';
        const upperInput = input.trim().toUpperCase();

        const nsIndex = upperInput.search(/[NS]/);
        const ewIndex = upperInput.search(/[EW]/);

        if (nsIndex > -1 && ewIndex > -1) {
            if (nsIndex < ewIndex) { // Lat Lon order e.g. "40N 70W"
                latStr = upperInput.substring(0, nsIndex + 1);
                lonStr = upperInput.substring(nsIndex + 1);
            } else { // Lon Lat order e.g. "70W 40N"
                lonStr = upperInput.substring(0, ewIndex + 1);
                latStr = upperInput.substring(ewIndex + 1);
            }
        } else {
            const parts = input.trim().replace(/,/g, '.').split(/[\s,;]+/).filter(p => p.length > 0);
            if (parts.length >= 2) {
                latStr = parts[0];
                lonStr = parts[1];
            } else {
                return { lat: null, lon: null };
            }
        }

        const lat = parseToDD(latStr.trim());
        const lon = parseToDD(lonStr.trim());

        return { lat: isNaN(lat) ? null : lat, lon: isNaN(lon) ? null : lon };
    };

    const formatToDDM = (dd: number, isLon: boolean): { text: string, error: boolean } => {
        if (isNaN(dd)) return { text: 'Formato inválido.', error: true };

        if (isLon && (dd < -180 || dd > 180)) {
            return { text: 'Longitud fuera de rango (-180 a 180).', error: true };
        }
        if (!isLon && (dd < -90 || dd > 90)) {
            return { text: 'Latitud fuera de rango (-90 a 90).', error: true };
        }

        const hemisphere = isLon ? (dd >= 0 ? 'E' : 'W') : (dd >= 0 ? 'N' : 'S');
        const absDd = Math.abs(dd);
        const degrees = Math.floor(absDd);
        const minutes = (absDd - degrees) * 60;

        const degStr = isLon ? String(degrees).padStart(3, '0') : String(degrees).padStart(2, '0');
        const minutesWithDecimal = minutes.toFixed(3);
        const [intMin, decMin] = minutesWithDecimal.split('.');
        const formattedMinutes = intMin.padStart(2, '0');

        return { text: `${degStr}° ${formattedMinutes},${decMin}' ${hemisphere}`, error: false };
    };

    convertBtn.addEventListener('click', () => {
        const input = inputEl.value;
        if (!input.trim()) {
            resultEl.innerHTML = '';
            return;
        }

        const coords = parseCoordinatePair(input);

        if (coords.lat === null || coords.lon === null) {
            resultEl.innerHTML = `<p class="error">Formato no reconocido. Por favor, introduzca latitud y longitud. Ejemplo: 43 21.5 N 008 25.2 W</p>`;
            return;
        }

        const latResult = formatToDDM(coords.lat, false);
        const lonResult = formatToDDM(coords.lon, true);

        let htmlResult = '';
        if (latResult.error) {
            htmlResult += `<p class="error"><strong>Latitud:</strong> ${latResult.text}</p>`;
        } else {
            htmlResult += `<p><strong>Latitud:</strong> ${latResult.text}</p>`;
        }

        if (lonResult.error) {
            htmlResult += `<p class="error"><strong>Longitud:</strong> ${lonResult.text}</p>`;
        } else {
            htmlResult += `<p><strong>Longitud:</strong> ${lonResult.text}</p>`;
        }

        resultEl.innerHTML = htmlResult;
    });
}

async function initializeNauticalTranslator() {
    const translateBtn = document.getElementById('translator-btn') as HTMLButtonElement;
    const inputEl = document.getElementById('translator-input') as HTMLTextAreaElement;
    const resultEl = document.getElementById('translator-result') as HTMLDivElement;
    if (!translateBtn || !inputEl || !resultEl) return;

    const skeletonHtml = `<div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>`;

    translateBtn.addEventListener('click', async () => {
        const textToTranslate = inputEl.value.trim();
        if (!textToTranslate) {
            showToast("El texto no puede estar vacío.", "error");
            return;
        }
        resultEl.innerHTML = skeletonHtml;
        resultEl.classList.add('loading');
        translateBtn.disabled = true;

        try {
            const apiResponse = await fetch('/api/translator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textToTranslate })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.details || 'La API devolvió un error.');
            }

            const data = await apiResponse.json();
            resultEl.innerHTML = `<p>${data.translation}</p>`;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error al traducir";
            resultEl.innerHTML = `<p class="error">${errorMessage}</p>`;
            showToast(errorMessage, 'error');
        } finally {
            translateBtn.disabled = false;
            resultEl.classList.remove('loading');
        }
    });
}