import { IALA_BUOY_DATA, LIGHT_CHARACTERISTIC_TERMS } from "../data";
import { initializeInfoTabs } from "../utils/helpers";
import { initializeLighthouseSimulator, initializeBuoySimulator } from "../utils/simulation";

export function renderMaritimeSignalsSimulator(container: HTMLElement) {
    // Filter out complex or less common rhythms for a cleaner UI
    const commonRhythms = ['F', 'FL', 'LFL', 'OC', 'ISO', 'Q', 'VQ', 'MO'];
    const commonColors = ['W', 'R', 'G', 'Y', 'BU'];

    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Simulador de Señales Marítimas</h2>
            <div class="info-nav-tabs">
                <button class="info-nav-btn active" data-target="simulator-tab-lighthouse">Faros</button>
                <button class="info-nav-btn" data-target="simulator-tab-buoy">Boyas y Marcas</button>
            </div>
            
            <div id="simulator-tab-lighthouse" class="sub-tab-panel active">
                <div class="simulator-display">
                    <div id="lighthouse-controls-form" class="lighthouse-controls-form">
                        <div class="control-group">
                            <label>Ritmo / Rhythm</label>
                            <div id="lighthouse-rhythm-selector" class="buoy-selector-group">
                                ${commonRhythms.map(r => `<button class="buoy-selector-btn ${r === 'FL' ? 'active' : ''}" data-rhythm="${r}" title="${LIGHT_CHARACTERISTIC_TERMS[r]?.es || r}">${r}</button>`).join('')}
                            </div>
                        </div>
                        <div class="control-group" id="lighthouse-group-container">
                            <label for="lighthouse-group-input">Grupo / Group</label>
                            <input type="text" id="lighthouse-group-input" class="simulator-input" value="1" placeholder="(2+1)">
                        </div>
                        <div class="control-group">
                            <label>Color</label>
                            <div id="lighthouse-color-selector" class="buoy-selector-group">
                                ${commonColors.map(c => `<button class="buoy-selector-btn ${c === 'W' ? 'active' : ''}" data-color="${c}" title="${LIGHT_CHARACTERISTIC_TERMS[c]?.es}">${c}</button>`).join('')}
                            </div>
                        </div>
                         <div class="control-group">
                            <label for="lighthouse-period-input">Período / Period (s)</label>
                            <input type="number" id="lighthouse-period-input" class="simulator-input" value="10" min="1" max="60">
                        </div>
                    </div>

                    <div class="lighthouse-schematic" aria-hidden="true">
                        <div class="lighthouse-tower"></div>
                        <div class="lighthouse-top">
                            <div id="lighthouse-light" class="lighthouse-light"></div>
                        </div>
                    </div>
                    <div id="lighthouse-simulation-info" class="simulation-info" aria-live="polite">
                        <p>Ajuste los parámetros para iniciar la simulación.</p>
                    </div>
                </div>
            </div>

            <div id="simulator-tab-buoy" class="sub-tab-panel">
                 <div id="buoy-simulator-controls">
                    <div id="buoy-region-selector" style="display: none;">
                        <span>Región</span>
                        <input type="checkbox" id="buoy-region-input">
                        <label for="buoy-region-input" class="buoy-region-toggle"></label>
                    </div>
                    <div id="buoy-category-selector" class="buoy-selector-group"></div>
                    <div id="buoy-type-selector" class="buoy-selector-group"></div>
                </div>
                <div class="simulator-display">
                    <div class="buoy-visuals-container">
                        <div id="buoy-schematic-container"></div>
                        <div id="buoy-light-container">
                            <div id="buoy-light" class="buoy-light-el"></div>
                            <p>Luz / Light</p>
                        </div>
                    </div>
                    <div id="buoy-info-panel" class="simulation-info" aria-live="polite">
                        <p>Seleccione un tipo de señal para comenzar la simulación.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    initializeInfoTabs(container); // Re-use the tab switching logic
    initializeLighthouseSimulator();
    initializeBuoySimulator(IALA_BUOY_DATA);
}