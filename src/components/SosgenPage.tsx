import { handleCopy, showToast } from "../utils/helpers";

const NEW_LOGO_SVG = `<svg class="nav-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#2D8B8B" d="M50,10 A40,40 0 1 1 50,90 A40,40 0 1 1 50,10 M50,18 A32,32 0 1 0 50,82 A32,32 0 1 0 50,18"></path><path fill="white" d="M50,22 A28,28 0 1 1 50,78 A28,28 0 1 1 50,22"></path><path fill="#8BC34A" d="M50,10 A40,40 0 0 1 90,50 L82,50 A32,32 0 0 0 50,18 Z"></path><path fill="#F7F9FA" d="M10,50 A40,40 0 0 1 50,10 L50,18 A32,32 0 0 0 18,50 Z"></path><path fill="#2D8B8B" d="M50,90 A40,40 0 0 1 10,50 L18,50 A32,32 0 0 0 50,82 Z"></path><path fill="white" d="M90,50 A40,40 0 0 1 50,90 L50,82 A32,32 0 0 0 82,50 Z"></path></svg>`;

// --- State Management for History ---
type SosgenHistoryEntry = {
    id: string;
    timestamp: string;
    spanishMessage: string;
    englishMessage: string;
};

let sosgenHistory: SosgenHistoryEntry[] = [];

function loadHistory(): void {
    const saved = localStorage.getItem('sosgen_history');
    sosgenHistory = saved ? JSON.parse(saved) : [];
}

function saveHistory(): void {
    localStorage.setItem('sosgen_history', JSON.stringify(sosgenHistory));
}

function addToHistory(spanishMessage: string, englishMessage: string): void {
    const newEntry: SosgenHistoryEntry = {
        id: `sosgen-${Date.now()}`,
        timestamp: new Date().toISOString(),
        spanishMessage,
        englishMessage,
    };
    sosgenHistory.unshift(newEntry); // Add to the beginning
    if (sosgenHistory.length > 50) { // Limit history size to 50 entries
        sosgenHistory.pop();
    }
    saveHistory();
}

function updateHistoryEntry(id: string, newSpanish: string, newEnglish: string): void {
    const index = sosgenHistory.findIndex(entry => entry.id === id);
    if (index > -1) {
        sosgenHistory[index].spanishMessage = newSpanish;
        sosgenHistory[index].englishMessage = newEnglish;
        saveHistory();
        showToast('Entrada del historial guardada.', 'success');
    }
}

function deleteHistoryEntry(id: string): void {
    sosgenHistory = sosgenHistory.filter(entry => entry.id !== id);
    saveHistory();
    showToast('Entrada del historial eliminada.', 'info');
    renderHistory();
}

export function renderSosgen(container: HTMLElement) {
    container.innerHTML = `
        <div class="page-banner">
            <h1 class="banner-title">
                ${NEW_LOGO_SVG.replace('nav-logo', 'banner-logo')}
                <span>SOSGEN</span>
            </h1>
            <p class="banner-subtitle">Convierte descripciones de emergencias marítimas en mensajes MAYDAY RELAY estandarizados para comunicaciones radio costeras oficiales.</p>
        </div>
        <div class="content-card">
            <h2 class="content-card-title">Información de Socorro</h2>
            <textarea id="sosgen-input" class="styled-textarea" rows="6" placeholder="Ej: Desde Coruña Radio, coordinado por MRCC Finisterre: Buque 'Aurora' (MMSI 224123456) con 5 POB tiene una vía de agua en 43°21'N 008°25'W."></textarea>
            <button id="sosgen-generate-btn" class="primary-btn">Generar Mensaje</button>
            <div id="sosgen-results" class="sosgen-results"></div>
        </div>
        <div class="sosgen-history">
            <h2 class="sosgen-history-title">Historial de Mensajes</h2>
            <div id="sosgen-history-list" class="history-list"></div>
        </div>
    `;
    initializeSosgen();
}

async function initializeSosgen() {
    loadHistory();

    const generateBtn = document.getElementById('sosgen-generate-btn') as HTMLButtonElement;
    const inputEl = document.getElementById('sosgen-input') as HTMLTextAreaElement;
    const resultsEl = document.getElementById('sosgen-results') as HTMLDivElement;
    if (!generateBtn || !inputEl || !resultsEl) return;

    const savedDraft = localStorage.getItem('sosgen_draft');
    if (savedDraft) {
        inputEl.value = savedDraft;
    }

    inputEl.addEventListener('input', () => {
        localStorage.setItem('sosgen_draft', inputEl.value);
    });

    generateBtn.addEventListener('click', async () => {
        const naturalInput = inputEl.value.trim();
        if (!naturalInput) {
            showToast("La descripción no puede estar vacía.", "error");
            return;
        }

        resultsEl.innerHTML = `
            <div class="sosgen-result-box">
                <div class="sosgen-result-header"><div class="skeleton skeleton-box-header"></div></div>
                <div class="skeleton skeleton-box-content"></div>
            </div>
            <div class="sosgen-result-box">
                <div class="sosgen-result-header"><div class="skeleton skeleton-box-header"></div></div>
                <div class="skeleton skeleton-box-content"></div>
            </div>
        `;
        resultsEl.classList.add('loading');
        generateBtn.disabled = true;

        try {
            const apiResponse = await fetch('/api/sosgen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ naturalInput })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.details || 'La API devolvió un error.');
            }

            const extractedData = await apiResponse.json();
            
            const missingFields = [];
            if (!extractedData.spanishDescription) missingFields.push("descripción en español");
            if (!extractedData.englishDescription) missingFields.push("descripción en inglés");

            if (missingFields.length > 0) {
              throw new Error(`Falta información. La IA no pudo extraer: ${missingFields.join(', ')}. Por favor, sea más específico en su descripción.`);
            }
            
            const placeholder = (text: string) => `<span class="placeholder-input" contenteditable="true" spellcheck="false">${text}</span>`;
            
            const rawStationName = extractedData.stationName?.trim();
            let fullStationName = placeholder('____________________');
            if (rawStationName) {
              fullStationName = rawStationName.toLowerCase().includes('radio') ? rawStationName : `${rawStationName} Radio`;
            }

            const mrcc = extractedData.mrcc?.trim() || placeholder('____________________');
            const utcTime = placeholder('________');
            const infoNumber = placeholder('1');

            const esMsg = `MAYDAY RELAY (x3)\nAQUI ${fullStationName} (x3)\nMAYDAY\nINFORMACION Nº ${infoNumber} A ${utcTime} UTC.\n\n${extractedData.spanishDescription}\n\nSE REQUIERE A TODOS LOS BARCOS EN LA ZONA, EXTREMAR LA VIGILANCIA, ASISTIR SI ES NECESSARIO, E INFORMAR A SALVAMENTO MARITIMO ${mrcc} O ESTACION RADIO COSTERA MAS PROXIMA.\nAQUI ${fullStationName} A ${utcTime} UTC.`;
            const enMsg = `MAYDAY RELAY (x3)\nTHIS IS ${fullStationName} (x3)\nMAYDAY\nINFORMATION Nº ${infoNumber} AT ${utcTime} UTC.\n\n${extractedData.englishDescription}\n\nALL VESSELS IN THE AREA, ARE REQUESTED TO KEEP A SHARP LOOK OUT, ASSIST IF NECESSARY AND MAKE FURTHER REPORTS TO MRCC ${mrcc} OR NEAREST COASTAL RADIO STATION.\nTHIS IS ${fullStationName} AT ${utcTime} UTC.`;
            
            resultsEl.innerHTML = `
                <div class="sosgen-result-box">
                    <div class="sosgen-result-header">
                        <h3>Mensaje en Español</h3>
                        <button class="copy-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
                            <span>Copiar</span>
                        </button>
                    </div>
                    <div class="editable-message" id="es-msg-result">${esMsg}</div>
                </div>
                <div class="sosgen-result-box">
                    <div class="sosgen-result-header">
                        <h3>Mensaje en Inglés</h3>
                        <button class="copy-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
                            <span>Copiar</span>
                        </button>
                    </div>
                    <div class="editable-message" id="en-msg-result">${enMsg}</div>
                </div>`;
            
            // Use innerText to get the message with placeholders resolved by the browser
            const esMsgResult = document.getElementById('es-msg-result')?.innerText || '';
            const enMsgResult = document.getElementById('en-msg-result')?.innerText || '';
            addToHistory(esMsgResult, enMsgResult);
            renderHistory();
            
            resultsEl.querySelectorAll('.copy-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    const resultBox = btn.closest('.sosgen-result-box');
                    const editableDiv = resultBox?.querySelector<HTMLDivElement>('.editable-message');
                    if(editableDiv) {
                        handleCopy(editableDiv.innerText || '');
                    }
                });
            });

            localStorage.removeItem('sosgen_draft');

        } catch (error) {
            console.error("Error generating message:", error);
            const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
            resultsEl.innerHTML = `<p class="error">${errorMessage}</p>`;
            showToast(errorMessage, 'error');
        } finally {
            generateBtn.disabled = false;
            resultsEl.classList.remove('loading');
        }
    });
    
    // Add delegated event listener for history actions
    const historyList = document.getElementById('sosgen-history-list');
    if (historyList) {
        historyList.addEventListener('click', handleHistoryAction);
    }

    renderHistory(); // Initial render
}


function renderHistory() {
    const historyContainer = document.getElementById('sosgen-history-list');
    if (!historyContainer) return;

    if (sosgenHistory.length === 0) {
        historyContainer.innerHTML = `<p class="drill-placeholder">No hay mensajes en el historial.</p>`;
        return;
    }
    
    historyContainer.innerHTML = sosgenHistory.map(entry => `
        <div class="history-entry" id="${entry.id}">
            <div class="history-entry-header">
                <span class="history-entry-ts">
                    ${new Date(entry.timestamp).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <div style="display: flex; gap: 0.75rem;">
                     <button class="primary-btn-small" data-action="generate-silence-fini" data-id="${entry.id}">Generar SILENCE FINI</button>
                     <button class="secondary-btn" data-action="save" data-id="${entry.id}">Guardar</button>
                     <button class="tertiary-btn" data-action="delete" data-id="${entry.id}">Borrar</button>
                </div>
            </div>
            <div class="history-entry-content">
                <div>
                    <div class="history-entry-lang-header"><h4>Español</h4></div>
                    <div contenteditable="true" class="editable-message" data-lang="es">${entry.spanishMessage.replace(/\n/g, '<br>')}</div>
                </div>
                <div>
                    <div class="history-entry-lang-header"><h4>Inglés</h4></div>
                    <div contenteditable="true" class="editable-message" data-lang="en">${entry.englishMessage.replace(/\n/g, '<br>')}</div>
                </div>
            </div>
        </div>
    `).join('');
}


function handleHistoryAction(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!action || !id) return;

    const entryElement = document.getElementById(id);
    if (!entryElement) return;

    switch(action) {
        case 'save': {
            const spanishDiv = entryElement.querySelector<HTMLDivElement>('[data-lang="es"]');
            const englishDiv = entryElement.querySelector<HTMLDivElement>('[data-lang="en"]');
            if (spanishDiv && englishDiv) {
                updateHistoryEntry(id, spanishDiv.innerText, englishDiv.innerText);
            }
            break;
        }
        case 'delete': {
            if (window.confirm('¿Seguro que quieres borrar esta entrada del historial?')) {
                deleteHistoryEntry(id);
            }
            break;
        }
        case 'generate-silence-fini': {
             const entry = sosgenHistory.find(item => item.id === id);
             if (entry) {
                 renderSilenceFiniModal(entry);
             }
            break;
        }
    }
}

function renderSilenceFiniModal(entry: SosgenHistoryEntry) {
    const modalId = `silence-fini-modal-${entry.id}`;
    if (document.getElementById(modalId)) return; // Avoid opening multiple modals

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = modalId;

    const reasons = [
        "La Alerta DSC fue una Falsa Alerta.",
        "El área de socorro ha sido completamente rastreada sin resultados.",
        "El buque en peligro ha solucionado la emergencia.",
        "El buque en peligro ha sido rescatado.",
        "Se cancela la alerta a petición del MRCC coordinador."
    ];
    
    const englishReasons: { [key: string]: string } = {
        "La Alerta DSC fue una Falsa Alerta.": "The DSC Alert was a False Alert.",
        "El área de socorro ha sido completamente rastreada sin resultados.": "The distress area has been fully searched with negative results.",
        "El buque en peligro ha solucionado la emergencia.": "The vessel in distress has solved the emergency.",
        "El buque en peligro ha sido rescatado.": "The vessel in distress has been rescued.",
        "Se cancela la alerta a petición del MRCC coordinador.": "The alert is cancelled at the request of the coordinating MRCC."
    };

    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 800px; text-align: left;">
            <h2 class="modal-title">Generar SILENCE FINI para NR de ${new Date(entry.timestamp).toLocaleTimeString('es-ES')}</h2>
            <div class="form-group">
                <label for="silence-reason">Causa de Finalización del Socorro</label>
                <select id="silence-reason" class="simulator-input">
                    ${reasons.map(r => `<option value="${r}">${r}</option>`).join('')}
                </select>
            </div>
            <div class="history-entry-content" style="margin-top: 1.5rem;">
                <div>
                    <div class="history-entry-lang-header">
                        <h4>Mensaje en Español</h4>
                        <button class="copy-btn" data-target="silence-es"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg><span>Copiar</span></button>
                    </div>
                    <div id="silence-es" contenteditable="true" class="editable-message" style="min-height: 200px;"></div>
                </div>
                <div>
                    <div class="history-entry-lang-header">
                        <h4>Mensaje en Inglés</h4>
                        <button class="copy-btn" data-target="silence-en"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg><span>Copiar</span></button>
                    </div>
                    <div id="silence-en" contenteditable="true" class="editable-message" style="min-height: 200px;"></div>
                </div>
            </div>
            <button class="primary-btn modal-close-btn" style="margin-top: 2rem;">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    const reasonSelect = modalOverlay.querySelector('#silence-reason') as HTMLSelectElement;
    const esResultDiv = modalOverlay.querySelector('#silence-es') as HTMLDivElement;
    const enResultDiv = modalOverlay.querySelector('#silence-en') as HTMLDivElement;
    
    const generateMessages = () => {
        const selectedReason = reasonSelect.value;
        const selectedEnglishReason = englishReasons[selectedReason];
        
        // Extract info from original messages
        const esStationMatch = entry.spanishMessage.match(/AQUI\s(.*?)\s\(x3\)/);
        const enStationMatch = entry.englishMessage.match(/THIS IS\s(.*?)\s\(x3\)/);
        const esDescMatch = entry.spanishMessage.match(/UTC\.\n\n([\s\S]*?)\n\nSE REQUIERE/);
        const enDescMatch = entry.englishMessage.match(/UTC\.\n\n([\s\S]*?)\n\nALL VESSELS/);

        const stationNameEs = esStationMatch ? esStationMatch[1].trim() : 'ESTACION COSTERA';
        const stationNameEn = enStationMatch ? enStationMatch[1].trim() : 'COAST RADIO STATION';
        const distressDescEs = esDescMatch ? esDescMatch[1].trim() : '...';
        const distressDescEn = enDescMatch ? enDescMatch[1].trim() : '...';
        const now = new Date();
        const currentTimeUTC = `${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}`;

        esResultDiv.innerText = `MAYDAY\nAQUI ${stationNameEs}\n${currentTimeUTC} UTC\n${distressDescEs}\nSILENCE FINI\n${selectedReason}\nAQUI ${stationNameEs} ${currentTimeUTC} UTC.`;
        enResultDiv.innerText = `MAYDAY\nTHIS IS ${stationNameEn}\n${currentTimeUTC} UTC\n${distressDescEn}\nSILENCE FINI\n${selectedEnglishReason}\nTHIS IS ${stationNameEn} ${currentTimeUTC} UTC.`;
    };

    reasonSelect.addEventListener('change', generateMessages);
    
    modalOverlay.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === modalOverlay || target.closest('.modal-close-btn')) {
            modalOverlay.remove();
        }
        const copyBtn = target.closest('.copy-btn');
        if (copyBtn) {
            const targetId = copyBtn.getAttribute('data-target');
            if (!targetId) return;
            const contentDiv = modalOverlay.querySelector<HTMLElement>(`#${targetId}`);
            if (contentDiv) {
                handleCopy(contentDiv.textContent || '');
            }
        }
    });

    generateMessages(); // Initial generation
}
