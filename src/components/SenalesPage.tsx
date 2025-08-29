import { IALA_BUOY_DATA } from "../data";
import { initializeInfoTabs } from "../utils/helpers";
import { initializeLighthouseSimulator, initializeBuoySimulator } from "../utils/simulation";

export function renderMaritimeSignalsSimulator(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Simulador de Señales Marítimas</h2>
            <div class="info-nav-tabs">
                <button class="info-nav-btn active" data-target="simulator-tab-lighthouse">Faros</button>
                <button class="info-nav-btn" data-target="simulator-tab-buoy">Boyas y Marcas</button>
            </div>
            
            <div id="simulator-tab-lighthouse" class="sub-tab-panel active">
                <div class="simulator-display">
                    <form id="lighthouse-simulator-form" class="simulator-form" aria-label="Simulador de faros">
                        <input type="text" id="lighthouse-char-input" class="simulator-input" placeholder="Ej: Gp Oc(2+1) W 15s" required aria-label="Característica de la luz">
                        <button type="submit" class="simulator-btn">Simular</button>
                    </form>
                    <div class="lighthouse-schematic" aria-hidden="true">
                        <div class="lighthouse-tower"></div>
                        <div class="lighthouse-top">
                            <div id="lighthouse-light" class="lighthouse-light"></div>
                        </div>
                    </div>
                    <div id="lighthouse-simulation-info" class="simulation-info" aria-live="polite">
                        <p>Introduzca la característica de una luz y pulse "Simular".</p>
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
