// This file implements the Meteos (Weather) page component.
// It allows users to select a weather bulletin, view its raw text,
// and use AI to summarize or translate it.
import { showToast } from "../utils/helpers";

const METEO_BULLETINS = [
    { name: "Costera: Galicia", url: "/api/meteos?bulletin=galicia_coastal" },
    { name: "Costera: Cantábrico", url: "/api/meteos?bulletin=cantabrico_coastal" },
    { name: "Costera: Atlántico (Cádiz-Estrecho)", url: "/api/meteos?bulletin=atlantico_coastal" },
    { name: "Costera: Mediterráneo (Andalucía-Murcia)", url: "/api/meteos?bulletin=mediterraneo_sur_coastal" },
    { name: "Costera: Mediterráneo (Levante)", url: "/api/meteos?bulletin=mediterraneo_levante_coastal" },
    { name: "Costera: Mediterráneo (Cataluña-Baleares)", url: "/api/meteos?bulletin=mediterraneo_noreste_coastal" },
    { name: "Costera: Canarias", url: "/api/meteos?bulletin=canarias_coastal" },
    { name: "Alta Mar: Atlántico", url: "/api/meteos?bulletin=atlantico_offshore" },
    { name: "Alta Mar: Mediterráneo", url: "/api/meteos?bulletin=mediterraneo_offshore" },
];

let currentBulletinText = '';

export function renderMeteos(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Boletines Meteorológicos (AEMET)</h2>
            <div class="meteo-controls">
                <select id="bulletin-selector" class="simulator-input">
                    <option value="">-- Seleccione un boletín --</option>
                    ${METEO_BULLETINS.map(b => `<option value="${b.url}">${b.name}</option>`).join('')}
                </select>
                <div id="meteo-actions" class="meteo-actions" style="display: none;">
                    <button id="process-bulletin-btn" class="secondary-btn">Resumir con IA</button>
                    <button id="translate-bulletin-btn" class="secondary-btn">Traducir con IA</button>
                </div>
            </div>
            <div id="bulletin-content" class="bulletin-content-box">
                 <p class="drill-placeholder">Seleccione un boletín para visualizar su contenido.</p>
            </div>
            <div id="bulletin-ai-output" class="bulletin-ai-output" style="display: none;"></div>
        </div>
    `;
    initializeMeteosPage();
}

function initializeMeteosPage() {
    const selector = document.getElementById('bulletin-selector') as HTMLSelectElement;
    const contentBox = document.getElementById('bulletin-content') as HTMLDivElement;
    const actionsContainer = document.getElementById('meteo-actions') as HTMLDivElement;
    const aiOutputBox = document.getElementById('bulletin-ai-output') as HTMLDivElement;
    const processBtn = document.getElementById('process-bulletin-btn') as HTMLButtonElement;
    const translateBtn = document.getElementById('translate-bulletin-btn') as HTMLButtonElement;

    if (!selector || !contentBox || !actionsContainer || !aiOutputBox || !processBtn || !translateBtn) return;

    const skeletonHtml = `<div class="skeleton skeleton-text" style="height: 200px;"></div>`;

    selector.addEventListener('change', async () => {
        const url = selector.value;
        if (!url) {
            contentBox.innerHTML = '<p class="drill-placeholder">Seleccione un boletín para visualizar su contenido.</p>';
            actionsContainer.style.display = 'none';
            aiOutputBox.style.display = 'none';
            currentBulletinText = '';
            return;
        }

        contentBox.innerHTML = skeletonHtml;
        aiOutputBox.style.display = 'none';
        actionsContainer.style.display = 'none';

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('No se pudo cargar el boletín.');
            const data = await response.json();
            currentBulletinText = data.raw;
            contentBox.innerHTML = `<pre>${currentBulletinText}</pre>`;
            actionsContainer.style.display = 'flex';
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            contentBox.innerHTML = `<p class="error">${message}</p>`;
            showToast(message, 'error');
            currentBulletinText = '';
        }
    });

    const handleAiAction = async (endpoint: string, button: HTMLButtonElement) => {
        if (!currentBulletinText) return;
        
        aiOutputBox.innerHTML = skeletonHtml;
        aiOutputBox.style.display = 'block';
        button.disabled = true;
        const otherButton = button === processBtn ? translateBtn : processBtn;
        otherButton.disabled = true;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bulletinText: currentBulletinText })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'La API devolvió un error.');
            }
            const data = await response.json();
            aiOutputBox.innerHTML = `<pre class="ai-processed-text">${data.result}</pre>`;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            aiOutputBox.innerHTML = `<p class="error">${message}</p>`;
            showToast(message, 'error');
        } finally {
            button.disabled = false;
            otherButton.disabled = false;
        }
    };

    processBtn.addEventListener('click', () => handleAiAction('/api/process-bulletin', processBtn));
    translateBtn.addEventListener('click', () => handleAiAction('/api/translate-bulletin', translateBtn));
}
