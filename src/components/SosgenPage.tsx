import { showToast, handleCopy } from "../utils/helpers";

export function renderSosgen(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Generador de Mensajes de Socorro (SOSGEN)</h2>
            <p class="translator-desc">
                Escriba los detalles de un suceso de socorro en lenguaje natural. La IA extraerá la información clave y generará una descripción estandarizada en español e inglés, lista para ser transmitida.
            </p>
            <form id="sosgen-form">
                <textarea id="sosgen-input" class="styled-textarea" rows="4" placeholder="Ej: Mercante 'AURORA' MMSI 224123456 con 5 POB. Vía de agua en 43 21.5N 008 25.2W..."></textarea>
                <button type="submit" id="sosgen-generate-btn" class="primary-btn">Generar Mensaje</button>
            </form>
            <div id="sosgen-result-container" style="margin-top: 2rem;">
                 <p class="drill-placeholder">El mensaje generado aparecerá aquí.</p>
            </div>
        </div>
    `;
    initializeSosgen();
}

function initializeSosgen() {
    const form = document.getElementById('sosgen-form') as HTMLFormElement;
    const input = document.getElementById('sosgen-input') as HTMLTextAreaElement;
    const button = document.getElementById('sosgen-generate-btn') as HTMLButtonElement;
    const resultContainer = document.getElementById('sosgen-result-container') as HTMLDivElement;

    if (!form || !input || !button || !resultContainer) {
        return;
    }

    const skeletonHtml = `
        <div class="skeleton skeleton-box" style="height: 120px; margin-bottom: 1rem;"></div>
        <div class="skeleton skeleton-box" style="height: 120px;"></div>
    `;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const naturalInput = input.value.trim();
        if (!naturalInput) {
            showToast("El texto no puede estar vacío.", "error");
            return;
        }

        resultContainer.innerHTML = skeletonHtml;
        button.disabled = true;

        try {
            const response = await fetch('/api/sosgen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ naturalInput })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'La API devolvió un error.');
            }

            const data = await response.json();
            
            const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>`;

            resultContainer.innerHTML = `
                <div class="translation-result" style="margin-bottom: 1rem;">
                    <div class="result-header">
                        <h4>Mensaje en Español</h4>
                        <button class="copy-btn" data-copy-target="spanish-desc">
                            ${copyIcon}
                            <span>Copiar</span>
                        </button>
                    </div>
                    <p id="spanish-desc">${data.spanishDescription}</p>
                </div>
                <div class="translation-result">
                    <div class="result-header">
                        <h4>Message in English</h4>
                        <button class="copy-btn" data-copy-target="english-desc">
                            ${copyIcon}
                            <span>Copy</span>
                        </button>
                    </div>
                    <p id="english-desc">${data.englishDescription}</p>
                </div>
            `;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error al generar el mensaje";
            resultContainer.innerHTML = `<p class="error">${errorMessage}</p>`;
            showToast(errorMessage, 'error');
        } finally {
            button.disabled = false;
        }
    });

    resultContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const copyBtn = target.closest<HTMLButtonElement>('.copy-btn');
        if (copyBtn) {
            const targetId = copyBtn.dataset.copyTarget;
            if (targetId) {
                const textElement = document.getElementById(targetId);
                if (textElement) {
                    handleCopy(textElement.textContent || '');
                }
            }
        }
    });
}
