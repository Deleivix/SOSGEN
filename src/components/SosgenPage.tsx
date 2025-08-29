import { handleCopy, logSosgenEvent, updateBitacoraView } from "../utils/helpers";

const NEW_LOGO_SVG = `<svg class="nav-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#2D8B8B" d="M50,10 A40,40 0 1 1 50,90 A40,40 0 1 1 50,10 M50,18 A32,32 0 1 0 50,82 A32,32 0 1 0 50,18"></path><path fill="white" d="M50,22 A28,28 0 1 1 50,78 A28,28 0 1 1 50,22"></path><path fill="#8BC34A" d="M50,10 A40,40 0 0 1 90,50 L82,50 A32,32 0 0 0 50,18 Z"></path><path fill="#F7F9FA" d="M10,50 A40,40 0 0 1 50,10 L50,18 A32,32 0 0 0 18,50 Z"></path><path fill="#2D8B8B" d="M50,90 A40,40 0 0 1 10,50 L18,50 A32,32 0 0 0 50,82 Z"></path><path fill="white" d="M90,50 A40,40 0 0 1 50,90 L50,82 A32,32 0 0 0 82,50 Z"></path></svg>`;

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
    `;
    initializeSosgen();
}

async function initializeSosgen() {
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
            resultsEl.innerHTML = `<p class="error">La descripción no puede estar vacía.</p>`;
            return;
        }
        resultsEl.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
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
            
            const rawStationName = extractedData.stationName?.trim();
            
            let fullStationName = '____________________';
            if (rawStationName) {
              fullStationName = rawStationName.toLowerCase().includes('radio') ? rawStationName : `${rawStationName} Radio`;
            }

            const mrcc = extractedData.mrcc?.trim() || '____________________';
            const utcTime = '____________________';
            const infoNumber = '1';

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
                    <textarea class="styled-textarea" rows="12">${esMsg}</textarea>
                </div>
                <div class="sosgen-result-box">
                    <div class="sosgen-result-header">
                        <h3>Mensaje en Inglés</h3>
                        <button class="copy-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
                            <span>Copiar</span>
                        </button>
                    </div>
                    <textarea class="styled-textarea" rows="12">${enMsg}</textarea>
                </div>`;
            
            resultsEl.querySelectorAll('.copy-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    const resultBox = btn.closest('.sosgen-result-box');
                    const textarea = resultBox?.querySelector('textarea');
                    if(textarea) {
                        handleCopy(btn, textarea.value);
                    }
                });
            });

            const newEntry = logSosgenEvent('SOSGEN', { spanish: esMsg, english: enMsg });
            if (newEntry) {
                updateBitacoraView(newEntry);
            }
            localStorage.removeItem('sosgen_draft');

        } catch (error) {
            console.error("Error generating message:", error);
            const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
            resultsEl.innerHTML = `<p class="error">${errorMessage}</p>`;
        } finally {
            generateBtn.disabled = false;
        }
    });
}
