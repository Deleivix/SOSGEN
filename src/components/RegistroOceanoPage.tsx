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
                            ${category.items.map(item => `
                                    <div class="template-card">
                                        <div class="template-card-header">
                                            <h3 class="template-card-title">${item.title}</h3>
                                            <button class="copy-btn" aria-label="Copiar ${item.title}">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
                                                <span>Copiar</span>
                                            </button>
                                        </div>
                                        <div contenteditable="true" class="template-card-body">${item.template}</div>
                                    </div>`).join('')}
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
            const body = card?.querySelector('.template-card-body');
            if(body) {
                handleCopy(body.textContent || '');
            }
        }
    });
}