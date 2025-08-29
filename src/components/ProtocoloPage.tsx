export function renderProtocolo(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Asistente de Protocolo GMDSS</h2>
            <div id="gmdss-wizard">
                <div class="wizard-step active" data-step="start">
                    <h3 class="wizard-question">Inicio: Alerta o llamada de socorro recibida (HF, MF, VHF)</h3>
                    <p>Este asistente le guiará a través del procedimiento estándar para gestionar una alerta de socorro.</p>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="step1">Comenzar Procedimiento</button>
                    </div>
                </div>

                <div class="wizard-step" data-step="step1">
                    <h3 class="wizard-question">1. ¿La alerta es VÁLIDA?</h3>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="step2">Sí, es Válida</button>
                        <button class="wizard-btn" data-next="result-invalid">No, es Inválida</button>
                    </div>
                </div>

                <div class="wizard-step" data-step="step2">
                    <h3 class="wizard-question">2. ¿La alerta VÁLIDA contiene POSICIÓN?</h3>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="step3">Sí, tiene Posición</button>
                        <button class="wizard-btn" data-next="step4">No, sin Posición</button>
                    </div>
                </div>

                <div class="wizard-step" data-step="step3">
                    <h3 class="wizard-question">3. ¿La alerta con POSICIÓN está dentro de la ZONA SAR?</h3>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="result-pos-in-sar">Sí, en Zona SAR (VHF/MF/HF)</button>
                        <button class="wizard-btn" data-next="step3a">No, fuera de Zona SAR</button>
                    </div>
                </div>
                
                <div class="wizard-step" data-step="step3a">
                    <h3 class="wizard-question">3a. ¿La alerta (fuera de Zona SAR) se recibió por VHF?</h3>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="result-pos-out-sar-vhf">Sí, por VHF</button>
                        <button class="wizard-btn" data-next="result-pos-out-sar-mfhf">No, por MF/HF</button>
                    </div>
                </div>

                <div class="wizard-step" data-step="step4">
                    <h3 class="wizard-question">4. ¿La alerta SIN POSICIÓN se recibió por VHF?</h3>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="result-no-pos-vhf">Sí, por VHF</button>
                        <button class="wizard-btn" data-next="result-no-pos-mfhf">No, por MF/HF</button>
                    </div>
                </div>

                <!-- RESULTADOS -->
                <div class="wizard-step" data-step="result-invalid"><div class="procedure-box"><h3>Procedimiento para Alerta NO VÁLIDA (9.1.4)</h3><ol><li>CCR SÓLO ACUSE DE RECIBO (ACK) SI ESTÁ EN ZONA SAR.</li><li>CCR A LA ESCUCHA, INTENTA CONSEGUIR MÁS INFORMACIÓN.</li><li>SI SE CONFIRMA LA ALERTA, SE PASA AL CASO CORRESPONBIENTE DE ALERTA VÁLIDA.</li></ol></div></div>
                <div class="wizard-step" data-step="result-pos-in-sar"><div class="procedure-box"><h3>Procedimiento: Válida, con Posición, en Zona SAR (VHF/MF/HF)</h3><ol><li>CCR ACUSE DE RECIBO (ACK).</li><li>VERIFICA POSICIÓN (En puerto no retransmite alerta).</li><li>CCR RETRANSMITE ALERTA.</li><li>CCR A LA ESCUCHA. ESPERA INSTRUCCIONES DEL CCS COORDINADOR.</li><li><b>OCEANO:</b> SAR AUTOMÁTICO CCR E CNCS -> SÓLO VHF.</li></ol></div></div>
                <div class="wizard-step" data-step="result-pos-out-sar-vhf"><div class="procedure-box"><h3>Procedimiento: Válida, con Posición, fuera de Zona SAR (VHF)</h3><ol><li>CCR NO ACUSE DE RECIBO (NO ACK).</li><li>CCR A LA ESCUCHA A LA ESPERA DE INSTRUCCIONES DEL CNCS.</li><li><b>OCEANO:</b> SAR AUTOMÁTICO CCR E CNCS -> Sin texto de mensaje.</li></ol></div></div>
                <div class="wizard-step" data-step="result-pos-out-sar-mfhf"><div class="procedure-box"><h3>Procedimiento: Válida, con Posición, fuera de Zona SAR (MF/HF)</h3><ol><li>CCR NO ACUSE DE RECIBO (NO ACK).</li><li>CCR A LA ESCUCHA A LA ESPERA DE INSTRUCCIONES DEL CNCS.</li></ol></div></div>
                <div class="wizard-step" data-step="result-no-pos-vhf"><div class="procedure-box"><h3>Procedimiento: Válida, sin Posición (VHF) (9.1.2)</h3><ol><li>CCR ACUSE DE RECIBO (ACK).</li><li>CCR INTENTA CONSEGUIR POSICIÓN (En puerto no retransmite alerta).</li><li>CCR RETRANSMITE ALERTA.</li><li>CCR A LA ESCUCHA. ESPERA INSTRUCCIONES DEL CCS COORDINADOR.</li></ol></div></div>
                <div class="wizard-step" data-step="result-no-pos-mfhf"><div class="procedure-box"><h3>Procedimiento: Válida, sin Posición (MF/HF) (9.1.3)</h3><ol><li>CCR NO ACUSE DE RECIBO (NO ACK).</li><li>CCR A LA ESCUCHA. Y A LA ESPERA DE INSTRUCCIONES.</li></ol></div></div>

                <div class="wizard-controls">
                    <button class="wizard-restart-btn">Reiniciar Procedimiento</button>
                </div>
            </div>
        </div>
    `;
    initializeGmdssWizard();
}

function initializeGmdssWizard() {
    const wizard = document.getElementById('gmdss-wizard');
    if (!wizard) return;

    const restartBtn = wizard.querySelector<HTMLButtonElement>('.wizard-restart-btn');
    const controlsContainer = wizard.querySelector<HTMLElement>('.wizard-controls');

    wizard.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const btn = target.closest<HTMLButtonElement>('.wizard-btn');

        if (btn) {
            const nextStepId = btn.dataset.next;
            if (nextStepId) {
                const currentStep = btn.closest('.wizard-step');
                const nextStep = wizard.querySelector<HTMLElement>(`[data-step="${nextStepId}"]`);

                if (currentStep) currentStep.classList.remove('active');
                if (nextStep) {
                     nextStep.classList.add('active');
                     if (nextStep.querySelector('.procedure-box') && controlsContainer) {
                        controlsContainer.style.display = 'block';
                    }
                }
            }
        }
    });

    if (restartBtn && controlsContainer) {
        restartBtn.addEventListener('click', () => {
            wizard.querySelectorAll<HTMLElement>('.wizard-step').forEach(step => {
                step.classList.remove('active');
            });
            const firstStep = wizard.querySelector<HTMLElement>('[data-step="start"]');
            if (firstStep) {
                firstStep.classList.add('active');
            }
            controlsContainer.style.display = 'none';
        });
    }
}
