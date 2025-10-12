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
                                const copyBtnHtml = `<button class="copy-btn" aria-label="Copiar ${item.title}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg><span>Copiar</span></button>`;

                                if (item.title === 'Entrada de guardia') {
                                    return `
                                        <div class="template-card" data-template-id="entrada-guardia">
                                            <div class="template-card-header">
                                                <h3 class="template-card-title">${item.title}</h3>
                                                ${copyBtnHtml}
                                            </div>
                                            <div class="reorg-controls" style="padding: 1rem 1.5rem 1rem; border-top: 1px solid var(--border-color);">
                                                <div><h4>OP</h4><div class="buoy-selector-group" id="entrada-op-selector">
                                                    <button class="buoy-selector-btn active" data-value="OWP-0X">OWP-0X</button>
                                                    <button class="buoy-selector-btn" data-value="OWP-01">OWP-01</button>
                                                    <button class="buoy-selector-btn" data-value="OWP-02">OWP-02</button>
                                                    <button class="buoy-selector-btn" data-value="OWP-03">OWP-03</button>
                                                    <button class="buoy-selector-btn" data-value="OWP-04">OWP-04</button>
                                                </div></div>
                                                <div><h4>CCR</h4><div class="buoy-selector-group" id="entrada-ccr-selector">
                                                    <button class="buoy-selector-btn active" data-value="CCR XXXXX">XXXXX</button>
                                                    <button class="buoy-selector-btn" data-value="CCR CORUÑA">CORUÑA</button>
                                                    <button class="buoy-selector-btn" data-value="CCR LAS PALMAS">LAS PALMAS</button>
                                                    <button class="buoy-selector-btn" data-value="CCR VALENCIA">VALENCIA</button>
                                                </div></div>
                                                <div><h4>Turno</h4><div class="buoy-selector-group" id="entrada-turno-selector">
                                                    <button class="buoy-selector-btn active" data-value="turno de XXXX">XXXX</button>
                                                    <button class="buoy-selector-btn" data-value="turno de MAÑANA">MAÑANA</button>
                                                    <button class="buoy-selector-btn" data-value="turno de TARDE">TARDE</button>
                                                    <button class="buoy-selector-btn" data-value="turno de NOCHE">NOCHE</button>
                                                </div></div>
                                            </div>
                                            <div class="template-card-body" id="template-text-entrada-guardia" style="border-top: 1px solid var(--border-color);"></div>
                                        </div>
                                    `;
                                }
                                if (item.title === 'Comprobación de equipos') {
                                     return `
                                        <div class="template-card" data-template-id="comprobacion-equipos">
                                            <div class="template-card-header">
                                                <h3 class="template-card-title">${item.title}</h3>
                                                ${copyBtnHtml}
                                            </div>
                                            <div class="reorg-controls" style="padding: 1rem 1.5rem 1rem; border-top: 1px solid var(--border-color);">
                                                <div><h4>Banda</h4><div class="buoy-selector-group" id="comprobacion-banda-selector">
                                                    <button class="buoy-selector-btn active" data-value="banda">...</button>
                                                    <button class="buoy-selector-btn" data-value="VHF">VHF</button>
                                                    <button class="buoy-selector-btn" data-value="MF/HF">MF/HF</button>
                                                </div></div>
                                                <div><h4>Resultado</h4><div class="buoy-selector-group" id="comprobacion-resultado-selector">
                                                    <button class="buoy-selector-btn active" data-value="">...</button>
                                                    <button class="buoy-selector-btn" data-value="OK">CHECK OK</button>
                                                    <button class="buoy-selector-btn" data-value="NOT OK">CHECK NOT OK</button>
                                                </div></div>
                                            </div>
                                            <div class="template-card-body" id="template-text-comprobacion-equipos" style="border-top: 1px solid var(--border-color);"></div>
                                        </div>
                                     `;
                                }
                                if (item.title === 'Documentación') {
                                    return `
                                        <div class="template-card" data-template-id="documentacion">
                                            <div class="template-card-header">
                                                <h3 class="template-card-title">${item.title}</h3>
                                                ${copyBtnHtml}
                                            </div>
                                            <div class="reorg-controls" style="padding: 1rem 1.5rem 1rem; border-top: 1px solid var(--border-color);">
                                                <div><h4>Turno</h4><div class="buoy-selector-group" id="documentacion-turno-selector">
                                                    <button class="buoy-selector-btn active" data-value="TURNO">...</button>
                                                    <button class="buoy-selector-btn" data-value="MAÑANA">MAÑANA</button>
                                                    <button class="buoy-selector-btn" data-value="TARDE">TARDE</button>
                                                    <button class="buoy-selector-btn" data-value="NOCHE">NOCHE</button>
                                                </div></div>
                                            </div>
                                            <div class="template-card-body" id="template-text-documentacion" style="border-top: 1px solid var(--border-color);"></div>
                                        </div>
                                    `;
                                }
                                if (item.title === 'Reorganización del Servicio') {
                                    return `
                                        <div class="template-card" data-template-id="reorganizacion">
                                            <div class="template-card-header">
                                                <h3 class="template-card-title">${item.title}</h3>
                                                ${copyBtnHtml}
                                            </div>
                                            <div class="template-card-body" style="padding-bottom: 0;">
                                                <p class="template-text-reorganizacion" style="margin-bottom: 1.5rem; min-height: 4.8em;"></p>
                                                <div class="reorg-controls" style="flex-direction: row; justify-content: flex-start; align-items: flex-end; gap: 2rem; flex-wrap: wrap;">
                                                    <div>
                                                        <h4 class="reorg-control-title">Turno</h4>
                                                        <div class="buoy-selector-group" id="reorg-turno-selector">
                                                            <button class="buoy-selector-btn" data-value="MAÑANA">MAÑANA</button>
                                                            <button class="buoy-selector-btn" data-value="TARDE">TARDE</button>
                                                            <button class="buoy-selector-btn" data-value="NOCHE">NOCHE</button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 class="reorg-control-title">CCR que asume</h4>
                                                        <div class="buoy-selector-group" id="reorg-ccr-selector">
                                                            <button class="buoy-selector-btn" data-value="CCR VALENCIA">CCR VALENCIA</button>
                                                            <button class="buoy-selector-btn" data-value="CCR LAS PALMAS">CCR LAS PALMAS</button>
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
                                            ${copyBtnHtml}
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

    const updateTemplateText = (templateId: string) => {
        const card = layout.querySelector(`[data-template-id="${templateId}"]`);
        if (!card) return;
        
        let textEl = card.querySelector('.template-card-body');
        let newText = '';

        switch(templateId) {
            case 'entrada-guardia': {
                const op = card.querySelector('#entrada-op-selector .active')?.getAttribute('data-value') || 'OWP-0X';
                const ccr = card.querySelector('#entrada-ccr-selector .active')?.getAttribute('data-value') || 'CCR XXXXX';
                const turno = card.querySelector('#entrada-turno-selector .active')?.getAttribute('data-value') || 'turno de XXXX';
                newText = `Entrada de guardia, como Back Office Technician, gestionando "${op}" en el "${ccr}", "${turno}".`;
                break;
            }
            case 'comprobacion-equipos': {
                const banda = card.querySelector('#comprobacion-banda-selector .active')?.getAttribute('data-value') || 'banda';
                const resultado = card.querySelector('#comprobacion-resultado-selector .active')?.getAttribute('data-value') || '';
                newText = `Realizada comprobación de equipos (${banda}), así como líneas telefónicas, DIVOS, Servicio Navtex, Grafana, AISWeb, NIMBUS y Service Desk. Resultado del check${resultado ? ' ' + resultado : ''}.`;
                break;
            }
            case 'documentacion': {
                const turno = card.querySelector('#documentacion-turno-selector .active')?.getAttribute('data-value') || 'TURNO';
                newText = `Documentación turno de "${turno}".`;
                break;
            }
            case 'reorganizacion': {
// FIX: Cast selected element to HTMLElement to access dataset property.
                const selectedCCR = (card.querySelector('#reorg-ccr-selector .active') as HTMLElement)?.dataset.value || '...';
// FIX: Cast selected element to HTMLElement to access dataset property.
                const selectedTurno = (card.querySelector('#reorg-turno-selector .active') as HTMLElement)?.dataset.value || '...';
                newText = `Por contingencias, se reorganiza el servicio en el CCR CORUÑA hacia el ${selectedCCR} en turno de ${selectedTurno}.`;
                textEl = card.querySelector('.template-text-reorganizacion'); // Special case for this card's text element
                break;
            }
        }
        if (textEl) textEl.textContent = newText;
    };

    layout.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;

        const tabBtn = target.closest('.sub-nav-btn');
        if (tabBtn) {
            const targetId = tabBtn.getAttribute('data-target');
            if(!targetId) return;
            layout.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
            layout.querySelectorAll('.sub-tab-panel').forEach(p => p.classList.remove('active'));
            tabBtn.classList.add('active');
            const panel = layout.querySelector<HTMLElement>(`#${targetId}`);
            if (panel) panel.classList.add('active');
        }
        
        const copyBtn = target.closest('.copy-btn');
        if (copyBtn instanceof HTMLButtonElement) {
            const card = copyBtn.closest('.template-card');
            const body = card?.querySelector('.template-card-body');
            if (body) {
                // For reorganizacion, the text is in a child p element
                const textP = body.querySelector('p');
                handleCopy(textP ? textP.textContent || '' : body.textContent || '');
            }
        }

        const selectorBtn = target.closest<HTMLButtonElement>('.buoy-selector-btn');
        if (selectorBtn) {
            const card = selectorBtn.closest('.template-card');
            if (card) {
                const group = selectorBtn.parentElement;
                if (group) {
                    group.querySelectorAll('.buoy-selector-btn').forEach(btn => btn.classList.remove('active'));
                    selectorBtn.classList.add('active');
                    const templateId = card.getAttribute('data-template-id');
                    if (templateId) updateTemplateText(templateId);
                }
            }
        }
    });

    updateTemplateText('entrada-guardia');
    updateTemplateText('comprobacion-equipos');
    updateTemplateText('documentacion');
    updateTemplateText('reorganizacion');
}
