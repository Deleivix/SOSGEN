
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
                                const copyBtnHtml = `<button class="copy-btn" aria-label="Copiar ${item.title}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/></svg><span>Copiar</span></button>`;

                                if (item.title === 'Entrada de guardia') {
                                    return `
                                        <div class="template-card" data-template-id="entrada-guardia">
                                            <div class="template-card-header">
                                                <h3 class="template-card-title">${item.title}</h3>
                                                ${copyBtnHtml}
                                            </div>
                                            <div class="reorg-controls" style="padding: 1rem 1.5rem 1rem; border-top: 1px solid var(--border-color);">
                                                <div><h4>OP</h4><div class="buoy-selector-group" id="entrada-op-selector">
                                                    <button class="buoy-selector-btn active" data-value="OWP-01">OWP-01</button>
                                                    <button class="buoy-selector-btn" data-value="OWP-02">OWP-02</button>
                                                    <button class="buoy-selector-btn" data-value="OWP-03">OWP-03</button>
                                                    <button class="buoy-selector-btn" data-value="OWP-04">OWP-04</button>
                                                </div></div>
                                                <div><h4>CCR</h4><div class="buoy-selector-group" id="entrada-ccr-selector">
                                                    <button class="buoy-selector-btn active" data-value="CCR CORUÑA">CORUÑA</button>
                                                    <button class="buoy-selector-btn" data-value="CCR LAS PALMAS">LAS PALMAS</button>
                                                    <button class="buoy-selector-btn" data-value="CCR VALENCIA">VALENCIA</button>
                                                </div></div>
                                                <div><h4>Turno</h4><div class="buoy-selector-group" id="entrada-turno-selector">
                                                    <button class="buoy-selector-btn active" data-value="turno de MAÑANA">MAÑANA</button>
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
                                                <div><h4>Resultado</h4><div class="buoy-selector-group" id="comprobacion-resultado-selector">
                                                    <button class="buoy-selector-btn active" data-value="OK">CHECK OK</button>
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
                                                    <button class="buoy-selector-btn active" data-value="MAÑANA">MAÑANA</button>
                                                    <button class="buoy-selector-btn" data-value="TARDE">TARDE</button>
                                                    <button class="buoy-selector-btn" data-value="NOCHE">NOCHE</button>
                                                </div></div>
                                            </div>
                                            <div class="template-card-body" id="template-text-documentacion" style="border-top: 1px solid var(--border-color);"></div>
                                        </div>
                                    `;
                                }
                                if (item.title === 'Formato Radiocheck') {
                                    return `
                                        <div class="template-card" data-template-id="radiocheck">
                                            <div class="template-card-header">
                                                <h3 class="template-card-title">${item.title}</h3>
                                                ${copyBtnHtml}
                                            </div>
                                            <div class="reorg-controls" style="padding: 1rem 1.5rem 1rem; border-top: 1px solid var(--border-color);">
                                                <div style="margin-bottom: 1rem;">
                                                    <h4>Posición</h4>
                                                    <div class="buoy-selector-group" id="radiocheck-pos-selector">
                                                        <button class="buoy-selector-btn active" data-value="Puerto de Vigo">Puerto de Vigo</button>
                                                        <button class="buoy-selector-btn" data-value="Puerto de Bilbao">Puerto de Bilbao</button>
                                                        <button class="buoy-selector-btn" data-value="Puerto de A Coruña">Puerto de A Coruña</button>
                                                        <button class="buoy-selector-btn" data-value="Otro">Otro</button>
                                                    </div>
                                                </div>
                                                <div style="margin-bottom: 1rem;">
                                                    <h4>Vía de contacto</h4>
                                                    <div class="buoy-selector-group" id="radiocheck-via-selector">
                                                        <button class="buoy-selector-btn active" data-value="Vigo radio VHF canal 64">Vigo VHF 64</button>
                                                        <button class="buoy-selector-btn" data-value="Finisterre radio MF canal 262">Finisterre MF 262</button>
                                                        <button class="buoy-selector-btn" data-value="OTRO">OTRO</button>
                                                    </div>
                                                </div>
                                                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                                                    <div>
                                                        <h4>Resultado TX</h4>
                                                        <div class="buoy-selector-group" id="radiocheck-tx-selector">
                                                            <button class="buoy-selector-btn" data-value="1/5">1/5</button>
                                                            <button class="buoy-selector-btn" data-value="2/5">2/5</button>
                                                            <button class="buoy-selector-btn" data-value="3/5">3/5</button>
                                                            <button class="buoy-selector-btn" data-value="4/5">4/5</button>
                                                            <button class="buoy-selector-btn active" data-value="5/5">5/5</button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4>Resultado RX</h4>
                                                        <div class="buoy-selector-group" id="radiocheck-rx-selector">
                                                            <button class="buoy-selector-btn" data-value="1/5">1/5</button>
                                                            <button class="buoy-selector-btn" data-value="2/5">2/5</button>
                                                            <button class="buoy-selector-btn" data-value="3/5">3/5</button>
                                                            <button class="buoy-selector-btn" data-value="4/5">4/5</button>
                                                            <button class="buoy-selector-btn active" data-value="5/5">5/5</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="template-card-body" id="template-text-radiocheck" style="border-top: 1px solid var(--border-color);"></div>
                                        </div>
                                    `;
                                }
                                if (item.title === 'Generador de Registro de Transmisión') {
                                    return `
                                        <div class="template-card" data-template-id="transmision-generator">
                                            <div class="template-card-header">
                                                <h3 class="template-card-title">${item.title}</h3>
                                                ${copyBtnHtml}
                                            </div>
                                            <div class="reorg-controls" style="padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1.5rem;">
                                                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                                                    <div>
                                                        <h4>Producto</h4>
                                                        <div class="buoy-selector-group" id="transmision-producto-selector">
                                                            <button class="buoy-selector-btn active" data-value="NR">NR</button>
                                                            <button class="buoy-selector-btn" data-value="WX">WX</button>
                                                            <button class="buoy-selector-btn" data-value="AT">AT</button>
                                                        </div>
                                                    </div>
                                                    <div id="transmision-categoria-container">
                                                        <h4>Categoría</h4>
                                                        <div class="buoy-selector-group" id="transmision-categoria-selector">
                                                            <button class="buoy-selector-btn active" data-value="Programado">Programado</button>
                                                            <button class="buoy-selector-btn" data-value="Eventual">Eventual</button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4>Zona</h4>
                                                        <div class="buoy-selector-group" id="transmision-zona-selector">
                                                            <button class="buoy-selector-btn active" data-value="Costera">Costera</button>
                                                            <button class="buoy-selector-btn" data-value="Alta Mar">Alta Mar</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="template-card-body" id="template-text-transmision-generator" style="border-top: 1px solid var(--border-color);"></div>
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
                const op = card.querySelector('#entrada-op-selector .active')?.getAttribute('data-value') || 'OWP-01';
                const ccr = card.querySelector('#entrada-ccr-selector .active')?.getAttribute('data-value') || 'CCR CORUÑA';
                const turno = card.querySelector('#entrada-turno-selector .active')?.getAttribute('data-value') || 'turno de MAÑANA';
                newText = `Entrada de guardia, como Back Office Technician, gestionando ${op} en el ${ccr}, ${turno}.`;
                break;
            }
            case 'comprobacion-equipos': {
                const resultado = card.querySelector('#comprobacion-resultado-selector .active')?.getAttribute('data-value') || 'OK';
                newText = `• Realizada comprobación de equipos: Chequear que las líneas telefónicas funcionan y la integración con la plataforma.
• Realizar búsqueda y escuchar audio de la emisión programada del parte meteorológico del turno anterior en DIVOS.
• T&T Frequentis: Comprobación visual de todas las pestañas del T&T (CMB, INBOX, DSC, etc.) en plataforma FRQ.
• Message Center (MC) Frequentis: Revisar alarmística en plataforma FRQ.
• Comprobación visual de equipos radio VHF, MF y HF y NAVTEX.

Resultado del check ${resultado}.`;
                break;
            }
            case 'documentacion': {
                const turno = card.querySelector('#documentacion-turno-selector .active')?.getAttribute('data-value') || 'MAÑANA';
                newText = `Documentación turno de ${turno}.`;
                break;
            }
            case 'radiocheck': {
                let pos = card.querySelector('#radiocheck-pos-selector .active')?.getAttribute('data-value') || 'Puerto de Vigo';
                let via = card.querySelector('#radiocheck-via-selector .active')?.getAttribute('data-value') || 'Vigo radio VHF canal 64';
                const tx = card.querySelector('#radiocheck-tx-selector .active')?.getAttribute('data-value') || '5/5';
                const rx = card.querySelector('#radiocheck-rx-selector .active')?.getAttribute('data-value') || '5/5';
                
                if (pos === 'Otro') pos = '______';
                if (via === 'OTRO') via = '______';

                newText = `Embarcación: Nombre/Callsign\nPosición: ${pos}\nVía de contacto: ${via}\nResultado TX: ${tx}\nResultado RX: ${rx}`;
                break;
            }
             case 'transmision-generator': {
// FIX: Cast querySelector result to HTMLElement to access dataset property
                const producto = (card.querySelector('#transmision-producto-selector .active') as HTMLElement)?.dataset.value || 'NR';
// FIX: Cast querySelector result to HTMLElement to access dataset property
                const categoria = (card.querySelector('#transmision-categoria-selector .active') as HTMLElement)?.dataset.value || 'Programado';
// FIX: Cast querySelector result to HTMLElement to access dataset property
                const zona = (card.querySelector('#transmision-zona-selector .active') as HTMLElement)?.dataset.value || 'Costera';

                const categoriaContainer = card.querySelector<HTMLElement>('#transmision-categoria-container');
                if (categoriaContainer) {
                    categoriaContainer.style.display = producto === 'AT' ? 'none' : 'block';
                }

                if (producto === 'NR') {
                    if (categoria === 'Programado') {
                        const anuncio = zona === 'Costera' ? 'canal 16' : '2.182kHz';
                        newText = `Realizada transmisión programada de Radioavisos en vigor, vía estaciones costeras correspondientes, previo anuncio en ${anuncio}.`;
                    } else { // Eventual
                        const via = zona === 'Costera' ? 'canales de trabajo' : 'frecuencias de trabajo';
                        const dsc = zona === 'Costera' ? 'canal 70' : '2.187,5kHz';
                        const anuncio = zona === 'Costera' ? 'canal 16' : '2.182kHz';
                        newText = `Realizada transmisión eventual del Radiaviso XXXX/XXXX, vía ${via} de las Estaciones Costeras correspondientes, previa llamada selectiva digital (${dsc}), y anuncio en (${anuncio}).`;
                    }
                } else if (producto === 'WX') {
                    if (categoria === 'Programado') {
                        const para = zona === 'Costera' ? 'para Aguas Costeras' : 'para Alta Mar';
                        const via = zona === 'Costera' ? 'canales de trabajo' : 'frecuencias de trabajo';
                        const anuncio = zona === 'Costera' ? 'canal 16' : '2.182kHz';
                        newText = `Realizada transmisión programada de Información Meteorológica y Marina ${para}, vía ${via} de las Estaciones Costeras correspondientes, previo aviso en ${anuncio}.`;
                    } else { // Eventual
                        const via = zona === 'Costera' ? 'canales' : 'frecuencias';
                        newText = `Realizada transmisión eventual de Información Meteorológica y Marina, solicitada por el buque/embarcación Nombre/CallSign, vía ${via} de trabajo de la/s Estación/es Costera/s de Añadir EECC.`;
                    }
                } else if (producto === 'AT') {
                    if (zona === 'Costera') {
                        newText = `Realizada transmisión de Boletín de Fenómenos Adversos de Nivel ROJO/NARANJA, en vigor, vía canales de trabajo de las Estaciones Costeras correspondientes, previa llamada selectiva digital (canal 70), y anuncio en canal 16.`;
                    } else { // Alta Mar
                        newText = `Realizada transmisión de Aviso de Temporal, vía frecuencias de trabajo de las Estaciones Costeras correspondientes, previa llamada selectiva digital (2.187,5kHz), y anuncio en 2.182kHz.`;
                    }
                }
                break;
            }
            case 'reorganizacion': {
                const selectedCCR = (card.querySelector('#reorg-ccr-selector .active') as HTMLElement)?.dataset.value || '...';
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
    updateTemplateText('radiocheck');
    updateTemplateText('transmision-generator');
    updateTemplateText('reorganizacion');
}
