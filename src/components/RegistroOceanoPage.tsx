import { REGISTRO_OCEANO_DATA } from "../data";
import { handleCopy } from "../utils/helpers";

export function renderRegistroOceano(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <div class="registro-oceano-layout">
                <aside class="ro-sidebar">
                    ${REGISTRO_OCEANO_DATA.map((category, index) => `
                        <button class="sub-nav-btn ${index === 0 ? 'active' : ''}" data-target="sub-tab-${category.category.replace(/\s+/g, '-')}">
                            ${category.category}
                        </button>
                    `).join('')}
                </aside>
                <main class="ro-content">
                    ${REGISTRO_OCEANO_DATA.map((category, index) => `
                        <div class="sub-tab-panel ${index === 0 ? 'active' : ''}" id="sub-tab-${category.category.replace(/\s+/g, '-')}">
                            ${category.items.map(item => {
                                if (item.title === 'Reorganización del Servicio') {
                                    return `
                                        <div class="template-card" id="reorg-card">
                                            <div class="template-card-header">
                                                <h3 class="template-card-title">${item.title}</h3>
                                                <button class="copy-btn" aria-label="Copiar ${item.title}">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
                                                    <span>Copiar</span>
                                                </button>
                                            </div>
                                            <div class="template-card-body">
                                                <p id="reorg-final-text" style="margin-bottom: 1.5rem; min-height: 4.8em;"></p>
                                                <div class="reorg-controls">
                                                    <div>
                                                        <h4 class="reorg-control-title">CCR que asume</h4>
                                                        <div class="buoy-selector-group" id="reorg-ccr-selector">
                                                            <button class="buoy-selector-btn" data-value="CCR VALENCIA">CCR VALENCIA</button>
                                                            <button class="buoy-selector-btn" data-value="CCR LAS PALMAS">CCR LAS PALMAS</button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 class="reorg-control-title">Turno</h4>
                                                        <div class="buoy-selector-group" id="reorg-turno-selector">
                                                            <button class="buoy-selector-btn" data-value="MAÑANA">MAÑANA</button>
                                                            <button class="buoy-selector-btn" data-value="TARDE">TARDE</button>
                                                            <button class="buoy-selector-btn" data-value="NOCHE">NOCHE</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }
                                return `
                                    <div class="template-card">
                                        <div class="template-card-header">
                                            <h3 class="template-card-title">${item.title}</h3>
                                            <button class="copy-btn" aria-label="Copiar ${item.title}">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
                                                <span>Copiar</span>
                                            </button>
                                        </div>
                                        <div contenteditable="true" class="template-card-body">${item.template}</div>
                                    </div>`;
                                }).join('')}
                        </div>
                    `).join('')}
                </main>
            </div>
        </div>
    `;
    initializeRegistroOceano(container);
}

function initializeRegistroOceano(container: HTMLElement) {
    const layout = container.querySelector('.registro-oceano-layout');
    if (!layout) return;

    const updateReorgText = () => {
        const card = document.getElementById('reorg-card');
        if (!card) return;
        const ccrSelector = card.querySelector('#reorg-ccr-selector');
        const turnoSelector = card.querySelector('#reorg-turno-selector');
        const textEl = card.querySelector('#reorg-final-text');

        const selectedCCR = ccrSelector?.querySelector<HTMLButtonElement>('.active')?.dataset.value || '...';
        const selectedTurno = turnoSelector?.querySelector<HTMLButtonElement>('.active')?.dataset.value || '...';

        if (textEl) {
            textEl.textContent = `Por contingencias, se reorganiza el servicio en el “CCR CORUÑA” hacia el “${selectedCCR}” en turno de “${selectedTurno}”.`;
        }
    };

    layout.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const btn = target.closest('.sub-nav-btn');
        if (btn) {
            const targetId = btn.getAttribute('data-target');
            if(!targetId) return;
            layout.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
            layout.querySelectorAll('.sub-tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = layout.querySelector<HTMLElement>(`#${targetId}`);
            if (panel) panel.classList.add('active');
        }
        
        const copyBtn = target.closest('.copy-btn');
        if (copyBtn instanceof HTMLButtonElement) {
            const card = copyBtn.closest('.template-card');
            if (card?.id === 'reorg-card') {
                const textEl = card.querySelector('#reorg-final-text');
                if (textEl) handleCopy(textEl.textContent || '');
            } else {
                const body = card?.querySelector('.template-card-body');
                if(body) {
                    handleCopy(body.textContent || '');
                }
            }
        }

        const reorgCard = target.closest('#reorg-card');
        if (reorgCard) {
            const selectorBtn = target.closest<HTMLButtonElement>('.buoy-selector-btn');
            if (selectorBtn) {
                const group = selectorBtn.parentElement;
                if (group) {
                    group.querySelectorAll('.buoy-selector-btn').forEach(btn => btn.classList.remove('active'));
                    selectorBtn.classList.add('active');
                    updateReorgText();
                }
            }
        }
    });

    updateReorgText();
}